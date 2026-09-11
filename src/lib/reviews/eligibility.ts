import type { Booking } from '../booking/types'
import type { ProfessionalReview } from './types'

export type ReviewEligibilityReason =
  | 'ok'
  | 'booking_missing'
  | 'not_owner'
  | 'professional_mismatch'
  | 'not_completed'
  | 'already_reviewed'

export type ReviewEligibility = {
  ok: boolean
  reason: ReviewEligibilityReason
}

/**
 * A user may create a review only when:
 * - booking exists
 * - booking belongs to the user
 * - booking is for the given professional (when professionalId provided)
 * - booking.status === 'completed'
 * - no review yet for this booking
 *
 * Never allow review from profile view, connection, or non-completed statuses.
 */
export function canCreateReview(
  booking: Booking | null | undefined,
  authorAccountId: string,
  existingReviews: ProfessionalReview[],
  professionalId?: string,
): ReviewEligibility {
  if (!booking) {
    return { ok: false, reason: 'booking_missing' }
  }
  if (!authorAccountId || booking.ownerAccountId !== authorAccountId) {
    return { ok: false, reason: 'not_owner' }
  }
  if (professionalId && booking.professionalId !== professionalId) {
    return { ok: false, reason: 'professional_mismatch' }
  }
  if (booking.status !== 'completed') {
    return { ok: false, reason: 'not_completed' }
  }
  const duplicate = existingReviews.some(
    (r) => r.bookingId === booking.id && r.authorAccountId === authorAccountId,
  )
  if (duplicate) {
    return { ok: false, reason: 'already_reviewed' }
  }
  return { ok: true, reason: 'ok' }
}

export function findReviewForBooking(
  bookingId: string,
  reviews: ProfessionalReview[] = [],
): ProfessionalReview | null {
  return reviews.find((r) => r.bookingId === bookingId) ?? null
}
