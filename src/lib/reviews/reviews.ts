/**
 * Professional review domain API — backend-ready contracts.
 * Reviews are a separate layer from booking / verification / membership / access.
 */

import { getBooking } from '../booking/bookings'
import { loadProfessionalProfiles } from '../professional/storage'
import { canCreateReview, findReviewForBooking } from './eligibility'
import {
  createReviewId,
  loadProfessionalReviews,
  saveProfessionalReviews,
} from './storage'
import { buildProfessionalReviewSummary, getProfessionalReviewSummary } from './summary'
import {
  listPublicReviewsForProfessional,
  toPublicProfessionalReview,
} from './public'
import type {
  ProfessionalReview,
  ProfessionalReviewReportReason,
  ProfessionalReviewStatus,
  ProfessionalReviewSummary,
  PublicProfessionalReview,
  ReviewRating,
  ReviewResult,
} from './types'

export type CreateProfessionalReviewInput = {
  bookingId: string
  authorAccountId: string
  rating: number
  title?: string
  text?: string
  /** DEMO-only — excluded from public rating when true. */
  isDemo?: boolean
}

export type ReplyToProfessionalReviewInput = {
  reviewId: string
  professionalId: string
  text: string
}

export type ReportProfessionalReviewInput = {
  reviewId: string
  reporterAccountId: string
  reason: ProfessionalReviewReportReason
}

function fail<T>(error: ReviewResult<T>['error'], message: string): ReviewResult<T> {
  return { ok: false, error, message }
}

function asValidRating(value: number): ReviewRating | null {
  if (!Number.isInteger(value) || value < 1 || value > 5) return null
  return value as ReviewRating
}

export function getProfessionalReview(reviewId: string): ProfessionalReview | null {
  return loadProfessionalReviews().find((r) => r.id === reviewId) ?? null
}

export function getReviewForBooking(bookingId: string): ProfessionalReview | null {
  return findReviewForBooking(bookingId, loadProfessionalReviews())
}

export function listReviewsForProfessional(
  professionalId: string,
  opts?: { includeNonPublic?: boolean },
): ProfessionalReview[] {
  const all = loadProfessionalReviews().filter((r) => r.professionalId === professionalId)
  if (opts?.includeNonPublic) return all
  return all.filter((r) => r.status === 'published' && r.isDemo !== true)
}

export function getProfessionalReviews(
  professionalId: string,
): PublicProfessionalReview[] {
  return listPublicReviewsForProfessional(professionalId, loadProfessionalReviews())
}

export { getProfessionalReviewSummary, buildProfessionalReviewSummary }

export function createProfessionalReview(
  input: CreateProfessionalReviewInput,
): ReviewResult<ProfessionalReview> {
  const rating = asValidRating(input.rating)
  if (rating == null) {
    return fail('invalid_rating', 'Hodnocení musí být celé číslo 1–5.')
  }
  if (!input.authorAccountId?.trim()) {
    return fail('invalid_input', 'Chybí autor hodnocení.')
  }
  if (!input.bookingId?.trim()) {
    return fail('invalid_input', 'Chybí rezervace.')
  }

  const booking = getBooking(input.bookingId)
  if (!booking) {
    return fail('booking_not_found', 'Rezervace nenalezena.')
  }

  const existing = loadProfessionalReviews()
  const eligibility = canCreateReview(booking, input.authorAccountId, existing)
  if (!eligibility.ok) {
    if (eligibility.reason === 'already_reviewed') {
      return fail('duplicate_review', 'Hodnocení pro tuto rezervaci už existuje.')
    }
    if (eligibility.reason === 'not_owner') {
      return fail('forbidden', 'Hodnotit může pouze majitel rezervace.')
    }
    if (eligibility.reason === 'not_completed') {
      return fail('booking_not_eligible', 'Hodnotit lze pouze dokončenou rezervaci.')
    }
    return fail('booking_not_eligible', 'Rezervace není způsobilá k hodnocení.')
  }

  const now = new Date().toISOString()
  const review: ProfessionalReview = {
    id: createReviewId(),
    professionalId: booking.professionalId,
    authorAccountId: input.authorAccountId,
    bookingId: booking.id,
    rating,
    status: 'published',
    createdAt: now,
    updatedAt: now,
  }
  const title = input.title?.trim()
  if (title) review.title = title.slice(0, 120)
  const text = input.text?.trim()
  if (text) review.text = text.slice(0, 2000)
  if (input.isDemo === true) review.isDemo = true

  saveProfessionalReviews([review, ...existing])
  return { ok: true, value: review }
}

