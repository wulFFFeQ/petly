import type { CalendarEvent } from '../../types'
import type { Booking } from './types'

const ACTIVE_CALENDAR_STATUSES = new Set(['requested', 'payment_pending', 'confirmed'])

function toDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` }
}

export function bookingCalendarEventId(bookingId: string): string {
  return `cal_booking_${bookingId}`
}

export function buildBookingCalendarEvent(
  booking: Booking,
  opts?: { professionalLabel?: string },
): CalendarEvent | null {
  if (!ACTIVE_CALENDAR_STATUSES.has(booking.status)) return null
  const { date, time } = toDateAndTime(booking.startAt)
  const service = booking.serviceName ?? 'Rezervace'
  const pro = opts?.professionalLabel ?? booking.professionalName ?? 'Profesionál'

  return {
    id: bookingCalendarEventId(booking.id),
    title: `Rezervace – ${service}`,
    petName: booking.petName ?? 'Mazlíček',
    petId: booking.petId,
    type: 'booking',
    date,
    time,
    notes: booking.note,
    location: pro,
    sourceBookingId: booking.id,
    professionalId: booking.professionalId,
    bookingStatus: booking.status === 'confirmed' ? 'confirmed' : 'pending',
    reminderEnabled: false,
  }
}

/** Replace/remove derived calendar row for one booking. */
export function syncBookingCalendarEvent(
  events: CalendarEvent[],
  booking: Booking,
  opts?: { professionalLabel?: string },
): CalendarEvent[] {
  const without = events.filter(
    (e) => e.sourceBookingId !== booking.id && e.id !== bookingCalendarEventId(booking.id),
  )
  const next = buildBookingCalendarEvent(booking, opts)
  if (!next) return without
  return [...without, next]
}

export function removeBookingCalendarEvent(
  events: CalendarEvent[],
  bookingId: string,
): CalendarEvent[] {
  return events.filter(
    (e) => e.sourceBookingId !== bookingId && e.id !== bookingCalendarEventId(bookingId),
  )
}

/** Reconcile all booking-derived events from canonical booking list. */
export function reconcileBookingCalendarEvents(
  events: CalendarEvent[],
  bookings: Booking[],
): CalendarEvent[] {
  const bookingIds = new Set(bookings.map((b) => b.id))
  let next = events.filter(
    (e) => !e.sourceBookingId || bookingIds.has(e.sourceBookingId),
  )
  for (const booking of bookings) {
    next = syncBookingCalendarEvent(next, booking)
  }
  // Drop stale booking-type events without matching active booking status
  const activeIds = new Set(
    bookings.filter((b) => ACTIVE_CALENDAR_STATUSES.has(b.status)).map((b) => b.id),
  )
  next = next.filter((e) => {
    if (e.type !== 'booking' && !e.sourceBookingId) return true
    if (!e.sourceBookingId) return e.type !== 'booking'
    return activeIds.has(e.sourceBookingId)
  })
  return next
}
