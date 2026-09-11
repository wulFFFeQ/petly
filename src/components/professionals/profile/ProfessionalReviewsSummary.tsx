import {
  breakdownPercent,
  formatReviewAverage,
  ratingStars,
  type ProfessionalReviewSummary,
  type ReviewRating,
} from '../../../lib/reviews'

const STARS: ReviewRating[] = [5, 4, 3, 2, 1]

/** Standalone summary presentation (tests / reuse). */
export function ProfessionalReviewsSummary({
  summary,
}: {
  summary: ProfessionalReviewSummary
}) {
  if (summary.count === 0 || summary.average == null) {
    return (
      <p className="text-sm text-[#7D8B82]" data-testid="professional-reviews-empty">
        Zatím bez hodnocení
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-4" data-testid="professional-reviews-summary">
      <div>
        <p className="text-2xl font-bold tracking-tight text-[#191E1B]">
          <span className="text-[#B8934A]" aria-hidden>
            {ratingStars(Math.round(summary.average))}
          </span>{' '}
          <span data-testid="professional-reviews-average">
            {formatReviewAverage(summary.average)}
          </span>
        </p>
        <p
          className="mt-1 text-xs font-medium text-[#7D8B82]"
          data-testid="professional-reviews-count"
        >
          {summary.count} hodnocení
        </p>
      </div>
      <div className="min-w-[10rem] flex-1 space-y-1.5" data-testid="professional-reviews-breakdown">
        {STARS.map((star) => {
          const pct = breakdownPercent(summary.breakdown, star, summary.count)
          return (
            <div
              key={star}
              className="flex items-center gap-2 text-[11px] text-[#5A6660]"
              data-testid={`professional-reviews-breakdown-${star}`}
            >
              <span className="w-6 shrink-0 tabular-nums">{star} ★</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFECE6]">
                <div
                  className="h-full rounded-full bg-[#B8934A]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums text-[#A3AEA7]">
                {summary.breakdown[star]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
