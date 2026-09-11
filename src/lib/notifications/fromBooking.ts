import type { Booking } from '../booking/types'
import type { ProfessionalProfile } from '../../types/professional'
import type { NotificationDraft } from './model'

export type BookingNotificationEvent =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'reminder'

export type BookingNotificationContext = {
  booking: Booking
  event: BookingNotificationEvent
  /** Professional profile for recipient resolution / display. */
  professional?: Pick<ProfessionalProfile, 'id' | 'accountId' | 'displayName'> | null
  /** When cancelling: who initiated. */
  cancelledBy?: 'owner' | 'professional'
}

const FORBIDDEN_PAYLOAD_PATTERNS = [
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /medication/i,
  /vaccination/i,
  /healthRecord/i,
  /documentContent/i,
  /password/i,
  /licenseNumber/i,
]

const SAFE_PET = 'mazlíček'
const SAFE_PRO = 'Profesionál'
const SAFE_SERVICE = 'služba'

function safeDisplayName(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed) return fallback
  if (FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(trimmed))) return fallback
  return trimmed
}

export function bookingDedupeKey(event: BookingNotificationEvent, bookingId: string): string {
  return `booking:${event}:${bookingId}`
}

export function isSafeBookingNotificationPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true
  const text = JSON.stringify(payload)
  return !FORBIDDEN_PAYLOAD_PATTERNS.some((re) => re.test(text))
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const date = `${d.getDate()}. ${d.getMonth() + 1}.`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

/**
 * Privacy-safe draft for a booking lifecycle event.
 * Returns null when recipient cannot be resolved.
 */
export function buildBookingNotification(
  ctx: BookingNotificationContext,
): NotificationDraft | null {
  const { booking, event, professional } = ctx
  const petName = safeDisplayName(booking.petName, SAFE_PET)
  const proName = safeDisplayName(
    professional?.displayName ?? booking.professionalName,
    SAFE_PRO,
  )
  const serviceName = safeDisplayName(booking.serviceName, SAFE_SERVICE)
  const when = formatWhen(booking.startAt)

  let recipientAccountId: string | undefined
  let type: NotificationDraft['type']
  let title: string
  let message: string
  let href: string

  switch (event) {
    case 'requested': {
      recipientAccountId = professional?.accountId
      type = 'booking_requested'
      title = 'Nová žádost o rezervaci'
      message = when
        ? `${petName} · ${serviceName} · ${when}`
        : `${petName} · ${serviceName}`
      href = `/professional/bookings/${booking.id}`
      break
    }
    case 'confirmed': {
      recipientAccountId = booking.ownerAccountId
      type = 'booking_confirmed'
      title = 'Rezervace potvrzena'
      message = when
        ? `${proName} potvrdil/a ${serviceName} (${when}).`
        : `${proName} potvrdil/a ${serviceName}.`
      href = `/bookings/${booking.id}`
      break
    }
    case 'declined': {
      recipientAccountId = booking.ownerAccountId
      type = 'booking_declined'
      title = 'Rezervace odmítnuta'
      message = `${proName} odmítl/a žádost o ${serviceName}.`
      href = `/bookings/${booking.id}`
      break
    }
    case 'cancelled': {
      const byPro = ctx.cancelledBy === 'professional'
      recipientAccountId = byPro ? booking.ownerAccountId : professional?.accountId
      type = 'booking_cancelled'
      title = 'Rezervace zrušena'
      message = byPro
        ? `${proName} zrušil/a rezervaci ${serviceName}.`
        : `Majitel zrušil rezervaci ${serviceName}.`
      href = byPro
        ? `/bookings/${booking.id}`
        : `/professional/bookings/${booking.id}`
      break
    }
    case 'completed': {
      recipientAccountId = booking.ownerAccountId
      type = 'booking_completed'
      title = 'Rezervace dokončena'
      message = `${serviceName} u ${proName} byla dokončena.`
      href = `/bookings/${booking.id}`
      break
    }
    case 'reminder': {
      // DEMO: builder exists; scheduler must call explicitly — never auto-fire.
      recipientAccountId = booking.ownerAccountId
      type = 'booking_reminder'
      title = 'Připomínka rezervace'
      message = when
        ? `Blíží se rezervace ${serviceName} u ${proName} (${when}).`
        : `Blíží se rezervace ${serviceName} u ${proName}.`
      href = `/bookings/${booking.id}`
      break
    }
    default:
      return null
  }

  if (!recipientAccountId) return null

  return {
    type,
    title,
    message,
    priority: event === 'requested' ? 'important' : 'normal',
    dedupeKey: bookingDedupeKey(event, booking.id),
    sourceEventId: bookingDedupeKey(event, booking.id),
    petId: booking.petId,
    petName,
    href,
    recipientAccountId,
    relatedProfessionalId: booking.professionalId,
    relatedBookingId: booking.id,
  }
}

export function emitBookingNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: BookingNotificationContext,
): NotificationDraft | null {
  const draft = buildBookingNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}
