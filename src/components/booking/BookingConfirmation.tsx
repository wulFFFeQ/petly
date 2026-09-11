import { CheckCircle2 } from 'lucide-react'
import type { Booking } from '../../lib/booking'
import { Button } from '../ui/Button'

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '—', time: '—' }
  return {
    date: d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

export function BookingConfirmation({
  booking,
  onViewBooking,
  onBackToProfile,
}: {
  booking: Booking
  onViewBooking: () => void
  onBackToProfile?: () => void
}) {
  const when = formatWhen(booking.startAt)

  return (
    <div className="space-y-5 text-center" data-testid="booking-confirmation">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF2EE]">
        <CheckCircle2 className="text-[#2C4A3E]" size={30} strokeWidth={1.75} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#191E1B]">
          Žádost o rezervaci byla odeslána.
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-[#7D8B82]">
          Rezervace bude potvrzena až profesionálem. Termín zatím není definitivní.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-4 text-left">
        <p className="text-sm font-semibold text-[#191E1B]">
          {booking.serviceName ?? 'Služba'}
        </p>
        <p className="text-xs text-[#4A564F]">
          {booking.professionalName ?? 'Profesionál'}
        </p>
        <p className="text-xs text-[#4A564F]">
          {when.date} · {when.time}
        </p>
        {booking.petName ? (
          <p className="text-xs text-[#7D8B82]">Mazlíček: {booking.petName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          className="w-full"
          data-testid="booking-confirmation-view"
          onClick={onViewBooking}
        >
          Zobrazit rezervaci
        </Button>
        {onBackToProfile ? (
          <Button
            variant="ghost"
            className="w-full"
            data-testid="booking-confirmation-back-profile"
            onClick={onBackToProfile}
          >
            Zpět na profil
          </Button>
        ) : null}
      </div>
    </div>
  )
}
