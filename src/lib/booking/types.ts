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
  /** Internal cancel/decline preset — never expose on public profile or notifications. */
  cancellationReasonCode?: CancellationReasonCode
  confirmedAt?: string
  completedAt?: string
  declinedAt?: string
  /** First startAt before any reschedule — preserved for history. */
  originalStartAt?: string
  originalEndAt?: string
  rescheduledAt?: string
  noShowAt?: string
}

/** Professional cancel/decline reason presets (internal). */
export type CancellationReasonCode =
  | 'cannot_fulfill'
  | 'operational'
  | 'illness'
  | 'other'

export const CANCELLATION_REASON_CODES: CancellationReasonCode[] = [
  'cannot_fulfill',
  'operational',
  'illness',
  'other',
]

export const CANCELLATION_REASON_LABELS: Record<CancellationReasonCode, string> = {
  cannot_fulfill: 'Nemohu termín uskutečnit',
  operational: 'Provozní důvody',
  illness: 'Nemoc',
  other: 'Jiný důvod',
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

/**
 * One working-hours window for a weekday.
 * Multiple intervals per day = multiple rows with the same weekday.
 * Wall-clock HH:mm in the professional's local zone — never store as UTC timestamps.
 * Future: Professional → Team member → Availability (single shared schedule today).
 */
export interface ProfessionalAvailability {
  id: string
  professionalId: string
  weekday: Weekday
  /** Local wall-clock HH:mm */
  startTime: string
  /** Local wall-clock HH:mm */
  endTime: string
  active: boolean
}

export type AvailabilityExceptionType = 'closed' | 'custom_hours'

/**
 * Date-specific override of weekly availability.
 * Multiple custom_hours rows may share a date (multi-window exception day).
 * `label` is internal-only — never expose to public booking UI.
 */
export interface ProfessionalAvailabilityException {
  id: string
  professionalId: string
  /** YYYY-MM-DD (local calendar date) */
  date: string
  startTime?: string
  endTime?: string
  type: AvailabilityExceptionType
  /** Internal reason (e.g. Dovolená) — not shown to customers. */
  label?: string
}

/**
 * Backend-ready timezone settings. DEMO slot math still uses browser-local Date;
 * HH:mm working hours remain wall-clock, not absolute UTC.
 */
export interface ProfessionalAvailabilitySettings {
  professionalId: string
  /** IANA timezone, e.g. Europe/Prague */
  timezone?: string
}

/** A single local wall-clock window. */
export type DayTimeWindow = {
  startTime: string
  endTime: string
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
  | 'policy_blocked'
  | 'too_early'
  | 'reschedule_disabled'
  | 'reason_required'

export type BookingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: BookingErrorCode; message: string }

/** Backend-ready: DEMO never auto-confirms. */
export type BookingConfirmMode = 'manual' | 'instant'

/** No-show may be marked only after the appointment start (DEMO). */
export type BookingNoShowMode = 'after_start'

/**
 * Professional-level booking rules (not per booking record).
 * Free for all plans — advanced fees/reminders may be premium later.
 */
export interface ProfessionalBookingPolicy {
  professionalId: string
  /**
   * Hours before start when owner may still cancel a confirmed booking.
   * `null` = unlimited. Default: 24.
   */
  cancellationNoticeHours: number | null
  /** Whether owner/professional may reschedule to another available slot. */
  allowReschedule: boolean
  /** DEMO always manual; instant confirm is backend-ready only. */
  confirmMode: BookingConfirmMode
  noShowMode: BookingNoShowMode
}

/**
 * Extension point for future per-service overrides.
 * Today: Professional → BookingPolicy only (not wired to UI).
 * Future: Professional → Service → BookingPolicy.
 */
export interface ProfessionalServiceBookingPolicy {
  serviceId: string
  professionalId: string
  /** When set, overrides professional-level cancellationNoticeHours for this service. */
  cancellationNoticeHours?: number | null
  allowReschedule?: boolean
}

/** localStorage flag: allow completeBooking before startAt (DEMO only). */
export const DEMO_ALLOW_EARLY_COMPLETE_KEY = 'lovedandknown.demoAllowEarlyComplete'
