import { createBookingId, loadBookings, saveBookings } from '../booking/storage'
import { createProfessionalService } from '../booking/services'
import type { Booking } from '../booking/types'
import { createPaymentRecord, listPaymentsForBooking } from './payments'
import { toMinorUnits } from './money'
import { loadPayments, savePayments } from './storage'

export type PaymentSeedFixture = {
  bookingNoPaymentId: string
  bookingPendingFullId: string
  bookingPendingDepositId: string
  paymentPendingFullId: string
  paymentPendingDepositId: string
}

function makeSnapshotBooking(input: {
  ownerAccountId: string
  professionalId: string
  serviceId: string
  petId: string
  startAt: string
  endAt: string
  serviceName: string
  price: number
  note: string
}): Booking {
  const now = new Date().toISOString()
  return {
    id: createBookingId('bkg'),
    ownerAccountId: input.ownerAccountId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    petId: input.petId,
    startAt: input.startAt,
    endAt: input.endAt,
    status: 'requested',
    serviceNameSnapshot: input.serviceName,
    serviceName: input.serviceName,
    priceSnapshot: input.price,
    price: input.price,
    currencySnapshot: 'CZK',
    currency: 'CZK',
    durationSnapshot: 60,
    note: input.note,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Safe DEMO seed:
 * 1) booking without payment
 * 2) booking with DEMO payment pending (full)
 * 3) booking with DEMO deposit pending
 *
 * Never seeds status `paid`.
 */
export function ensurePaymentSeed(opts: {
  ownerAccountId: string
  professionalId: string
  petId: string
}): PaymentSeedFixture | null {
  const existing = loadPayments().filter(
    (p) => p.isDemoPayment && p.purpose === 'BOOKING_PAYMENT',
  )
  if (existing.length >= 2) {
    const bookings = loadBookings()
    const withPayments = new Set(existing.map((p) => p.bookingId))
    const noPay = bookings.find(
      (b) =>
        b.professionalId === opts.professionalId &&
        b.ownerAccountId === opts.ownerAccountId &&
        !withPayments.has(b.id) &&
        b.note === 'DEMO: bez platby',
    )
    const full = existing.find((p) => p.paymentType === 'full' && p.status === 'pending')
    const deposit = existing.find((p) => p.paymentType === 'deposit' && p.status === 'pending')
    if (noPay && full && deposit) {
      return {
        bookingNoPaymentId: noPay.id,
        bookingPendingFullId: full.bookingId,
        bookingPendingDepositId: deposit.bookingId,
        paymentPendingFullId: full.id,
        paymentPendingDepositId: deposit.id,
      }
    }
  }

  const svcFull = createProfessionalService({
    professionalId: opts.professionalId,
    name: 'DEMO platba — plná cena',
    durationMinutes: 60,
    price: 1000,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'full_prepay',
    requiresDeposit: false,
    isDemo: true,
  })
  const svcDeposit = createProfessionalService({
    professionalId: opts.professionalId,
    name: 'DEMO platba — záloha',
    durationMinutes: 60,
    price: 1000,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'deposit',
    requiresDeposit: true,
    depositType: 'percentage',
    depositValue: 30,
    isDemo: true,
  })
  const svcOnSite = createProfessionalService({
    professionalId: opts.professionalId,
    name: 'DEMO platba — na místě',
    durationMinutes: 30,
    price: 500,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
    isDemo: true,
  })

  if (!svcFull.ok || !svcDeposit.ok || !svcOnSite.ok) return null

  const base = Date.parse('2026-10-20T09:00:00.000Z')
  const bNoPay = makeSnapshotBooking({
    ownerAccountId: opts.ownerAccountId,
    professionalId: opts.professionalId,
    serviceId: svcOnSite.value.id,
    petId: opts.petId,
    startAt: new Date(base).toISOString(),
    endAt: new Date(base + 30 * 60_000).toISOString(),
    serviceName: svcOnSite.value.name,
    price: 500,
    note: 'DEMO: bez platby',
  })
  const bFull = makeSnapshotBooking({
    ownerAccountId: opts.ownerAccountId,
    professionalId: opts.professionalId,
    serviceId: svcFull.value.id,
    petId: opts.petId,
    startAt: new Date(base + 86400_000).toISOString(),
    endAt: new Date(base + 86400_000 + 3600_000).toISOString(),
    serviceName: svcFull.value.name,
    price: 1000,
    note: 'DEMO: pending full',
  })
  const bDeposit = makeSnapshotBooking({
    ownerAccountId: opts.ownerAccountId,
    professionalId: opts.professionalId,
    serviceId: svcDeposit.value.id,
    petId: opts.petId,
    startAt: new Date(base + 2 * 86400_000).toISOString(),
    endAt: new Date(base + 2 * 86400_000 + 3600_000).toISOString(),
    serviceName: svcDeposit.value.name,
    price: 1000,
    note: 'DEMO: pending deposit',
  })

  const allBookings = loadBookings()
  saveBookings([...allBookings, bNoPay, bFull, bDeposit])

  const payFull = createPaymentRecord({
    bookingId: bFull.id,
    ownerAccountId: opts.ownerAccountId,
    professionalId: opts.professionalId,
    amountMinor: toMinorUnits(1000, 'CZK'),
    currency: 'CZK',
    paymentType: 'full',
    serviceNameSnapshot: bFull.serviceNameSnapshot,
    priceSnapshotMajor: bFull.priceSnapshot,
    currencySnapshot: 'CZK',
    isDemoPayment: true,
  })
  const payDeposit = createPaymentRecord({
    bookingId: bDeposit.id,
    ownerAccountId: opts.ownerAccountId,
    professionalId: opts.professionalId,
    amountMinor: toMinorUnits(300, 'CZK'),
    currency: 'CZK',
    paymentType: 'deposit',
    serviceNameSnapshot: bDeposit.serviceNameSnapshot,
    priceSnapshotMajor: bDeposit.priceSnapshot,
    currencySnapshot: 'CZK',
    isDemoPayment: true,
  })

  if (!payFull.ok || !payDeposit.ok) return null

  if (listPaymentsForBooking(bNoPay.id).length > 0) {
    savePayments(loadPayments().filter((p) => p.bookingId !== bNoPay.id))
  }

  return {
    bookingNoPaymentId: bNoPay.id,
    bookingPendingFullId: bFull.id,
    bookingPendingDepositId: bDeposit.id,
    paymentPendingFullId: payFull.value.id,
    paymentPendingDepositId: payDeposit.value.id,
  }
}

export function resetPaymentSeed(): void {
  savePayments([])
}