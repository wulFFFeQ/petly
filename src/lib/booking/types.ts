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

export type ServicePriceType = 'fixed' | 'from' | 'on_request'

export type ServiceCategory =
  | 'veterinary'
  | 'grooming'
  | 'training'
  | 'pet_hotel'
  | 'pet_care'
  | 'consultation'
  | 'other'

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'veterinary',
  'grooming',
  'training',
  'pet_hotel',
  'pet_care',
  'consultation',
  'other',
]

export const SERVICE_PRICE_TYPES: ServicePriceType[] = ['fixed', 'from', 'on_request']

export type ServicePublicVisibility = 'public' | 'private'

export type ServiceLocationType = 'on_site' | 'at_client' | 'remote' | 'other'

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
  /**
   * Snapshot of service name at booking time.
   * Prefer this over live ProfessionalService.name for history.
   * Legacy alias: serviceName
   */
  serviceNameSnapshot?: string
  /** @deprecated Prefer serviceNameSnapshot — kept for older stored bookings. */
  serviceName?: string
  petName?: string
  professionalName?: string
  ownerDisplayName?: string
  /** Snapshot of price at booking time. Legacy alias: price */
  priceSnapshot?: number
  /** @deprecated Prefer priceSnapshot */
  price?: number
  /** Snapshot of currency at booking time. Legacy alias: currency */
  currencySnapshot?: string
  /** @deprecated Prefer currencySnapshot */
  currency?: string
  /** Snapshot of duration (minutes) at booking time. */
  durationSnapshot?: number
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

/**
 * What a professional offers — not availability, booking, review, or membership.
 */
export interface ProfessionalService {
  id: string
  professionalId: string
  name: string
  description?: string
  category: ServiceCategory
  durationMinutes: number
  price?: number
  currency?: string
  priceType: ServicePriceType
  active: boolean
  /** Whether this service participates in the booking engine. */
  bookingEnabled: boolean
  publicVisibility: ServicePublicVisibility
  capacity?: number
  locationType?: ServiceLocationType
  /** Internal notes — never expose on public profile. */
  notes?: string
  bookingBufferBeforeMinutes?: number
  bookingBufferAfterMinutes?: number
  /** Seed / demo data — must not be presented as real. */
  isDemo?: boolean
  createdAt: string
  updatedAt: string
}

/** Public-safe projection of a professional service. */
export interface PublicProfessionalService {
  id: string
  name: string
  description?: string
  category: ServiceCategory
  durationMinutes: number
  price?: number
  currency?: string
  priceType: ServicePriceType
  publicVisibility: ServicePublicVisibility
  bookingEnabled: boolean
  canBook: boolean
  isDemo?: boolean
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
