import { useState } from 'react'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import {
  REVIEW_REPORT_REASON_LABELS,
  PROFESSIONAL_REVIEW_REPORT_REASONS,
  ratingStars,
  submitProfessionalReviewReply,
  submitProfessionalReviewReport,
  type ProfessionalReviewReportReason,
  type PublicProfessionalReview,
} from '../../../lib/reviews'
import type { NotificationDraft } from '../../../lib/notifications'
import { cn } from '../../../lib/utils'

function formatReviewDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ProfessionalReviewsList({
  reviews,
  isOwnProfile,
  professionalId,
  reporterAccountId,
  upsertNotification,
  onChanged,
}: {
  reviews: PublicProfessionalReview[]
  isOwnProfile: boolean
  professionalId: string
  reporterAccountId?: string | null
  upsertNotification: (draft: NotificationDraft) => void
  onChanged?: () => void
}) {
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [reportFor, setReportFor] = useState<string | null>(null)
  const [reportReason, setReportReason] =
    useState<ProfessionalReviewReportReason>('spam')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (reviews.length === 0) return null

  const submitReply = () => {
    if (!replyFor) return
    setBusy(true)
    setError('')
    const result = submitProfessionalReviewReply(
      { reviewId: replyFor, professionalId, text: replyText },
      { upsertNotification },
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setReplyFor(null)
    setReplyText('')
    onChanged?.()
  }

  const submitReport = () => {
    if (!reportFor || !reporterAccountId) return
    setBusy(true)
    setError('')
    const result = submitProfessionalReviewReport({
      reviewId: reportFor,
      reporterAccountId,
      reason: reportReason,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setReportFor(null)
    onChanged?.()
  }

  return (
    <div className="space-y-3" data-testid="professional-reviews-list">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="border-t border-[#F0EDE6] pt-3 first:border-t-0 first:pt-0"
          data-testid={`professional-review-${review.id}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#B8934A]" aria-label={`${review.rating} z 5`}>
              {ratingStars(review.rating)}
            </span>
            <span className="text-xs font-medium text-[#7D8B82]">
              {formatReviewDate(review.createdAt)}
            </span>
            {review.verifiedExperience ? (
              <span
                className="rounded-md bg-[#EBF2EE] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2C4A3E]"
                data-testid={`review-verified-experience-${review.id}`}
              >
                Ověřená zkušenost
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-[#4A564F]">
            {review.authorDisplayName}
          </p>
          {review.title ? (
            <p className="mt-1 text-sm font-semibold text-[#191E1B]">{review.title}</p>
          ) : null}
          {review.text ? (
            <p className="mt-1 text-sm leading-relaxed text-[#4A564F]">{review.text}</p>
          ) : null}

          {review.reply ? (
            <div
              className="mt-2 rounded-lg border border-[#E8E4DC] bg-[#F7F5F0] px-3 py-2"
              data-testid={`review-reply-${review.id}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Odpověď profesionála
              </p>
              <p className="mt-1 text-sm text-[#4A564F]">{review.reply.text}</p>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            {isOwnProfile && !review.reply ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-[#2C4A3E] hover:underline"
                data-testid={`review-reply-open-${review.id}`}
                onClick={() => {
                  setReplyFor(review.id)
                  setReplyText('')
                  setError('')
                }}
              >
                Odpovědět
              </button>
            ) : null}
            {reporterAccountId ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-[#7D8B82] hover:underline"
                data-testid={`review-report-open-${review.id}`}
                onClick={() => {
                  setReportFor(review.id)
                  setReportReason('spam')
                  setError('')
                }}
              >
                Nahlásit recenzi
              </button>
            ) : null}
          </div>
        </article>
      ))}

      <Modal
        open={Boolean(replyFor)}
        onClose={() => setReplyFor(null)}
        title="Odpovědět na hodnocení"
      >
        <label className="block text-xs font-semibold text-[#4A564F]">
          Vaše odpověď
          <textarea
            rows={3}
            maxLength={1000}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
            data-testid="review-reply-input"
            placeholder="Děkujeme za návštěvu a zpětnou vazbu."
          />
        </label>
        {error ? <p className="mt-2 text-xs text-[#9B3B3B]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setReplyFor(null)}>
            Zrušit
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !replyText.trim()}
            data-testid="review-reply-submit"
            onClick={submitReply}
          >
            Odeslat odpověď
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(reportFor)}
        onClose={() => setReportFor(null)}
        title="Nahlásit recenzi"
      >
        <p className="text-sm text-[#4A564F]">Vyberte důvod nahlášení.</p>
        <div className="mt-3 space-y-2" data-testid="review-report-reasons">
          {PROFESSIONAL_REVIEW_REPORT_REASONS.map((reason) => (
            <label
              key={reason}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                reportReason === reason
                  ? 'border-[#2C4A3E] bg-[#EBF2EE]'
                  : 'border-[#E8E4DC]',
              )}
            >
              <input
                type="radio"
                name="report-reason"
                checked={reportReason === reason}
                onChange={() => setReportReason(reason)}
                data-testid={`review-report-reason-${reason}`}
              />
              {REVIEW_REPORT_REASON_LABELS[reason]}
            </label>
          ))}
        </div>
        {error ? <p className="mt-2 text-xs text-[#9B3B3B]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setReportFor(null)}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            data-testid="review-report-submit"
            onClick={submitReport}
          >
            Nahlásit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
