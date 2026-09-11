import {
  PROFESSIONAL_REVIEW_REPORT_REASONS,
  PROFESSIONAL_REVIEW_STATUSES,
  type ProfessionalReview,
  type ProfessionalReviewReply,
  type ProfessionalReviewReportReason,
  type ProfessionalReviewStatus,
  type ReviewRating,
} from './types'

export const PROFESSIONAL_REVIEWS_STORAGE_KEY = 'lovedandknown.professionalReviews'

const STATUS_SET = new Set<string>(PROFESSIONAL_REVIEW_STATUSES)
const REASON_SET = new Set<string>(PROFESSIONAL_REVIEW_REPORT_REASONS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asRating(value: unknown): ReviewRating | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < 1 || value > 5) return null
  return value as ReviewRating
}

function normalizeReply(raw: unknown): ProfessionalReviewReply | undefined {
  if (!isRecord(raw)) return undefined
  const text = asString(raw.text)
  const repliedAt = asString(raw.repliedAt)
  const professionalId = asString(raw.professionalId)
  if (!text || !repliedAt || !professionalId) return undefined
  return { text, repliedAt, professionalId }
}

export function createReviewId(prefix = 'rev'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function normalizeProfessionalReview(raw: unknown): ProfessionalReview | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const professionalId = asString(raw.professionalId)
  const authorAccountId = asString(raw.authorAccountId)
  const bookingId = asString(raw.bookingId)
  const rating = asRating(raw.rating)
  const statusRaw = asString(raw.status)
  if (
    !id ||
    !professionalId ||
    !authorAccountId ||
    !bookingId ||
    rating == null ||
    !statusRaw ||
    !STATUS_SET.has(statusRaw)
  ) {
    return null
  }

  const createdAt = asString(raw.createdAt) ?? new Date(0).toISOString()
  const updatedAt = asString(raw.updatedAt) ?? createdAt
  const review: ProfessionalReview = {
    id,
    professionalId,
    authorAccountId,
    bookingId,
    rating,
    status: statusRaw as ProfessionalReviewStatus,
    createdAt,
    updatedAt,
  }

  const title = asString(raw.title)
  if (title) review.title = title
  const text = asString(raw.text)
  if (text) review.text = text
  const reportedAt = asString(raw.reportedAt)
  if (reportedAt) review.reportedAt = reportedAt
  const reportReason = asString(raw.reportReason)
  if (reportReason && REASON_SET.has(reportReason)) {
    review.reportReason = reportReason as ProfessionalReviewReportReason
  }
  const reply = normalizeReply(raw.reply)
  if (reply) review.reply = reply
  const isDemo = asBool(raw.isDemo)
  if (isDemo === true) review.isDemo = true

  return review
}

export function normalizeProfessionalReviews(raw: unknown): ProfessionalReview[] {
  if (!Array.isArray(raw)) return []
  const out: ProfessionalReview[] = []
  for (const item of raw) {
    const n = normalizeProfessionalReview(item)
    if (n) out.push(n)
  }
  return out
}

export function loadProfessionalReviews(): ProfessionalReview[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROFESSIONAL_REVIEWS_STORAGE_KEY)
    if (!raw) return []
    return normalizeProfessionalReviews(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function saveProfessionalReviews(list: ProfessionalReview[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PROFESSIONAL_REVIEWS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore quota / private mode
  }
}
