import { loadAccounts } from '../professional/storage'
import type { ProfessionalReview, PublicProfessionalReview } from './types'

export const PUBLIC_REVIEW_FORBIDDEN_KEYS = [
  'bookingId',
  'authorAccountId',
  'accountId',
  'microchip',
  'health',
  'healthRecords',
  'medications',
  'vaccinations',
  'documents',
  'ownerContacts',
  'ownerPhone',
  'ownerEmail',
  'privateNotes',
  'petId',
  'petName',
] as const

const FORBIDDEN_TEXT_PATTERNS = [
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /healthRecord/i,
  /documentContent/i,
]

/**
 * Privacy-safe author label: first name + last initial, or „Zákazník“.
 * Never returns accountId.
 */
export function toSafeReviewAuthorDisplayName(
  displayName: string | null | undefined,
): string {
  const trimmed = typeof displayName === 'string' ? displayName.trim() : ''
  if (!trimmed) return 'Zákazník'
  if (FORBIDDEN_TEXT_PATTERNS.some((re) => re.test(trimmed))) return 'Zákazník'
  // Guard against accidental IDs
  if (/^(acc_|owner_|usr_)/i.test(trimmed)) return 'Zákazník'

  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const only = parts[0]!
    if (only.length <= 1) return 'Zákazník'
    return only.charAt(0).toUpperCase() + only.slice(1).toLowerCase()
  }
  const first = parts[0]!
  const last = parts[parts.length - 1]!
  const firstFmt = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  const initial = last.charAt(0).toUpperCase()
  return `${firstFmt} ${initial}.`
}

export function resolveAuthorDisplayName(authorAccountId: string): string {
  const accounts = loadAccounts()
  const account = accounts.find((a) => a.id === authorAccountId)
  return toSafeReviewAuthorDisplayName(account?.displayName)
}

/**
 * Public projection of a review.
 * verifiedExperience is always true for eligible (booking-backed) reviews.
 */
export function toPublicProfessionalReview(
  review: ProfessionalReview,
  authorDisplayName?: string,
): PublicProfessionalReview | null {
  // DEMO never presented as a real public review.
  if (review.isDemo) return null
  // published + reported stay visible; hidden/removed are moderated away
  if (review.status === 'hidden' || review.status === 'removed') return null
  if (review.status !== 'published' && review.status !== 'reported') return null

  const pub: PublicProfessionalReview = {
    id: review.id,
    professionalId: review.professionalId,
    rating: review.rating,
    createdAt: review.createdAt,
    authorDisplayName:
      authorDisplayName ?? resolveAuthorDisplayName(review.authorAccountId),
    verifiedExperience: true,
    status: review.status,
  }
  if (review.title) pub.title = review.title
  if (review.text) pub.text = review.text
  if (review.reply) {
    pub.reply = {
      text: review.reply.text,
      repliedAt: review.reply.repliedAt,
    }
  }
  return pub
}

export function assertPublicReviewSafe(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true
  const text = JSON.stringify(payload)
  for (const key of PUBLIC_REVIEW_FORBIDDEN_KEYS) {
    // Allow status string values; forbid keys as object fields
    if (new RegExp(`"${key}"\\s*:`).test(text)) return false
  }
  return !FORBIDDEN_TEXT_PATTERNS.some((re) => re.test(text))
}

export function listPublicReviewsForProfessional(
  professionalId: string,
  reviews: ProfessionalReview[],
): PublicProfessionalReview[] {
  return reviews
    .filter((r) => r.professionalId === professionalId)
    .map((r) => toPublicProfessionalReview(r))
    .filter((r): r is PublicProfessionalReview => r != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
