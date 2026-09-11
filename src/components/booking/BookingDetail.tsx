import type { Booking } from '../../lib/booking'
import { formatServicePrice } from '../../lib/booking'
import { BookingStatusBadge } from './BookingStatusBadge'

function durationLabel(startAt: string, endAt: string): string {
  const mins = Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000)
  if (!Number.isFinite(mins) || mins <= 0) return '—'
  return `${mins} min`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function BookingDetail({
  booking,
  showOwner = true,
}: {
  booking: Booking
  showOwner?: boolean
}) {
  return (
    <div className="space-y-4" data-testid="booking-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#191E1B]">
            {booking.serviceName ?? 'Rezervace'}
          </h2>
          <p className="mt-1 text-xs text-[#7D8B82]">{formatDateTime(booking.startAt)}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            Délka
          </dt>
          <dd className="text-[#4A564F]">{durationLabel(booking.startAt, booking.endAt)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            Mazlíček
          </dt>
          <dd className="text-[#4A564F]">{booking.petName ?? 'Mazlíček'}</dd>
        </div>
        {showOwner ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Majitel
            </dt>
            <dd className="text-[#4A564F]">
              {booking.ownerDisplayName ?? 'Majitel'}
            </dd>
          </div>
        ) : (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Profesionál
            </dt>
            <dd className="text-[#4A564F]">
              {booking.professionalName ?? 'Profesionál'}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            Cena
          </dt>
          <dd className="text-[#4A564F]">
            {formatServicePrice(booking.price, booking.currency)}
          </dd>
        </div>
        {booking.note ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Poznámka
            </dt>
            <dd className="text-[#4A564F]">{booking.note}</dd>
          </div>
        ) : null}
        {booking.cancellationReason ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Důvod zrušení
            </dt>
            <dd className="text-[#4A564F]">{booking.cancellationReason}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-[10px] text-[#A3AEA7]">
        Rezervace nesdílí zdravotní data ani soukromé kontakty. Pro přístup k záznamům
        použijte samostatné propojení.
      </p>
    </div>
  )
}
