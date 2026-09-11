/**
 * UI-facing booking session helpers: mutate domain + notify + return calendar sync payload.
 * Calendar persistence stays in AppContext (injected callback).
 */

import { loadProfessionalProfiles } from '../professional/storage'
import {
  emitBookingNotification,
  type NotificationDraft,
} from '../notifications'
import {
  cancelBooking as cancelBookingDomain,
  confirmBooking as confirmBookingDomain,
  createBooking as createBookingDomain,
  declineBooking as declineBookingDomain,
  completeBooking as completeBookingDomain,
  type CancelBookingActor,
  type CreateBookingInput,
} from './bookings'
import { syncBookingCalendarEvent, removeBookingCalendarEvent } from './calendarSync'
import { getProfessionalService } from './services'
import { getAvailability, getAvailabilityExceptions } from './availability'
import { getAvailableSlots as getAvailableSlotsPure } from './slots'
import { loadBookings } from './storage'
import type { Booking, BookingResult, TimeSlot } from './types'
import type { CalendarEvent } from '../../types'

export type BookingUpsertNotification = (draft: NotificationDraft) => void
export type BookingCalendarSync = (fn: (events: CalendarEvent[]) => CalendarEvent[]) => void

function resolveProfessional(professionalId: string) {
  return loadProfessionalProfiles().find((p) => p.id === professionalId) ?? null
}

export function getAvailableSlotsForService(
  professionalId: string,
  serviceId: string,
  date: string,
  now?: Date,
): TimeSlot[] {
  const service = getProfessionalService(serviceId)
  if (!service) return []
  return getAvailableSlotsPure({
    professionalId,
    service,
    date,
    availability: getAvailability(professionalId),
    exceptions: getAvailabilityExceptions(professionalId),
    bookings: loadBookings(),
    now,
  })
}

function applyCalendar(
  sync: BookingCalendarSync | undefined,
  booking: Booking,
  remove = false,
) {
  if (!sync) return
  sync((events) =>
    remove
      ? removeBookingCalendarEvent(events, booking.id)
      : syncBookingCalendarEvent(events, booking),
  )
}

export function requestBooking(
  input: CreateBookingInput,
  opts: {
    upsertNotification: BookingUpsertNotification
    syncCalendar?: BookingCalendarSync
  },
): BookingResult<Booking> {
  const result = createBookingDomain(input)
  if (!result.ok) return result

  const professional = resolveProfessional(result.value.professionalId)
  emitBookingNotification(opts.upsertNotification, {
    booking: result.value,
    event: 'requested',
    professional,
  })
  applyCalendar(opts.syncCalendar, result.value)
  return result
}

export function confirmBookingRequest(
  bookingId: string,
  actorProfessionalId: string,
  opts: {
    upsertNotification: BookingUpsertNotification
    syncCalendar?: BookingCalendarSync
  },
): BookingResult<Booking> {
  const result = confirmBookingDomain(bookingId, actorProfessionalId)
  if (!result.ok) return result
  const professional = resolveProfessional(result.value.professionalId)
  emitBookingNotification(opts.upsertNotification, {
    booking: result.value,
    event: 'confirmed',
    professional,
  })
  applyCalendar(opts.syncCalendar, result.value)
  return result
}

export function declineBookingRequest(
  bookingId: string,
  actorProfessionalId: string,
  opts: {
    upsertNotification: BookingUpsertNotification
    syncCalendar?: BookingCalendarSync
  },
  reason?: string,
): BookingResult<Booking> {
  const result = declineBookingDomain(bookingId, actorProfessionalId, reason)
  if (!result.ok) return result
  const professional = resolveProfessional(result.value.professionalId)
  emitBookingNotification(opts.upsertNotification, {
    booking: result.value,
    event: 'declined',
    professional,
  })
  applyCalendar(opts.syncCalendar, result.value, true)
  return result
}

export function cancelBookingRequest(
  bookingId: string,
  actor: CancelBookingActor,
  opts: {
    upsertNotification: BookingUpsertNotification
    syncCalendar?: BookingCalendarSync
  },
  reason?: string,
): BookingResult<Booking> {
  const result = cancelBookingDomain(bookingId, actor, reason)
  if (!result.ok) return result
  const professional = resolveProfessional(result.value.professionalId)
  emitBookingNotification(opts.upsertNotification, {
    booking: result.value,
    event: 'cancelled',
    professional,
    cancelledBy: actor.kind,
  })
  applyCalendar(opts.syncCalendar, result.value, true)
  return result
}

export function completeBookingRequest(
  bookingId: string,
  actorProfessionalId: string,
  opts: {
    upsertNotification: BookingUpsertNotification
    syncCalendar?: BookingCalendarSync
  },
): BookingResult<Booking> {
  const result = completeBookingDomain(bookingId, actorProfessionalId)
  if (!result.ok) return result
  const professional = resolveProfessional(result.value.professionalId)
  emitBookingNotification(opts.upsertNotification, {
    booking: result.value,
    event: 'completed',
    professional,
  })
  applyCalendar(opts.syncCalendar, result.value, true)
  return result
}
