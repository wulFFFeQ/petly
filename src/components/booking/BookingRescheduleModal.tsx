import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { BookingCalendar } from './BookingCalendar'
import {
  getAvailableSlotsForService,
  type Booking,
  type TimeSlot,
} from '../../lib/booking'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function BookingRescheduleModal({
  open,
  onClose,
  booking,
  busy,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  booking: Booking
  busy?: boolean
  onConfirm: (newStartAt: string) => void
}) {
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [slot, setSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedDate(todayIso())
    setSlot(null)
  }, [open, booking.id])

  const slots = useMemo(() => {
    if (!open) return []
    return getAvailableSlotsForService(
      booking.professionalId,
      booking.serviceId,
      selectedDate,
    )
  }, [open, booking.professionalId, booking.serviceId, selectedDate])

  return (
    <Modal open={open} onClose={onClose} title="Navrhnout nový termín">
      <p className="text-xs text-[#7D8B82]" data-testid="reschedule-current">
        Současný termín: {formatWhen(booking.startAt)}
      </p>

      <div className="mt-3">
        <BookingCalendar
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d)
            setSlot(null)
          }}
          slots={slots}
          selectedStartAt={slot?.startAt ?? null}
          onSelectSlot={setSlot}
        />
      </div>

      {slot ? (
        <p className="mt-3 text-sm font-semibold text-[#191E1B]" data-testid="reschedule-selected">
          Nový termín: {formatWhen(slot.startAt)}
        </p>
      ) : (
        <p className="mt-3 text-xs text-[#7D8B82]">Vyberte dostupný termín.</p>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zpět
        </Button>
        <Button
          variant="primary"
          size="sm"
          data-testid="booking-reschedule-confirm"
          disabled={busy || !slot}
          onClick={() => {
            if (!slot) return
            onConfirm(slot.startAt)
          }}
        >
          Přesunout rezervaci
        </Button>
      </div>
    </Modal>
  )
}
