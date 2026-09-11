import { Link } from 'react-router-dom'
import type { Booking } from '../../lib/booking'
import { bookingServiceName } from '../../lib/booking'
import { BookingStatusBadge } from './BookingStatusBadge'

function formatShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()}. ${d.getMonth() + 1}. · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function BookingList({
  bookings,
  emptyLabel = 'Žádné rezervace',
  linkTo,
}: {
  bookings: Booking[]
  emptyLabel?: string
  linkTo?: (b: Booking) => string
}) {
  if (bookings.length === 0) {
    return (
      <p className="text-xs text-[#7D8B82]" data-testid="booking-list-empty">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="space-y-2" data-testid="booking-list">
      {bookings.map((b) => {
        const inner = (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#191E1B]">
                {bookingServiceName(b)}
              </p>
              <p className="text-[11px] text-[#7D8B82]">
                {formatShort(b.startAt)}
                {b.petName ? ` · ${b.petName}` : ''}
                {b.ownerDisplayName ? ` · ${b.ownerDisplayName}` : ''}
              </p>
            </div>
            <BookingStatusBadge status={b.status} />
          </div>
        )
        const href = linkTo?.(b)
        return (
          <li key={b.id} data-testid={`booking-list-item-${b.id}`}>
            {href ? (
              <Link to={href} className="block transition-opacity hover:opacity-90">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ul>
  )
}
