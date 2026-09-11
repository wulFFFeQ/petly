/**
 * Owner checkout initiation — amount always from Payment snapshot.
 * Frontend may only pass paymentId + actor; never amount/fee.
 */

import { getBooking } from '../booking/bookings'
import { getPaymentProviderConfig } from './config'
import { normalizeCurrency } from './money'
import { getPayment } from './payments'
import { getPaymentProvider } from './providerRegistry'
import type { CheckoutSessionResult } from './connectTypes'
import type { Payment, PaymentResult } from './types'

export type InitiateCheckoutInput = {
  paymentId: string
  actorAccountId: string
  /**
   * Optional client-supplied amount — rejected if present and mismatches snapshot.
   * Prefer omitting entirely.
   */
  claimedAmountMinor?: number
  claimedCurrency?: string
}

export type InitiateCheckoutResult = CheckoutSessionResult & {
  /** Snapshot amount used for the session (never from client override). */
  amountMinor: number
  currency: string
}

/**
 * Owner-only checkout for an existing BOOKING_PAYMENT.
 * Professionals cannot initiate checkout on behalf of the owner.
 */
export async function initiateCheckoutSession(
  input: InitiateCheckoutInput,
): Promise<PaymentResult<InitiateCheckoutResult>> {
  const { paymentId, actorAccountId } = input
  if (!paymentId?.trim() || !actorAccountId?.trim()) {
    return { ok: false, error: 'invalid_input', message: 'Chybí paymentId nebo actor.' }
  }

  const payment = getPayment(paymentId)
  if (!payment) {
    return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
  }
  if (payment.purpose !== 'BOOKING_PAYMENT') {
    return {
      ok: false,
      error: 'forbidden',
      message: 'Checkout je pouze pro BOOKING_PAYMENT.',
    }
  }
  if (payment.paymentType === 'refund') {
    return { ok: false, error: 'invalid_input', message: 'Nelze vytvořit checkout pro refund.' }
  }
  if (payment.status !== 'pending' && payment.status !== 'failed') {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'Checkout lze vytvořit pouze pro pending/failed platbu.',
    }
  }

  // Ownership: only the booking owner may initiate.
  if (payment.ownerAccountId !== actorAccountId) {
    return {
      ok: false,
      error: 'forbidden',
      message: 'Checkout může zahájit pouze majitel rezervace.',
    }
  }

  const booking = getBooking(payment.bookingId)
  if (!booking) {
    return { ok: false, error: 'booking_not_found', message: 'Rezervace nenalezena.' }
  }
  if (booking.ownerAccountId !== actorAccountId) {
    return {
      ok: false,
      error: 'forbidden',
      message: 'Checkout může zahájit pouze majitel rezervace.',
    }
  }

  // Professionals must not initiate owner checkout (even if same account hosts a pro profile).
  // Gate is ownerAccountId match above; additional check: actor must own the booking as owner.

  if (input.claimedAmountMinor !== undefined) {
    if (input.claimedAmountMinor !== payment.amountMinor) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'Částka z frontendu se neshoduje se snapshotem platby.',
      }
    }
  }
  if (input.claimedCurrency !== undefined) {
    const claimed = normalizeCurrency(input.claimedCurrency)
    const snap = normalizeCurrency(payment.currencySnapshot ?? payment.currency)
    if (claimed !== snap) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'Měna z frontendu se neshoduje se snapshotem platby.',
      }
    }
  }

  const provider = getPaymentProvider()
  const result = await provider.createCheckoutSession(paymentId)
  if (!result.ok) return result

  const session = result.value
  // Hard DEMO safety: never invent checkout URL / provider session id.
  const config = getPaymentProviderConfig()
  if (config.isDemo || session.isDemo || session.mode === 'demo_preparing') {
    if (session.checkoutUrl || session.url || session.providerCheckoutSessionId) {
      return {
        ok: false,
        error: 'demo_only',
        message: 'DEMO nesmí vracet checkout URL ani provider session id.',
      }
    }
  }

  return {
    ok: true,
    value: {
      ...session,
      amountMinor: payment.amountMinor,
      currency: normalizeCurrency(payment.currencySnapshot ?? payment.currency),
    },
  }
}

/** Public-safe checkout projection for UI — no provider IDs. */
export function toPublicCheckoutSession(session: CheckoutSessionResult): {
  paymentId: string
  status: CheckoutSessionResult['status']
  mode: CheckoutSessionResult['mode']
  isDemo: boolean
  message: string
  /** Only when live provider returned a real URL. */
  checkoutUrl?: string
} {
  const out: {
    paymentId: string
    status: CheckoutSessionResult['status']
    mode: CheckoutSessionResult['mode']
    isDemo: boolean
    message: string
    checkoutUrl?: string
  } = {
    paymentId: session.paymentId,
    status: session.status,
    mode: session.mode,
    isDemo: session.isDemo,
    message: session.message,
  }
  if (!session.isDemo && session.mode === 'live') {
    const url = session.checkoutUrl ?? session.url
    if (url) out.checkoutUrl = url
  }
  return out
}

export function getCheckoutAmountFromPayment(payment: Payment): {
  amountMinor: number
  currency: string
  serviceNameSnapshot?: string
  bookingId: string
} {
  return {
    amountMinor: payment.amountMinor,
    currency: normalizeCurrency(payment.currencySnapshot ?? payment.currency),
    serviceNameSnapshot: payment.serviceNameSnapshot,
    bookingId: payment.bookingId,
  }
}
