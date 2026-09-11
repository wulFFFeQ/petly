import { Button } from '../ui/Button'
import type { Booking } from '../../lib/booking'

export function BookingActions({
  booking,
  role,
  onConfirm,
  onDecline,
  onCancel,
  onComplete,
  busy,
}: {
  booking: Booking
  role: 'professional' | 'owner'
  onConfirm?: () => void
  onDecline?: () => void
  onCancel?: () => void
  /** Professional only — marks confirmed booking as completed (existing completeBooking API). */
  onComplete?: () => void
  busy?: boolean
}) {
  const canConfirm = role === 'professional' && booking.status === 'requested'
  const canDecline = role === 'professional' && booking.status === 'requested'
  const canComplete = role === 'professional' && booking.status === 'confirmed'
  const canCancel =
    (booking.status === 'requested' || booking.status === 'confirmed') &&
    (role === 'professional' || role === 'owner')

  if (!canConfirm && !canDecline && !canCancel && !canComplete) return null

  const cancelLabel =
    role === 'owner' && booking.status === 'requested'
      ? 'Zrušit žádost'
      : 'Zrušit rezervaci'

  return (
    <div className="flex flex-wrap gap-2" data-testid="booking-actions">
      {canConfirm && onConfirm ? (
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          data-testid="booking-confirm"
          onClick={onConfirm}
        >
          Potvrdit
        </Button>
      ) : null}
      {canDecline && onDecline ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          data-testid="booking-decline"
          onClick={onDecline}
        >
          Odmítnout
        </Button>
      ) : null}
      {canComplete && onComplete ? (
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          data-testid="booking-complete"
          onClick={onComplete}
        >
          Dokončit
        </Button>
      ) : null}
      {canCancel && onCancel ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          data-testid="booking-cancel"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  )
}
