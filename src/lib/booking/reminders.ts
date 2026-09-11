/**
 * Booking reminders — backend-ready architecture only.
 * DEMO does NOT schedule or send reminders.
 */

import type { Booking } from './types'

export type BookingReminderKind = 'day_before' | 'hour_before'

export type BookingReminderDraft = {
  bookingId: string
  kind: BookingReminderKind
  /** ISO when reminder should fire (backend scheduler). */
  fireAt: string
  message: string
  /** Always false in DEMO — no delivery occurred. */
  delivered: false
  backendReady: true
}

/**
 * Build a reminder draft for future backend scheduling.
 * Does not persist, send SMS/email/push, or create notifications by itself.
 */
export function buildBookingReminderDraft(
  booking: Booking,
  kind: BookingReminderKind = 'day_before',
): BookingReminderDraft | null {
  if (booking.status !== 'confirmed' && booking.status !== 'requested') return null
  const start = Date.parse(booking.startAt)
  if (Number.isNaN(start)) return null

  const offsetMs = kind === 'day_before' ? 24 * 60 * 60_000 : 60 * 60_000
  const fireAt = new Date(start - offsetMs).toISOString()
  const when = new Date(booking.startAt)
  const time = `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`
  const pro = booking.professionalName ?? 'profesionála'
  const message =
    kind === 'day_before'
      ? `Zítra v ${time} máte rezervaci u ${pro}.`
      : `Za hodinu máte rezervaci u ${pro}.`

  return {
    bookingId: booking.id,
    kind,
    fireAt,
    message,
    delivered: false,
    backendReady: true,
  }
}

/**
 * Stub — DEMO no-op. Future backend will enqueue delivery.
 * Returns the draft without side effects.
 */
export function scheduleBookingReminder(
  booking: Booking,
  kind?: BookingReminderKind,
): BookingReminderDraft | null {
  return buildBookingReminderDraft(booking, kind)
}
