import type { Booking } from '../../lib/booking'
import { formatServicePrice } from '../../lib/booking'
import { BookingStatusBadge } from './BookingStatusBadge'

function formatRange(startAt: string, endAt: string): string {
  const s = new Date(startAt)
  const e = new Date(endAt)
  if (Number.isNaN(s.getTime())) return '—'
  const date = `${s.getDate()}. ${s.getMonth() + 1}. ${s.getFullYear()}`
  const st = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
  const et = Number.isNaN(e.getTime())
    ? ''
    : `–${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`
  return `${date} · ${st}${et}`
}

export function BookingSummary({
  booking,
  compact,
}: {
  booking: Pick<
    Booking,
    | 'serviceName'
    | 'petName'
    | 'professionalName'
    | 'ownerDisplayName'
    | 'startAt'
    | 'endAt'
    | 'status'
    | 'price'
    | 'currency'
    | 'note'
  >
  compact?: boolean
}) {
  return (
    <div
      className={compact ? 'space-y-1' : 'space-y-2'}
      data-testid="booking-summary"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#191E1B]">
          {booking.serviceName ?? 'Služba'}
        </p>
        <BookingStatusBadge status={booking.status} />
      </div>
      <p className="text-xs text-[#4A564F]">{formatRange(booking.startAt, booking.endAt)}</p>
      {booking.petName ? (
        <p className="text-xs text-[#7D8B82]">Mazlíček: {booking.petName}</p>
      ) : null}
      {booking.professionalName ? (
        <p className="text-xs text-[#7D8B82]">Profesionál: {booking.professionalName}</p>
      ) : null}
      {booking.ownerDisplayName ? (
        <p className="text-xs text-[#7D8B82]">Majitel: {booking.ownerDisplayName}</p>
      ) : null}
      <p className="text-xs text-[#4A564F]">
        {formatServicePrice(booking.price, booking.currency)}
      </p>
      {!compact && booking.note ? (
        <p className="text-xs text-[#7D8B82]">Poznámka: {booking.note}</p>
      ) : null}
    </div>
  )
}
