import { getBooking } from '../booking/bookings'
import type { Booking } from '../booking/types'
import { getProfessionalService } from '../booking/services'
import { calculateDeposit } from './deposit'
import {
  assertAmountMinor,
  DEFAULT_CURRENCY,
  normalizeCurrency,
  toMinorUnits,
} from './money'
import { getPaymentProvider } from './providerRegistry'
import { calculatePaymentRouting, planRefundRouting } from './routing'
import {
  createPaymentId,
  loadPayments,
  savePayments,
  upsertPayment,
} from './storage'
import {
  canTransitionPaymentStatus,
  isPaymentEligibleForRefund,
} from './stateMachine'
import type {
  BookingPaymentSummary,
  CreatePaymentIntentInput,
  Payment,
  PaymentResult,
  PaymentType,
} from './types'
import type { RefundRoutingPlan } from './connectTypes'

export function listPaymentsForBooking(bookingId: string): Payment[] {
  return loadPayments()
    .filter((p) => p.bookingId === bookingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function getPayment(paymentId: string): Payment | null {
  return loadPayments().find((p) => p.id === paymentId) ?? null
}

/**
 * Derive booking payment summary from Payment records (source of truth).
 * DEMO payments never count as real `paid`.
 */
export function deriveBookingPaymentSummary(payments: Payment[]): BookingPaymentSummary {
  if (!payments.length) return 'unpaid'

  const real = payments.filter((p) => !p.isDemoPayment && p.purpose === 'BOOKING_PAYMENT')
  const demos = payments.filter((p) => p.isDemoPayment && p.purpose === 'BOOKING_PAYMENT')

  // Prefer real payments when present; otherwise interpret DEMO carefully.
  const active = real.length > 0 ? real : demos
  const isDemoOnly = real.length === 0 && demos.length > 0

  const refunds = active.filter((p) => p.paymentType === 'refund')
  const charges = active.filter((p) => p.paymentType !== 'refund')

  if (refunds.some((p) => p.status === 'pending')) return 'refund_pending'

  const allRefunded =
    charges.length > 0 &&
    charges.every((p) => p.status === 'refunded') &&
    refunds.some((p) => p.status === 'paid' || p.status === 'pending' || p.status === 'refunded')
  if (allRefunded && !isDemoOnly) return 'refunded'
  // DEMO refunds stay refund_pending / unpaid — never claim refunded as real trust.

  const paidCharges = charges.filter((p) => p.status === 'paid' || p.status === 'authorized')
  if (paidCharges.length > 0 && !isDemoOnly) {
    const hasDeposit = paidCharges.some((p) => p.paymentType === 'deposit')
    const hasFull = paidCharges.some((p) => p.paymentType === 'full')
    if (hasFull || (hasDeposit && paidCharges.length > 1)) {
      // Heuristic: full paid, or deposit + another paid charge
      if (hasFull || paidCharges.some((p) => p.paymentType !== 'deposit')) {
        const totalPaid = paidCharges.reduce((s, p) => s + p.amountMinor, 0)
        const totalRefunded = refunds
          .filter((p) => p.status === 'paid' || p.status === 'refunded')
          .reduce((s, p) => s + p.amountMinor, 0)
        if (totalRefunded > 0 && totalRefunded < totalPaid) return 'partially_paid'
        if (totalRefunded >= totalPaid && totalPaid > 0) return 'refunded'
        return hasFull || !hasDeposit ? 'paid' : 'partially_paid'
      }
      return 'partially_paid'
    }
    if (hasDeposit) return 'partially_paid'
    return 'paid'
  }

  // DEMO / unpaid path — never report `paid`
  const pendingDeposit = charges.some(
    (p) => p.paymentType === 'deposit' && p.status === 'pending',
  )
  if (pendingDeposit) return 'deposit_pending'

  const pendingAny = charges.some((p) => p.status === 'pending')
  if (pendingAny) return isDemoOnly && charges.some((p) => p.paymentType === 'deposit')
    ? 'deposit_pending'
    : 'unpaid'

  return 'unpaid'
}

export function createPaymentRecord(input: CreatePaymentIntentInput): PaymentResult<Payment> {
  if (!input.bookingId || !input.ownerAccountId || !input.professionalId) {
    return { ok: false, error: 'invalid_input', message: 'Chybí vazba na rezervaci.' }
  }
  if (!assertAmountMinor(input.amountMinor)) {
    return { ok: false, error: 'invalid_input', message: 'amountMinor musí být nezáporné celé číslo.' }
  }

  const currency = normalizeCurrency(
    input.currency ?? input.currencySnapshot ?? DEFAULT_CURRENCY,
  )
  const routing =
    input.platformFeeMinor !== undefined && input.professionalAmountMinor !== undefined
      ? {
          amountMinor: input.amountMinor,
          platformFeeMinor: input.platformFeeMinor,
          professionalAmountMinor: input.professionalAmountMinor,
          chargePattern:
            input.chargePattern ??
            calculatePaymentRouting(input.amountMinor, { currency }).chargePattern,
          currency,
        }
      : calculatePaymentRouting(input.amountMinor, {
          currency,
          chargePattern: input.chargePattern,
        })

  const now = new Date().toISOString()
  const payment: Payment = {
    id: createPaymentId('pay'),
    bookingId: input.bookingId,
    ownerAccountId: input.ownerAccountId,
    professionalId: input.professionalId,
    amountMinor: routing.amountMinor,
    currency: routing.currency,
    paymentType: input.paymentType,
    status: 'pending',
    purpose: 'BOOKING_PAYMENT',
    isDemoPayment: input.isDemoPayment !== false,
    platformFeeMinor: routing.platformFeeMinor,
    professionalAmountMinor: routing.professionalAmountMinor,
    chargePattern: routing.chargePattern,
    createdAt: now,
    updatedAt: now,
  }
  if (input.isDemoPayment !== false) {
    payment.provider = 'demo'
  }
  if (input.serviceNameSnapshot) payment.serviceNameSnapshot = input.serviceNameSnapshot
  if (input.priceSnapshotMajor !== undefined && input.priceSnapshotMajor >= 0) {
    payment.priceSnapshotMajor = input.priceSnapshotMajor
  }
  if (input.currencySnapshot) {
    payment.currencySnapshot = normalizeCurrency(input.currencySnapshot)
  }

  return { ok: true, value: upsertPayment(payment) }
}

/**
 * Prepare a payment intent from an existing booking + its price snapshot.
 * Never reads live ProfessionalService.price.
 * Does not change Booking status.
 */
export function preparePaymentIntent(
  booking: Booking,
  opts?: { paymentType?: PaymentType; amountMinor?: number },
): PaymentResult<Payment> {
  const currency = normalizeCurrency(
    booking.currencySnapshot ?? booking.currency ?? DEFAULT_CURRENCY,
  )
  const priceMajor = booking.priceSnapshot ?? booking.price
  const paymentType = opts?.paymentType ?? 'full'

  let amountMinor = opts?.amountMinor
  if (amountMinor === undefined) {
    if (priceMajor === undefined || priceMajor < 0) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'Rezervace nemá cenu pro platební záměr.',
      }
    }
    if (paymentType === 'deposit') {
      const service = getProfessionalService(booking.serviceId)
      const deposit = calculateDeposit({
        priceMajor,
        currency,
        requiresDeposit: service?.requiresDeposit ?? true,
        depositType: service?.depositType,
        depositValue: service?.depositValue,
      })
      if (!deposit) {
        return {
          ok: false,
          error: 'invalid_input',
          message: 'Nelze spočítat zálohu ze snapshotu.',
        }
      }
      amountMinor = deposit.amountMinor
    } else {
      amountMinor = toMinorUnits(priceMajor, currency)
    }
  }

  return createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: booking.ownerAccountId,
    professionalId: booking.professionalId,
    amountMinor,
    currency,
    paymentType,
    serviceNameSnapshot: booking.serviceNameSnapshot ?? booking.serviceName,
    priceSnapshotMajor: priceMajor,
    currencySnapshot: currency,
    isDemoPayment: true,
  })
}

