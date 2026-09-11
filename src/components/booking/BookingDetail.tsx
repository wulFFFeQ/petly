import { Link } from 'react-router-dom'
import type { Booking } from '../../lib/booking'
import { formatServicePrice } from '../../lib/booking'
import type { Pet } from '../../types'
import { Avatar } from '../ui/Avatar'
import { BookingStatusBadge } from './BookingStatusBadge'

const PET_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="%23E8E4DC"><rect width="80" height="80" rx="40"/><circle cx="40" cy="34" r="14" fill="%23A3AEA7"/><ellipse cx="40" cy="62" rx="22" ry="14" fill="%23A3AEA7"/></svg>',
  )

function durationLabel(startAt: string, endAt: string): string {
  const mins = Math.round((Date.parse(endAt) - Date.parse(startAt)) / 60_000)
  if (!Number.isFinite(mins) || mins <= 0) return '—'
  return `${mins} min`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function BookingDetail({
  booking,
  showOwner = true,
  pet,
  professionalHref,
}: {
  booking: Booking
  showOwner?: boolean
  /** Optional pet for photo — never attach health/chip. */
  pet?: Pick<Pet, 'id' | 'name' | 'image' | 'type' | 'breed'> | null
  professionalHref?: string
}) {
  return (
    <div className="space-y-5" data-testid="booking-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A3AEA7]">
            Rezervace
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#191E1B]">
            {booking.serviceName ?? 'Služba'}
          </h2>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <section className="space-y-1">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Profesionál
        </h3>
        {professionalHref ? (
          <Link
            to={professionalHref}
            className="text-sm font-semibold text-[#2C4A3E] hover:underline"
            data-testid="booking-detail-professional-link"
          >
            {booking.professionalName ?? 'Profesionál'}
          </Link>
        ) : (
          <p className="text-sm font-semibold text-[#191E1B]">
            {booking.professionalName ?? 'Profesionál'}
          </p>
        )}
      </section>

      <section className="space-y-1">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Služba
        </h3>
        <p className="text-sm font-semibold text-[#191E1B]">
          {booking.serviceName ?? 'Služba'}
        </p>
        <p className="text-xs text-[#7D8B82]">
          {durationLabel(booking.startAt, booking.endAt)} ·{' '}
          {formatServicePrice(booking.price, booking.currency)}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Mazlíček
        </h3>
        <div className="flex items-center gap-3">
          <Avatar
            src={pet?.image || PET_PLACEHOLDER}
            alt={booking.petName ?? pet?.name ?? 'Mazlíček'}
            size="md"
          />
          <div>
            <p className="text-sm font-semibold text-[#191E1B]">
              {booking.petName ?? pet?.name ?? 'Mazlíček'}
            </p>
            {pet?.type || pet?.breed ? (
              <p className="text-xs text-[#7D8B82]">
                {[pet?.type, pet?.breed].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {showOwner ? (
        <section className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            Majitel
          </h3>
          <p className="text-sm text-[#4A564F]">
            {booking.ownerDisplayName ?? 'Majitel'}
          </p>
        </section>
      ) : null}

      <section className="space-y-1">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Termín
        </h3>
        <p className="text-sm font-semibold text-[#191E1B]">{formatDate(booking.startAt)}</p>
        <p className="text-xs text-[#4A564F]">
          {formatTime(booking.startAt)}
          {booking.endAt ? ` – ${formatTime(booking.endAt)}` : ''}
        </p>
      </section>

      {booking.note ? (
        <section className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            Poznámka
          </h3>
          <p className="text-sm text-[#4A564F]">{booking.note}</p>
        </section>
      ) : null}

      {booking.cancellationReason ? (
        <section className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
            Důvod zrušení
          </h3>
          <p className="text-sm text-[#4A564F]">{booking.cancellationReason}</p>
        </section>
      ) : null}

      <p className="text-[10px] leading-relaxed text-[#A3AEA7]">
        Rezervace nesdílí zdravotní data ani soukromé kontakty. Pro přístup k záznamům
        použijte samostatné propojení.
      </p>
    </div>
  )
}
