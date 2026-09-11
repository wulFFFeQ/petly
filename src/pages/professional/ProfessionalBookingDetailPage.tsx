import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookingActions, BookingDetail } from '../../components/booking'
import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'
import {
  cancelBookingRequest,
  confirmBookingRequest,
  declineBookingRequest,
  getBooking,
} from '../../lib/booking'
import { getActiveSelfProfessionalProfile } from '../../lib/professional/dashboard'

export function ProfessionalBookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast, upsertNotification, syncCalendarEvents } = useApp()
  const profile = getActiveSelfProfessionalProfile()
  const [busy, setBusy] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [revision, setRevision] = useState(0)

  const booking = useMemo(() => (id ? getBooking(id) : null), [id, revision])

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
        <div className="mt-4">
          <BookingActions
            booking={booking}
            role="professional"
            busy={busy}
            onConfirm={() =>
              run(() => confirmBookingRequest(booking.id, profile.id, opts))
            }
            onDecline={() =>
              run(() => declineBookingRequest(booking.id, profile.id, opts))
            }
            onCancel={() => setCancelOpen(true)}
          />
        </div>
      </Card>

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
            data-testid="booking-cancel-confirm"
            disabled={busy}
            onClick={() => {
              setCancelOpen(false)
              run(() =>
                cancelBookingRequest(
                  booking.id,
                  { kind: 'professional', professionalId: profile.id },
                  opts,
                  reason.trim() || undefined,
                ),
              )
            }}
          >
            Ano, zrušit
          </Button>
        </div>
      </Modal>
    </div>
  )
}