/**
 * Limited update — status / moderation path only.
 * Customers must not freely rewrite rating/text after publish without history.
 */
export function updateProfessionalReview(input: {
  reviewId: string
  actorAccountId: string
  status?: ProfessionalReviewStatus
}): ReviewResult<ProfessionalReview> {
  const list = loadProfessionalReviews()
  const idx = list.findIndex((r) => r.id === input.reviewId)
  if (idx < 0) return fail('not_found', 'Hodnocení nenalezeno.')
  const current = list[idx]!

  // DEMO: only author or future moderator path — status changes only
  if (current.authorAccountId !== input.actorAccountId) {
    return fail('forbidden', 'Nemáte oprávnění upravit toto hodnocení.')
  }
  if (!input.status) {
    return fail('invalid_input', 'Po publikaci nelze volně měnit text ani rating.')
  }
  if (input.status === current.status) {
    return { ok: true, value: current }
  }

  const next: ProfessionalReview = {
    ...current,
    status: input.status,
    updatedAt: new Date().toISOString(),
  }
  const copy = [...list]
  copy[idx] = next
  saveProfessionalReviews(copy)
  return { ok: true, value: next }
}

export function replyToProfessionalReview(
  input: ReplyToProfessionalReviewInput,
): ReviewResult<ProfessionalReview> {
  const text = input.text?.trim()
  if (!text) return fail('invalid_input', 'Odpověď nesmí být prázdná.')
  if (text.length > 1000) {
    return fail('invalid_input', 'Odpověď je příliš dlouhá.')
  }

  const profiles = loadProfessionalProfiles()
  const profile = profiles.find((p) => p.id === input.professionalId)
  if (!profile) return fail('forbidden', 'Profesionální profil nenalezen.')

  const list = loadProfessionalReviews()
  const idx = list.findIndex((r) => r.id === input.reviewId)
  if (idx < 0) return fail('not_found', 'Hodnocení nenalezeno.')
  const current = list[idx]!

  if (current.professionalId !== input.professionalId) {
    return fail('forbidden', 'Můžete odpovídat jen na hodnocení svého profilu.')
  }
  // Professionals must never alter customer rating/text — reply only.
  if (current.reply) {
    // Allow overwrite of reply text (same reply slot) — not a second parallel reply
  }

  const now = new Date().toISOString()
  const next: ProfessionalReview = {
    ...current,
    reply: {
      text: text.slice(0, 1000),
      repliedAt: now,
      professionalId: input.professionalId,
    },
    updatedAt: now,
  }
  // Preserve customer rating/text untouched
  next.rating = current.rating
  next.title = current.title
  next.text = current.text

  const copy = [...list]
  copy[idx] = next
  saveProfessionalReviews(copy)
  return { ok: true, value: next }
}

/**
 * Report a review. Sets status to reported — does NOT delete.
 * Professionals cannot simply remove negative reviews.
 */
export function reportProfessionalReview(
  input: ReportProfessionalReviewInput,
): ReviewResult<ProfessionalReview> {
  if (!input.reporterAccountId?.trim()) {
    return fail('invalid_input', 'Chybí nahlašovatel.')
  }
  const list = loadProfessionalReviews()
  const idx = list.findIndex((r) => r.id === input.reviewId)
  if (idx < 0) return fail('not_found', 'Hodnocení nenalezeno.')
  const current = list[idx]!

  if (current.status === 'removed') {
    return fail('invalid_input', 'Hodnocení již bylo odstraněno moderací.')
  }

  const now = new Date().toISOString()
  const next: ProfessionalReview = {
    ...current,
    status: 'reported',
    reportedAt: now,
    reportReason: input.reason,
    updatedAt: now,
  }
  const copy = [...list]
  copy[idx] = next
  saveProfessionalReviews(copy)
  return { ok: true, value: next }
}

export function summarizeForCatalog(
  professionalId: string,
): ProfessionalReviewSummary {
  return getProfessionalReviewSummary(professionalId)
}

export { toPublicProfessionalReview }
