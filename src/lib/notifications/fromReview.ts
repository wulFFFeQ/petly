import type { ProfessionalProfile } from '../../types/professional'
import type { NotificationDraft } from './model'
import type { ProfessionalReview } from '../reviews/types'

export type ProfessionalReviewNotificationEvent = 'received' | 'reply'

export type ProfessionalReviewNotificationContext = {
  event: ProfessionalReviewNotificationEvent
  review: ProfessionalReview
  professional?: Pick<ProfessionalProfile, 'id' | 'accountId' | 'displayName'> | null
}

const FORBIDDEN_PAYLOAD_PATTERNS = [
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /healthRecord/i,
  /documentContent/i,
  /bookingId/i,
  /authorAccountId/i,
]

export function reviewDedupeKey(
  event: ProfessionalReviewNotificationEvent,
  reviewId: string,
): string {
  return event === 'received' ? `review:received:${reviewId}` : `review:reply:${reviewId}`
}

export function isSafeReviewNotificationPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true
  const text = JSON.stringify(payload)
  return !FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(text))
}

/**
 * Privacy-safe drafts for review lifecycle.
 * - received → professional account
 * - reply → review author
 */
export function buildProfessionalReviewNotification(
  ctx: ProfessionalReviewNotificationContext,
): NotificationDraft | null {
  const { event, review, professional } = ctx
  const href = `/professionals/${review.professionalId}#reviews`
  const stars = '★'.repeat(review.rating)

  if (event === 'received') {
    const recipientAccountId = professional?.accountId
    if (!recipientAccountId) return null
    return {
      type: 'professional_review_received',
      title: 'Nové hodnocení',
      message: `Obdrželi jste hodnocení ${stars} (${review.rating}/5).`,
      priority: 'normal',
      dedupeKey: reviewDedupeKey('received', review.id),
      sourceEventId: reviewDedupeKey('received', review.id),
      href,
      recipientAccountId,
      relatedProfessionalId: review.professionalId,
    }
  }

  // reply
  const recipientAccountId = review.authorAccountId
  if (!recipientAccountId) return null
  const proName =
    typeof professional?.displayName === 'string' && professional.displayName.trim()
      ? professional.displayName.trim()
      : 'Profesionál'
  return {
    type: 'professional_review_reply',
    title: 'Odpověď na hodnocení',
    message: `${proName} odpověděl/a na vaše hodnocení.`,
    priority: 'normal',
    dedupeKey: reviewDedupeKey('reply', review.id),
    sourceEventId: reviewDedupeKey('reply', review.id),
    href,
    recipientAccountId,
    relatedProfessionalId: review.professionalId,
  }
}

export function emitProfessionalReviewNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: ProfessionalReviewNotificationContext,
): NotificationDraft | null {
  const draft = buildProfessionalReviewNotification(ctx)
  if (!draft) return null
  if (!isSafeReviewNotificationPayload(draft)) return null
  upsert(draft)
  return draft
}
