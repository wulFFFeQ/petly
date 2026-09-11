import type { TimeSlot } from '../../lib/booking'

function dayLabel(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  })
}

function slotLabel(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Mini date + slot picker for booking flow. */
export function BookingCalendar({
  selectedDate,
  onSelectDate,
  slots,
  selectedStartAt,
  onSelectSlot,
  daysAhead = 14,
}: {
  selectedDate: string
  onSelectDate: (dateIso: string) => void
  slots: TimeSlot[]
  selectedStartAt: string | null
  onSelectSlot: (slot: TimeSlot) => void
  daysAhead?: number
}) {
  const today = new Date()
  const days: string[] = []
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${day}`)
  }

  return (
    <div className="space-y-3" data-testid="booking-calendar">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((date) => {
          const active = date === selectedDate
          return (
            <button
              key={date}
              type="button"
              data-testid={`booking-day-${date}`}
              onClick={() => onSelectDate(date)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
                active
                  ? 'bg-[#2C4A3E] text-white'
                  : 'bg-[#FAF8F5] text-[#4A564F] hover:bg-[#EBF2EE]'
              }`}
            >
              {dayLabel(date)}
            </button>
          )
        })}
      </div>

      {slots.length === 0 ? (
        <p className="text-xs text-[#7D8B82]" data-testid="booking-slots-empty">
          V tento den nejsou volné termíny.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" data-testid="booking-slots">
          {slots.map((slot) => {
            const active = selectedStartAt === slot.startAt
            return (
              <button
                key={slot.startAt}
                type="button"
                data-testid={`booking-time-${slot.startAt}`}
                onClick={() => onSelectSlot(slot)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#B8934A] text-white'
                    : 'border border-[#E8E4DC] bg-white text-[#2C4A3E] hover:border-[#B8934A]'
                }`}
              >
                {slotLabel(slot.startAt)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