/**
 * After booking create: create DEMO pending intent when service asks for deposit/full_prepay.
 * pay_on_site → no Payment record.
 */
export function preparePaymentIntentForBooking(bookingId: string): PaymentResult<Payment> | null {
  const booking = getBooking(bookingId)
  if (!booking) {
    return { ok: false, error: 'booking_not_found', message: 'Rezervace nenalezena.' }
  }
  const service = getProfessionalService(booking.serviceId)
  const collection = service?.paymentCollection ?? 'pay_on_site'
  if (collection === 'pay_on_site') return null

  if (collection === 'deposit') {
    return preparePaymentIntent(booking, { paymentType: 'deposit' })
  }
  return preparePaymentIntent(booking, { paymentType: 'full' })
}

/**
 * Create a refund Payment linked to an original — does not delete the original.
 * DEMO: status stays pending; provider does not charge/refund money.
 */
export function createRefund(
  paymentId: string,
  amountMinor?: number,
  opts?: { currency?: string },
): PaymentResult<Payment> {
  const original = getPayment(paymentId)
  if (!original) {
    return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
  }
  if (original.paymentType === 'refund') {
    return { ok: false, error: 'invalid_input', message: 'Nelze refundovat refund.' }
  }
  if (!getBooking(original.bookingId)) {
    return { ok: false, error: 'booking_not_found', message: 'Rezervace k platbě neexistuje.' }
  }

  // Eligibility: DEMO may prepare refund records from pending for architecture tests;
  // live path requires paid/partially_refunded/authorized.
  const demoPrepare = original.isDemoPayment && original.status === 'pending'
  if (!demoPrepare && !isPaymentEligibleForRefund(original.status)) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'Platba není způsobilá k refundaci.',
    }
  }

  const alreadyRefunded = listPaymentsForBooking(original.bookingId)
    .filter(
      (p) =>
        p.paymentType === 'refund' &&
        p.refundOfPaymentId === original.id &&
        p.status !== 'cancelled' &&
        p.status !== 'failed',
    )
    .reduce((s, p) => s + p.amountMinor, 0)
  const refundable = original.amountMinor - alreadyRefunded
  if (refundable <= 0) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'Není zbývající částka k refundaci.',
    }
  }

  const refundAmount =
    amountMinor !== undefined ? amountMinor : refundable
  if (!assertAmountMinor(refundAmount) || refundAmount <= 0) {
    return { ok: false, error: 'invalid_input', message: 'Neplatná částka refundu.' }
  }
  if (refundAmount > refundable) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'Refund nesmí převýšit refundovatelnou částku.',
    }
  }

  if (opts?.currency !== undefined) {
    const claimed = normalizeCurrency(opts.currency)
    const snap = normalizeCurrency(original.currencySnapshot ?? original.currency)
    if (claimed !== snap) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'Měna refundu se neshoduje s platbou.',
      }
    }
  }

  // Extension: call provider.refundPayment — Demo returns demo_only without mutating to paid.
  void getPaymentProvider().refundPayment(paymentId, refundAmount)

  // Future Stripe: reverse platform fee + professional transfer (no live call yet).
  const refundPlan = planRefundForPayment(original, refundAmount)

  const now = new Date().toISOString()
  const refund: Payment = {
    id: createPaymentId('pay'),
    bookingId: original.bookingId,
    ownerAccountId: original.ownerAccountId,
    professionalId: original.professionalId,
    amountMinor: refundAmount,
    currency: original.currency,
    paymentType: 'refund',
    status: 'pending',
    purpose: 'BOOKING_PAYMENT',
    provider: 'demo',
    isDemoPayment: true,
    refundOfPaymentId: original.id,
    serviceNameSnapshot: original.serviceNameSnapshot,
    priceSnapshotMajor: original.priceSnapshotMajor,
    currencySnapshot: original.currencySnapshot,
    platformFeeMinor: refundPlan.reversePlatformFeeMinor,
    professionalAmountMinor: refundPlan.reverseProfessionalTransferMinor,
    chargePattern: original.chargePattern,
    createdAt: now,
    updatedAt: now,
  }
  // Original Payment is never deleted — only optionally marked partially_refunded when live.
  if (
    !original.isDemoPayment &&
    canTransitionPaymentStatus(original.status, 'partially_refunded') &&
    refundAmount < original.amountMinor
  ) {
    void updatePaymentStatus(original.id, 'partially_refunded')
  }
  return { ok: true, value: upsertPayment(refund) }
}

