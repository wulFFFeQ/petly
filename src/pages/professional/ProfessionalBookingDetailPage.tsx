import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BookingActions,
  BookingCancelDialog,
  BookingCommunicationSection,
  BookingDetail,
  BookingRescheduleModal,
} from '../../components/booking'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'
import {
  DEMO_ALLOW_EARLY_COMPLETE_KEY,
  cancelBookingRequest,
  completeBookingRequest,
  confirmBookingRequest,
  declineBookingRequest,
  ensureDefaultBookingPolicy,
  getBooking,
  markNoShowRequest,
  rescheduleBookingRequest,
} from '../../lib/booking'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'

function isDemoEarlyComplete(): boolean {
  try {
    return localStorage.getItem(DEMO_ALLOW_EARLY_COMPLETE_KEY) === '1'
  } catch {
    return false
  }
}

export function ProfessionalBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast, upsertNotification, syncCalendarEvents } = useApp()
  const profile = getActiveSelfProfessionalProfile()
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [revision, setRevision] = useState(0)

  const booking = useMemo(() => (id ? getBooking(id) : null), [id, revision])
  const policy = useMemo(
    () => (profile ? ensureDefaultBookingPolicy(profile.id) : null),
    [profile, revision],
  )

  if (!profile) {
    return (
      <EmptyState
        title="Chybí profesionální profil"
        description="Detail rezervace vyžaduje profesionální účet."
        ctaTo="/professional/profile"
        ctaLabel="Profil"
      />
    )
  }

  if (!booking || booking.professionalId !== profile.id) {
    return (
      <Card variant="elevated" data-testid="booking-detail-denied">
        <p className="text-sm font-bold text-[#191E1B]">Rezervace nenalezena</p>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Tato rezervace neexistuje nebo k ní nemáte přístup.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => navigate('/professional/bookings')}
        >
          Zpět na rezervace
        </Button>
      </Card>
    )
  }

  const opts = { upsertNotification, syncCalendar: syncCalendarEvents }
  const nowMs = Date.now()
  const startMs = Date.parse(booking.startAt)
  const afterStart = Number.isFinite(startMs) && nowMs >= startMs
  const canComplete = afterStart || isDemoEarlyComplete()
  const canNoShow = afterStart
  const canReschedule = Boolean(policy?.allowReschedule)

  const run = (fn: () => ReturnType<typeof confirmBookingRequest>) => {
    setBusy(true)
    const result = fn()
    setBusy(false)
    if (!result.ok) {
      showToast('Akce se nezdařila', result.message, 'error')
      return
    }
    showToast('Uloženo', 'Stav rezervace byl aktualizován.', 'success')
    setRevision((r) => r + 1)
  }

  return (
    <div className="space-y-5 pb-8" data-testid="professional-booking-detail-page">
      <Link
        to="/professional/bookings"
        className="inline-flex text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
      >
        ← Rezervace
      </Link>

      <Card variant="elevated">
        {booking.status === 'requested' ? (
          <p
            className="mb-3 text-xs font-semibold text-[#B8934A]"
            data-testid="new-booking-request-banner"
          >
            Nová žádost o rezervaci
          </p>
        ) : null}
        <BookingDetail booking={booking} showOwner />
        {booking.originalStartAt && booking.rescheduledAt ? (
          <p className="mt-2 text-[11px] text-[#7D8B82]" data-testid="booking-reschedule-history">
            Původní termín zachován v historii.
          </p>
        ) : null}
        <div className="mt-4">
          <BookingActions
            booking={booking}
            role="professional"
            busy={busy}
            canComplete={canComplete}
            canNoShow={canNoShow}
            canReschedule={canReschedule}
            onConfirm={() =>
              run(() => confirmBookingRequest(booking.id, profile.id, opts))
            }
            onDecline={() =>
              run(() => declineBookingRequest(booking.id, profile.id, opts))
            }
            onComplete={() =>
              run(() => completeBookingRequest(booking.id, profile.id, opts))
            }
            onNoShow={() =>
              run(() => markNoShowRequest(booking.id, profile.id, opts))
            }
            onReschedule={() => setRescheduleOpen(true)}
            onCancel={() => setCancelOpen(true)}
          />
        </div>
      </Card>

      <BookingCommunicationSection
        bookingId={booking.id}
        callerAccountId={profile.accountId}
        role="professional"
        revision={revision}
      />

      <BookingCancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        role="professional"
        busy={busy}
        onConfirm={({ reasonCode, reason }) => {
          setCancelOpen(false)
          run(() =>
            cancelBookingRequest(
              booking.id,
              { kind: 'professional', professionalId: profile.id },
              opts,
              { reasonCode, reason },
            ),
          )
        }}
      />

      <BookingRescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        booking={booking}
        busy={busy}
        onConfirm={(newStartAt) => {
          setRescheduleOpen(false)
          run(() =>
            rescheduleBookingRequest(
              {
                bookingId: booking.id,
                newStartAt,
                actor: { kind: 'professional', professionalId: profile.id },
              },
              opts,
            ),
          )
        }}
      />
    </div>
  )
}
