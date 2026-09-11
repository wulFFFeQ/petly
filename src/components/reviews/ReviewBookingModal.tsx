import { useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'
import { submitProfessionalReview } from '../../lib/reviews'
import type { Booking } from '../../lib/booking'
import type { NotificationDraft } from '../../lib/notifications'

type Step = 'rating' | 'text' | 'summary' | 'done'

export function ReviewBookingModal({
  open,
  onClose,
  booking,
  authorAccountId,
  upsertNotification,
  onPublished,
}: {
  open: boolean
  onClose: () => void
  booking: Booking
  authorAccountId: string
  upsertNotification: (draft: NotificationDraft) => void
  onPublished?: () => void
}) {
  const [step, setStep] = useState<Step>('rating')
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setStep('rating')
    setRating(0)
    setTitle('')
    setText('')
    setBusy(false)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const publish = () => {
    if (rating < 1 || rating > 5) {
      setError('Vyberte hodnocení 1–5 hvězdiček.')
      setStep('rating')
      return
    }
    setBusy(true)
    setError('')
    const result = submitProfessionalReview(
      {
        bookingId: booking.id,
        authorAccountId,
        rating,
        title: title.trim() || undefined,
        text: text.trim() || undefined,
      },
      { upsertNotification },
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setStep('done')
    onPublished?.()
  }

  const serviceLabel = booking.serviceName ?? 'službu'
  const proLabel = booking.professionalName ?? 'profesionála'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === 'done' ? 'Hotovo' : 'Ohodnotit službu'}
      subtitle={
        step === 'done'
          ? undefined
          : `${serviceLabel} · ${proLabel}`
      }
      maxWidth="md"
    >
      <div data-testid="review-booking-modal">
        {step === 'rating' ? (
          <div className="space-y-4">
            <p className="text-sm text-[#4A564F]">Jak jste byli spokojeni?</p>
            <div
              className="flex items-center justify-center gap-1"
              data-testid="review-rating-stars"
              role="group"
              aria-label="Hodnocení 1 až 5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  data-testid={`review-star-${n}`}
                  aria-label={`${n} hvězdiček`}
                  aria-pressed={rating === n}
                  className={cn(
                    'px-1 text-2xl transition-transform hover:scale-110',
                    n <= rating ? 'text-[#B8934A]' : 'text-[#D5D0C6]',
                  )}
                  onClick={() => setRating(n)}
                >
                  ★
                </button>
              ))}
            </div>
            {error ? (
              <p className="text-xs font-medium text-[#9B3B3B]" data-testid="review-error">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Zrušit
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={rating < 1}
                data-testid="review-step-to-text"
                onClick={() => {
                  setError('')
                  setStep('text')
                }}
              >
                Pokračovat
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'text' ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#4A564F]">
              Nadpis (volitelné)
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
                data-testid="review-title-input"
                placeholder="Stručný souhrn"
              />
            </label>
            <label className="block text-xs font-semibold text-[#4A564F]">
              Vaše zkušenost (volitelné)
              <textarea
                rows={4}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
                data-testid="review-text-input"
                placeholder="Co by měli vědět ostatní majitelé?"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('rating')}>
                Zpět
              </Button>
              <Button
                variant="primary"
                size="sm"
                data-testid="review-step-to-summary"
                onClick={() => setStep('summary')}
              >
                Souhrn
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'summary' ? (
          <div className="space-y-3">
            <p className="text-sm text-[#4A564F]">Zkontrolujte hodnocení před publikací.</p>
            <div
              className="rounded-xl border border-[#E8E4DC] bg-[#F7F5F0] px-4 py-3"
              data-testid="review-summary-preview"
            >
              <p className="text-lg text-[#B8934A]">{'★'.repeat(rating)}</p>
              {title.trim() ? (
                <p className="mt-1 text-sm font-semibold text-[#191E1B]">{title.trim()}</p>
              ) : null}
              {text.trim() ? (
                <p className="mt-1 text-sm text-[#4A564F]">{text.trim()}</p>
              ) : (
                <p className="mt-1 text-xs text-[#A3AEA7]">Bez textového komentáře</p>
              )}
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#7D8B82]">
                Ověřená zkušenost
              </p>
            </div>
            {error ? (
              <p className="text-xs font-medium text-[#9B3B3B]" data-testid="review-error">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('text')}>
                Zpět
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                data-testid="review-publish"
                onClick={publish}
              >
                Publikovat hodnocení
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'done' ? (
          <div className="space-y-4" data-testid="review-thanks">
            <p className="text-sm font-semibold text-[#191E1B]">
              Děkujeme za vaši zpětnou vazbu.
            </p>
            <p className="text-xs text-[#7D8B82]">
              Vaše hodnocení pomáhá ostatním majitelům vybrat spolehlivou péči.
            </p>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" data-testid="review-done-close" onClick={handleClose}>
                Zavřít
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
