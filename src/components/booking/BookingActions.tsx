import { Button } from '../ui/Button'
import type { Booking } from '../../lib/booking'

export function BookingActions({
  booking,
  role,
  onConfirm,
  onDecline,
  onCancel,
  onComplete,
  onNoShow,
  onReschedule,
  busy,
  canComplete = true,
  canNoShow = false,
  canReschedule = false,
}: {
  booking: Booking
  role: 'professional' | 'owner'
  onConfirm?: () => void
  onDecline?: () => void
  onCancel?: () => void
  /** Professional only — marks confirmed booking as completed. */
  onComplete?: () => void
  /** Professional only — after start. */
  onNoShow?: () => void
  onReschedule?: () => void
  busy?: boolean
  /** False when before planned start (unless DEMO override). */
  canComplete?: boolean
  canNoShow?: boolean
  canReschedule?: boolean
}) {
  const canConfirm = role === 'professional' && booking.status === 'requested'
  const canDecline = role === 'professional' && booking.status === 'requested'
  const showComplete =
    role === 'professional' && booking.status === 'confirmed' && onComplete
  const showNoShow =
    role === 'professional' && booking.status === 'confirmed' && canNoShow && onNoShow
  const canCancel =
    (booking.status === 'requested' || booking.status === 'confirmed') &&
    (role === 'professional' || role === 'owner')
  const showReschedule =
    canReschedule &&
    (booking.status === 'requested' || booking.status === 'confirmed') &&
    onReschedule

  if (
    !canConfirm &&
    !canDecline &&
    !canCancel &&
    !showComplete &&
    !showNoShow &&
    !showReschedule
  ) {
    return null
  }

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
      {showComplete ? (
        <Button
          variant="primary"
          size="sm"
          disabled={busy || !canComplete}
          data-testid="booking-complete"
          title={
            !canComplete
              ? 'Dokončit lze až po začátku plánovaného termínu'
              : undefined
          }
          onClick={onComplete}
        >
          Dokončit rezervaci
        </Button>
      ) : null}
      {showNoShow ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          data-testid="booking-no-show"
          onClick={onNoShow}
        >
          Nedostavil/a se
        </Button>
      ) : null}
      {showReschedule ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          data-testid="booking-reschedule"
          onClick={onReschedule}
        >
          Navrhnout nový termín
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
