/**
 * UI-facing review session helpers: domain mutation + notification emit.
 */

import { loadProfessionalProfiles } from '../professional/storage'
import { emitProfessionalReviewNotification } from '../notifications/fromReview'
import type { NotificationDraft } from '../notifications/model'
import {
  createProfessionalReview,
  replyToProfessionalReview,
  reportProfessionalReview,
  type CreateProfessionalReviewInput,
  type ReplyToProfessionalReviewInput,
  type ReportProfessionalReviewInput,
} from './reviews'
import type { ProfessionalReview, ReviewResult } from './types'

export type ReviewUpsertNotification = (draft: NotificationDraft) => void

function resolveProfessional(professionalId: string) {
  return loadProfessionalProfiles().find((p) => p.id === professionalId) ?? null
}

export function submitProfessionalReview(
  input: CreateProfessionalReviewInput,
  opts: { upsertNotification: ReviewUpsertNotification },
): ReviewResult<ProfessionalReview> {
  const result = createProfessionalReview(input)
  if (!result.ok) return result

  const professional = resolveProfessional(result.value.professionalId)
  emitProfessionalReviewNotification(opts.upsertNotification, {
    event: 'received',
    review: result.value,
    professional,
  })
  return result
}

export function submitProfessionalReviewReply(
  input: ReplyToProfessionalReviewInput,
  opts: { upsertNotification: ReviewUpsertNotification },
): ReviewResult<ProfessionalReview> {
  const result = replyToProfessionalReview(input)
  if (!result.ok) return result

  const professional = resolveProfessional(result.value.professionalId)
  emitProfessionalReviewNotification(opts.upsertNotification, {
    event: 'reply',
    review: result.value,
    professional,
  })
  return result
}

export function submitProfessionalReviewReport(
  input: ReportProfessionalReviewInput,
): ReviewResult<ProfessionalReview> {
  return reportProfessionalReview(input)
}
