import { CheckCircle2 } from 'lucide-react'
import type { Booking } from '../../lib/booking'
import { BookingSummary } from './BookingSummary'
import { Button } from '../ui/Button'

export function BookingConfirmation({
  booking,
  onClose,
}: {
  booking: Booking
  onClose: () => void
}) {
  return (
    <div className="space-y-4 text-center" data-testid="booking-confirmation">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF2EE]">
        <CheckCircle2 className="text-[#2C4A3E]" size={28} />
      </div>
      <div>
        <h3 className="text-base font-bold text-[#191E1B]">
          Žádost o rezervaci byla odeslána.
        </h3>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Profesionál žádost potvrdí nebo odmítne. Stav uvidíte v kalendáři a notifikacích.
        </p>
      </div>
      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-3 text-left">
        <BookingSummary booking={booking} />
      </div>
      <Button variant="primary" className="w-full" onClick={onClose} data-testid="booking-confirmation-close">
        Hotovo
      </Button>
    </div>
  )
}
