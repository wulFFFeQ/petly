/**
 * Booking confirmation after verified payment — event-driven, not frontend-driven.
 *
 * Payment success ≠ Booking confirmation.
 * payment_pending → confirmed must NEVER be performed by the UI.
 *
 * DEMO: prepares the flow but does not elevate Payment to paid or Booking to confirmed.
 */

import {
  confirmBookingAfterVerifiedPayment,
  getBooking,
} from '../booking/bookings'
import type { Booking, BookingStatus } from '../booking/types'
import { getProfessionalService } from '../booking/services'
import { createDemoPayoutDraft, getPayoutForPayment } from './payout'
import { getPayment } from './payments'
import type { Payment, PaymentResult } from './types'
import type { PaymentPayout } from './connectTypes'

export type BookingPaymentPolicyResult = {
  skipped: boolean
  reason:
    | 'demo_only'
    | 'provider_event_required'
    | 'payment_not_paid'
    | 'booking_not_found'
    | 'not_applicable'
    | 'already_confirmed'
    | 'applied'
  booking?: Booking
  payment?: Payment
  payout?: PaymentPayout
}

/** Service requires online payment / deposit collection. */
export function bookingRequiresOnlinePayment(bookingId: string): boolean {
  const booking = getBooking(bookingId)
  if (!booking) return false
  const service = getProfessionalService(booking.serviceId)
  const collection = service?.paymentCollection ?? 'pay_on_site'
  return collection === 'deposit' || collection === 'full_prepay'
}

/**
 * Allowed booking transitions related to payment (prepared graph).
 * Existing pay_on_site flow: requested → confirmed (professional) remains.
 */
export function canTransitionBookingForPayment(
  from: BookingStatus,
  to: BookingStatus,
): boolean {
  if (from === to) return true
  if (from === 'requested' && to === 'payment_pending') return true
  if (from === 'payment_pending' && to === 'confirmed') return true
  if (from === 'requested' && to === 'confirmed') return true
  return false
}

/**
 * Backend-ready: after a *verified* provider payment success event.
 * DEMO always returns skipped — never invents paid/confirmed.
 */
export function applyVerifiedPaymentSuccessToBooking(input: {
  paymentId: string
  providerEventId: string
  /** Must be true only after verifyWebhookSignature + non-demo live provider. */
  verifiedLiveProviderEvent?: boolean
}): PaymentResult<BookingPaymentPolicyResult> {
  if (!input.providerEventId?.trim()) {
    return {
      ok: false,
      error: 'invalid_input',
      message: 'Chybí providerEventId.',
    }
  }

  const payment = getPayment(input.paymentId)
  if (!payment) {
    return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
  }

  const booking = getBooking(payment.bookingId)
  if (!booking) {
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'booking_not_found',
        payment,
      },
    }
  }

  // DEMO / inactive provider: prepare only.
  if (payment.isDemoPayment || !input.verifiedLiveProviderEvent) {
    const payout = createDemoPayoutDraft(payment)
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'demo_only',
        booking,
        payment,
        payout,
      },
    }
  }

  if (payment.status !== 'paid' && payment.status !== 'authorized') {
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'payment_not_paid',
        booking,
        payment,
      },
    }
  }

  if (!bookingRequiresOnlinePayment(booking.id)) {
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'not_applicable',
        booking,
        payment,
      },
    }
  }

  if (booking.status === 'confirmed') {
    const payout = getPayoutForPayment(payment.id) ?? createDemoPayoutDraft(payment)
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'already_confirmed',
        booking,
        payment,
        payout,
      },
    }
  }

  if (booking.status !== 'payment_pending' && booking.status !== 'requested') {
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'not_applicable',
        booking,
        payment,
      },
    }
  }

  if (!canTransitionBookingForPayment(booking.status, 'confirmed')) {
    return {
      ok: true,
      value: {
        skipped: true,
        reason: 'not_applicable',
        booking,
        payment,
      },
    }
  }

  const confirmed = confirmBookingAfterVerifiedPayment(booking.id)
  if (!confirmed.ok) {
    return {
      ok: false,
      error: 'invalid_input',
      message: confirmed.message,
    }
  }
  const payout = createDemoPayoutDraft(payment)

  return {
    ok: true,
    value: {
      skipped: false,
      reason: 'applied',
      booking: confirmed.value,
      payment,
      payout,
    },
  }
}

/**
 * Frontend must not call this to force confirmation after a success page visit.
 * Success pages only display processing copy + current Payment status.
 */
export function frontendMustNotConfirmBookingAfterPayment(): true {
  return true
}
