import type { ProfessionalType } from '../professional/types'
import { createBookingId } from './storage'
import { suggestedServicesForRole } from './serviceCategories'
import type {
  Booking,
  ProfessionalAvailability,
  ProfessionalService,
  ServicePriceType,
  Weekday,
} from './types'

type SeedService = Omit<
  ProfessionalService,
  'id' | 'professionalId' | 'createdAt' | 'updatedAt' | 'active' | 'bookingEnabled' | 'isDemo'
> & {
  active?: boolean
  bookingEnabled?: boolean
}

function resolvePriceType(s: {
  priceType?: ServicePriceType
  price?: number
}): ServicePriceType {
  if (s.priceType) return s.priceType
  if (s.price !== undefined && s.price >= 0) return 'fixed'
  return 'on_request'
}

export function seedServicesForRole(type: ProfessionalType): SeedService[] {
  return suggestedServicesForRole(type).map((s) => {
    const priceType = resolvePriceType(s)
    const row: SeedService = {
      name: s.name,
      description: s.description,
      category: s.category,
      durationMinutes: s.durationMinutes,
      priceType,
      publicVisibility: 'public',
      currency: s.currency,
    }
    if (priceType !== 'on_request' && s.price !== undefined && s.price >= 0) {
      row.price = s.price
    }
    if (s.bookingEnabled === false) {
      // marked on seed via bookingEnabled override in buildSeedServices
    }
    return row
  })
}

/**
 * Build DEMO seed services for a professional who has none yet.
 * All seed rows are marked isDemo — never present as real marketplace data.
 */
export function buildSeedServices(
  professionalId: string,
  type: ProfessionalType,
  now = new Date().toISOString(),
): ProfessionalService[] {
  const suggestions = suggestedServicesForRole(type)
  return suggestions.map((s) => {
    const priceType = resolvePriceType(s)
    const service: ProfessionalService = {
      id: createBookingId('svc'),
      professionalId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      category: s.category,
      priceType,
      publicVisibility: 'public',
      active: true,
      bookingEnabled: s.bookingEnabled ?? true,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    }
    if (s.description?.trim()) service.description = s.description.trim()
    if (priceType !== 'on_request' && s.price !== undefined && s.price >= 0) {
      service.price = s.price
    }
    if (s.currency?.trim() && priceType !== 'on_request') {
      service.currency = s.currency.trim()
    }
    return service
  })
}

/** Default Mon–Fri 09:00–17:00. */
export function buildDefaultWeeklyAvailability(
  professionalId: string,
): ProfessionalAvailability[] {
  const weekdays: Weekday[] = [0, 1, 2, 3, 4]
  return weekdays.map((weekday) => ({
    id: createBookingId('av'),
    professionalId,
    weekday,
    startTime: '09:00',
    endTime: '17:00',
    active: true,
  }))
}

/** Ensure weekend rows exist (closed) for UI completeness. */
export function buildFullWeekAvailability(
  professionalId: string,
): ProfessionalAvailability[] {
  const work = buildDefaultWeeklyAvailability(professionalId)
  const weekend: Weekday[] = [5, 6]
  const closed = weekend.map((weekday) => ({
    id: createBookingId('av'),
    professionalId,
    weekday,
    startTime: '09:00',
    endTime: '17:00',
    active: false,
  }))
  return [...work, ...closed]
}

export type SeedBookingFixture = {
  ownerAccountId: string
  professionalId: string
  serviceId: string
  petId: string
  petName?: string
  professionalName?: string
  serviceName?: string
  /** Base date for relative offsets; default now. */
  now?: Date
}

/**
 * DEMO lifecycle fixtures for booking rules / calendar / reviews.
 * Does not go through createBooking — inserts normalized records directly.
 */
export function buildSeedBookings(input: SeedBookingFixture): Booking[] {
  const now = input.now ?? new Date()
  const ts = now.toISOString()
  const petName = input.petName ?? 'Mazlíček'
  const professionalName = input.professionalName ?? 'Profesionál'
  const serviceName = input.serviceName ?? 'Služba'

  const atDayHour = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }

  const endOf = (startIso: string, minutes = 30) => {
    const d = new Date(startIso)
    d.setMinutes(d.getMinutes() + minutes)
    return d.toISOString()
  }

  const base = {
    ownerAccountId: input.ownerAccountId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    petId: input.petId,
    petName,
    professionalName,
    serviceName,
    serviceNameSnapshot: serviceName,
    durationSnapshot: 30,
    createdAt: ts,
    updatedAt: ts,
  }

  const requestedStart = atDayHour(5, 10)
  const confirmedStart = atDayHour(7, 11)
  const completedStart = atDayHour(-3, 10)
  const cancelledOwnerStart = atDayHour(-5, 9)
  const cancelledProStart = atDayHour(-4, 14)
  const noShowStart = atDayHour(-2, 15)

  return [
    {
      ...base,
      id: createBookingId('bkg_seed_req'),
      startAt: requestedStart,
      endAt: endOf(requestedStart),
      status: 'requested' as const,
    },
    {
      ...base,
      id: createBookingId('bkg_seed_conf'),
      startAt: confirmedStart,
      endAt: endOf(confirmedStart),
      status: 'confirmed' as const,
      confirmedAt: ts,
    },
    {
      ...base,
      id: createBookingId('bkg_seed_done'),
      startAt: completedStart,
      endAt: endOf(completedStart),
      status: 'completed' as const,
      confirmedAt: ts,
      completedAt: ts,
    },
    {
      ...base,
      id: createBookingId('bkg_seed_cxo'),
      startAt: cancelledOwnerStart,
      endAt: endOf(cancelledOwnerStart),
      status: 'cancelled_by_owner' as const,
      cancelledAt: ts,
    },
    {
      ...base,
      id: createBookingId('bkg_seed_cxp'),
      startAt: cancelledProStart,
      endAt: endOf(cancelledProStart),
      status: 'cancelled_by_professional' as const,
      cancelledAt: ts,
      cancellationReasonCode: 'operational' as const,
      cancellationReason: 'Provozní důvody',
    },
    {
      ...base,
      id: createBookingId('bkg_seed_ns'),
      startAt: noShowStart,
      endAt: endOf(noShowStart),
      status: 'no_show' as const,
      confirmedAt: ts,
      noShowAt: ts,
    },
  ]
}
