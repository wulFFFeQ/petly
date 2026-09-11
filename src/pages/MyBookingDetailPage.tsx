import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BookingActions,
  BookingCancelDialog,
  BookingCommunicationSection,
  BookingDetail,
  BookingRescheduleModal,
} from '../components/booking'
import { ReviewBookingModal } from '../components/reviews/ReviewBookingModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { getSelfAccount } from '../lib/account'
import {
  canOwnerCancelByPolicy,
  cancelBookingRequest,
  ensureDefaultBookingPolicy,
  formatOwnerCancelPolicyHint,
  getBooking,
  rescheduleBookingRequest,
} from '../lib/booking'
import { getReviewForBooking } from '../lib/reviews'

export function MyBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { pets, showToast, upsertNotification, syncCalendarEvents } = useApp()
  const self = getSelfAccount()
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [revision, setRevision] = useState(0)

  const booking = useMemo(() => (id ? getBooking(id) : null), [id, revision])
  const existingReview = useMemo(
    () => (booking ? getReviewForBooking(booking.id) : null),
    [booking, revision],
  )
  const policy = useMemo(
    () =>
      booking ? ensureDefaultBookingPolicy(booking.professionalId) : null,
    [booking, revision],
  )
  const cancelCheck = useMemo(() => {
    if (!booking || !policy) return null
    return canOwnerCancelByPolicy(booking, policy)
  }, [booking, policy])

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
  const canReschedule = Boolean(policy?.allowReschedule)
  const opts = { upsertNotification, syncCalendar: syncCalendarEvents }

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
            canReschedule={canReschedule}
            onReschedule={() => setRescheduleOpen(true)}
            onCancel={() => setCancelOpen(true)}
          />
        </div>
      </Card>

      <BookingCommunicationSection
        bookingId={booking.id}
        callerAccountId={self.id}
        role="owner"
        revision={revision}
      />

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

      <BookingCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        role="owner"
        policyHint={
          cancelCheck ? formatOwnerCancelPolicyHint(cancelCheck) : null
        }
        busy={busy}
        onConfirm={({ reason }) => {
          setBusy(true)
          const result = cancelBookingRequest(
            booking.id,
            { kind: 'owner', accountId: self.id },
            opts,
            reason ? { reason } : undefined,
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
      />

      <BookingRescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        booking={booking}
        busy={busy}
        onConfirm={(newStartAt) => {
          setBusy(true)
          const result = rescheduleBookingRequest(
            {
              bookingId: booking.id,
              newStartAt,
              actor: { kind: 'owner', accountId: self.id },
            },
            opts,
          )
          setBusy(false)
          setRescheduleOpen(false)
          if (!result.ok) {
            showToast('Přesun se nezdařil', result.message, 'error')
            return
          }
          showToast('Rezervace přesunuta', 'Nový termín je uložen.', 'success')
          setRevision((r) => r + 1)
        }}
      />
    </div>
  )
}