/**
 * Plan refund reverse amounts for a payment (customer / fee / professional).
 * Does not call Stripe.
 */
export function planRefundForPayment(
  original: Payment,
  refundCustomerMinor?: number,
): RefundRoutingPlan {
  const amount = refundCustomerMinor ?? original.amountMinor
  const platformFeeMinor = original.platformFeeMinor ?? 0
  const professionalAmountMinor =
    original.professionalAmountMinor ?? original.amountMinor - platformFeeMinor
  return planRefundRouting(
    {
      amountMinor: original.amountMinor,
      platformFeeMinor,
      professionalAmountMinor,
    },
    amount,
  )
}

export function updatePaymentStatus(
  paymentId: string,
  status: Payment['status'],
): PaymentResult<Payment> {
  const payment = getPayment(paymentId)
  if (!payment) {
    return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
  }
  if (!canTransitionPaymentStatus(payment.status, status)) {
    return {
      ok: false,
      error: 'invalid_input',
      message: `Nepovolený přechod stavu platby: ${payment.status} → ${status}.`,
    }
  }
  // Guard: DEMO must not be elevated to paid/authorized via this helper in app code.
  // Tests may still call storage directly; product path goes through provider.
  if (
    payment.isDemoPayment &&
    (status === 'paid' || status === 'authorized')
  ) {
    return {
      ok: false,
      error: 'demo_only',
      message: 'DEMO platba nemůže být označena jako zaplacená.',
    }
  }
  if (payment.status === status) {
    return { ok: true, value: payment }
  }
  const next: Payment = {
    ...payment,
    status,
    updatedAt: new Date().toISOString(),
  }
  return { ok: true, value: upsertPayment(next) }
}

export function clearAllPayments(): void {
  savePayments([])
}
