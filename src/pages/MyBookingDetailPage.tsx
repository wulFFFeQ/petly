import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookingActions, BookingDetail } from '../components/booking'
import { ReviewBookingModal } from '../components/reviews/ReviewBookingModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { getSelfAccount } from '../lib/account'
import { cancelBookingRequest, getBooking } from '../lib/booking'
import { getReviewForBooking } from '../lib/reviews'

export function MyBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pets, showToast, upsertNotification, syncCalendarEvents } = useApp()
  const self = getSelfAccount()
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [revision, setRevision] = useState(0)

  const booking = useMemo(() => (id ? getBooking(id) : null), [id, revision])
  const existingReview = useMemo(
    () => (booking ? getReviewForBooking(booking.id) : null),
    [booking, revision],
  )

  if (!self || !booking || booking.ownerAccountId !== self.id) {
    return (
      <Card
        variant="elevated"
        className="mx-auto max-w-lg"
        data-testid="my-booking-denied"
      >
        <p className="text-sm font-bold text-[#191E1B]">Rezervace nenalezena</p>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Tato rezervace neexistuje nebo k ní nemáte přístup.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/bookings')}
        >
          Zpět na rezervace
        </Button>
      </Card>
    )
  }

  const pet = pets.find((p) => p.id === booking.petId) ?? null
  const canReview = booking.status === 'completed' && !existingReview

  return (
    <div
      className="mx-auto max-w-lg space-y-5 pb-10"
      data-testid="my-booking-detail-page"
    >
      <Link
        to="/bookings"
        className="inline-flex text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
      >
        ← Moje rezervace
      </Link>

      <Card variant="elevated">
        <BookingDetail
          booking={booking}
          showOwner={false}
          pet={pet}
          professionalHref={`/professionals/${booking.professionalId}`}
        />
        <div className="mt-5">
          <BookingActions
            booking={booking}
            role="owner"
            busy={busy}
            onCancel={() => setCancelOpen(true)}
          />
        </div>
      </Card>

      {booking.status === 'completed' ? (
        <Card variant="elevated" data-testid="booking-review-cta">
          {canReview ? (
            <>
              <p className="text-sm font-bold text-[#191E1B]">Jak jste byli spokojeni?</p>
              <p className="mt-1 text-xs text-[#7D8B82]">
                Sdílejte ověřenou zkušenost z dokončené rezervace.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                data-testid="booking-review-open"
                onClick={() => setReviewOpen(true)}
              >
                Ohodnotit službu
              </Button>
            </>
          ) : (
            <p
              className="text-sm font-semibold text-[#4A564F]"
              data-testid="booking-review-already"
            >
              Hodnocení již bylo přidáno.
            </p>
          )}
        </Card>
      ) : null}

      <ReviewBookingModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        booking={booking}
        authorAccountId={self.id}
        upsertNotification={upsertNotification}
        onPublished={() => {
          showToast('Hodnocení publikováno', 'Děkujeme za zpětnou vazbu.', 'success')
          setRevision((r) => r + 1)
        }}
      />

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Zrušit rezervaci?">
        <p className="text-sm text-[#4A564F]">
          Opravdu chcete tuto rezervaci zrušit?
        </p>
        <label className="mt-3 block text-xs font-semibold text-[#4A564F]">
          Důvod zrušení (volitelné)
          <textarea
            className="mt-1.5 w-full rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm outline-none focus:border-[#2C4A3E]"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-testid="cancel-reason-input"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
            Zpět
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={busy}
            data-testid="booking-cancel-confirm"
            onClick={() => {
              setBusy(true)
              const result = cancelBookingRequest(
                booking.id,
                { kind: 'owner', accountId: self.id },
                { upsertNotification, syncCalendar: syncCalendarEvents },
                reason.trim() || undefined,
              )
              setBusy(false)
              setCancelOpen(false)
              if (!result.ok) {
                showToast('Zrušení se nezdařilo', result.message, 'error')
                return
              }
              showToast('Rezervace zrušena', 'Stav byl aktualizován.', 'info')
              setRevision((r) => r + 1)
            }}
          >
            Ano, zrušit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
