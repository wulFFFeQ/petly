/** Booking lifecycle statuses — keep the set small and explicit. */
export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'cancelled_by_owner'
  | 'cancelled_by_professional'
  | 'completed'
  | 'no_show'

export const BOOKING_STATUSES: BookingStatus[] = [
  'requested',
  'confirmed',
  'declined',
  'cancelled_by_owner',
  'cancelled_by_professional',
  'completed',
  'no_show',
]

/** Statuses that occupy a calendar slot (overlap protection). */
export const SLOT_BLOCKING_STATUSES: BookingStatus[] = ['requested', 'confirmed']

export interface Booking {
  id: string
  ownerAccountId: string
  professionalId: string
  serviceId: string
  petId: string
  startAt: string
  endAt: string
  status: BookingStatus
  note?: string
  /** Snapshot for display — never treat as live pet/pro data. */
  serviceName?: string
  petName?: string
  professionalName?: string
  ownerDisplayName?: string
  price?: number
  currency?: string
  /** Idempotency key for duplicate create protection. */
  clientRequestId?: string
  createdAt: string
  updatedAt: string
  cancelledAt?: string
  cancellationReason?: string
  confirmedAt?: string
  completedAt?: string
  declinedAt?: string
}

export interface ProfessionalService {
  id: string
  professionalId: string
  name: string
  description?: string
  durationMinutes: number
  price?: number
  currency?: string
  active: boolean
  bookingEnabled: boolean
  createdAt: string
  updatedAt: string
}

/** 0 = Monday … 6 = Sunday (app week). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface ProfessionalAvailability {
  id: string
  professionalId: string
  weekday: Weekday
  /** HH:mm */
  startTime: string
  /** HH:mm */
  endTime: string
  active: boolean
}

export type AvailabilityExceptionType = 'closed' | 'custom_hours'

/** Extension point — DEMO UI does not edit these yet. */
export interface ProfessionalAvailabilityException {
  id: string
  professionalId: string
  /** YYYY-MM-DD */
  date: string
  startTime?: string
  endTime?: string
  type: AvailabilityExceptionType
}

export interface TimeSlot {
  startAt: string
  endAt: string
}

export type BookingErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'slot_unavailable'
  | 'service_disabled'
  | 'booking_disabled'
  | 'professional_not_public'
  | 'professional_not_found'
  | 'pet_not_found'
  | 'past_slot'
  | 'overlap'
  | 'invalid_status'
  | 'invalid_input'

export type BookingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: BookingErrorCode; message: string }

/** Backend-ready: DEMO never auto-confirms. */
export type BookingConfirmMode = 'manual' | 'instant'
