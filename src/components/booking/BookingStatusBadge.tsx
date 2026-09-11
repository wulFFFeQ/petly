import type { BookingStatus } from '../../lib/booking'
import { Badge } from '../ui/Badge'

const LABELS: Record<BookingStatus, string> = {
  requested: 'Žádost',
  confirmed: 'Potvrzeno',
  declined: 'Odmítnuto',
  cancelled_by_owner: 'Zrušeno majitelem',
  cancelled_by_professional: 'Zrušeno profesionálem',
  completed: 'Dokončeno',
  no_show: 'Nedostavil se',
}

const VARIANTS: Record<
  BookingStatus,
  'gold' | 'success' | 'danger' | 'warning' | 'default' | 'primary'
> = {
  requested: 'gold',
  confirmed: 'success',
  declined: 'danger',
  cancelled_by_owner: 'default',
  cancelled_by_professional: 'default',
  completed: 'primary',
  no_show: 'warning',
}

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  return (
    <span data-testid={`booking-status-${status}`}>
      <Badge variant={VARIANTS[status]} size="sm" className={className}>
        {LABELS[status]}
      </Badge>
    </span>
  )
}

export function bookingStatusLabel(status: BookingStatus): string {
  return LABELS[status]
}
