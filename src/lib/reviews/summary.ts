/**
 * Review aggregates for public profile + catalog.
 * DEMO reviews (isDemo === true) never contribute to public averages.
 */

import type {
  ProfessionalReview,
  ProfessionalReviewSummary,
  ReviewRating,
  ReviewRatingBreakdown,
} from './types'
import { loadProfessionalReviews } from './storage'

/** Soft prior so one 5.0 does not outrank many solid reviews. */
export const REVIEW_CONFIDENCE_PRIOR_MEAN = 4.0
export const REVIEW_CONFIDENCE_PRIOR_WEIGHT = 8

function emptyBreakdown(): ReviewRatingBreakdown {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

/** Reviews that may appear in public rating / catalog. */
export function isCountablePublicReview(review: ProfessionalReview): boolean {
  return review.status === 'published' && review.isDemo !== true
}

export function computeConfidenceScore(average: number, count: number): number {
  if (count <= 0) return 0
  return (
    (average * count + REVIEW_CONFIDENCE_PRIOR_MEAN * REVIEW_CONFIDENCE_PRIOR_WEIGHT) /
    (count + REVIEW_CONFIDENCE_PRIOR_WEIGHT)
  )
}

export function buildProfessionalReviewSummary(
  professionalId: string,
  reviews: ProfessionalReview[],
): ProfessionalReviewSummary {
  const countable = reviews.filter(
    (r) => r.professionalId === professionalId && isCountablePublicReview(r),
  )
  const breakdown = emptyBreakdown()
  if (countable.length === 0) {
    return {
      professionalId,
      average: null,
      count: 0,
      breakdown,
      confidenceScore: null,
    }
  }

  let sum = 0
  for (const r of countable) {
    breakdown[r.rating] += 1
    sum += r.rating
  }
  const average = Math.round((sum / countable.length) * 10) / 10
  return {
    professionalId,
    average,
    count: countable.length,
    breakdown,
    confidenceScore: computeConfidenceScore(average, countable.length),
  }
}

export function getProfessionalReviewSummary(
  professionalId: string,
  reviews: ProfessionalReview[] = loadProfessionalReviews(),
): ProfessionalReviewSummary {
  return buildProfessionalReviewSummary(professionalId, reviews)
}

export function buildReviewSummaryMap(
  professionalIds: string[],
  reviews: ProfessionalReview[] = loadProfessionalReviews(),
): Map<string, ProfessionalReviewSummary> {
  const map = new Map<string, ProfessionalReviewSummary>()
  for (const id of professionalIds) {
    map.set(id, buildProfessionalReviewSummary(id, reviews))
  }
  return map
}

export function formatReviewAverage(average: number | null): string {
  if (average == null) return ''
  return average.toFixed(1).replace('.', ',')
}

export function ratingStars(rating: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

export function breakdownPercent(
  breakdown: ReviewRatingBreakdown,
  star: ReviewRating,
  count: number,
): number {
  if (count <= 0) return 0
  return Math.round((breakdown[star] / count) * 100)
}
