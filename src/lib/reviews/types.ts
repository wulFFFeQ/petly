/** Professional review statuses — moderation-aware, separate from booking. */
export type ProfessionalReviewStatus =
  | 'published'
  | 'hidden'
  | 'reported'
  | 'removed'

export const PROFESSIONAL_REVIEW_STATUSES: ProfessionalReviewStatus[] = [
  'published',
  'hidden',
  'reported',
  'removed',
]

export type ProfessionalReviewReportReason =
  | 'spam'
  | 'offensive'
  | 'personal_data'
  | 'fake_experience'
  | 'other'

export const PROFESSIONAL_REVIEW_REPORT_REASONS: ProfessionalReviewReportReason[] = [
  'spam',
  'offensive',
  'personal_data',
  'fake_experience',
  'other',
]

export const REVIEW_REPORT_REASON_LABELS: Record<ProfessionalReviewReportReason, string> = {
  spam: 'Spam',
  offensive: 'Urážlivý obsah',
  personal_data: 'Osobní údaje',
  fake_experience: 'Falešná zkušenost',
  other: 'Jiný problém',
}

/** Star rating — integers 1–5 only. */
export type ReviewRating = 1 | 2 | 3 | 4 | 5

export interface ProfessionalReviewReply {
  text: string
  repliedAt: string
  professionalId: string
}

/**
 * Customer review of a professional — always tied to a completed booking.
 * Separate from verification, membership, access, and booking models.
 */
export interface ProfessionalReview {
  id: string
  professionalId: string
  authorAccountId: string
  bookingId: string
  rating: ReviewRating
  title?: string
  text?: string
  status: ProfessionalReviewStatus
  createdAt: string
  updatedAt: string
  reportedAt?: string
  reportReason?: ProfessionalReviewReportReason
  reply?: ProfessionalReviewReply
  /**
   * DEMO-only marker. When true, must never contribute to public rating/summary.
   */
  isDemo?: boolean
}

export type ReviewErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'invalid_input'
  | 'invalid_rating'
  | 'booking_not_found'
  | 'booking_not_eligible'
  | 'duplicate_review'
  | 'already_replied'

export type ReviewResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ReviewErrorCode; message: string }

export type ReviewRatingBreakdown = Record<ReviewRating, number>

export interface ProfessionalReviewSummary {
  professionalId: string
  average: number | null
  count: number
  breakdown: ReviewRatingBreakdown
  /**
   * Bayesian-ready confidence score for catalog sort.
   * Prefer this over raw average so a single 5.0 does not outrank many 4.8s.
   */
  confidenceScore: number | null
}

/** Safe public projection — never includes bookingId / accountId / pet data. */
export interface PublicProfessionalReview {
  id: string
  professionalId: string
  rating: ReviewRating
  title?: string
  text?: string
  createdAt: string
  /** Privacy-safe author label (never accountId). */
  authorDisplayName: string
  /** Always true for reviews created from completed bookings. */
  verifiedExperience: boolean
  reply?: {
    text: string
    repliedAt: string
  }
  status: ProfessionalReviewStatus
}

export type CatalogMinRatingFilter = 4.5 | 4.0 | 3.5 | 'none'

export type CatalogReviewSort = 'relevance' | 'rating' | 'reviewCount'
