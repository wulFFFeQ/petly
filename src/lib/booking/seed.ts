import type { ProfessionalType } from '../professional/types'
import { createBookingId } from './storage'
import { suggestedServicesForRole } from './serviceCategories'
import type {
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
