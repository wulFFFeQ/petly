import type { ProfessionalType } from '../professional/types'
import { createBookingId } from './storage'
import type { ProfessionalAvailability, ProfessionalService, Weekday } from './types'

type SeedService = Omit<
  ProfessionalService,
  'id' | 'professionalId' | 'createdAt' | 'updatedAt' | 'active' | 'bookingEnabled'
> & {
  active?: boolean
  bookingEnabled?: boolean
}

const VET_SERVICES: SeedService[] = [
  {
    name: 'Preventivní prohlídka',
    description: 'Základní zdravotní prohlídka mazlíčka.',
    durationMinutes: 30,
    price: 800,
    currency: 'CZK',
  },
  {
    name: 'Očkování',
    description: 'Aplikace vakcíny dle očkovacího plánu.',
    durationMinutes: 20,
    price: 600,
    currency: 'CZK',
  },
  {
    name: 'Konzultace',
    description: 'Konzultace zdravotního stavu nebo péče.',
    durationMinutes: 30,
  },
]

const GROOMER_SERVICES: SeedService[] = [
  {
    name: 'Kompletní péče o srst',
    description: 'Koupání, sušení a úprava srsti.',
    durationMinutes: 90,
    price: 1200,
    currency: 'CZK',
  },
  {
    name: 'Stříhání',
    description: 'Střih podle plemene nebo přání majitele.',
    durationMinutes: 60,
    price: 900,
    currency: 'CZK',
  },
  {
    name: 'Drápky',
    description: 'Úprava drápků.',
    durationMinutes: 15,
    price: 200,
    currency: 'CZK',
  },
]

const TRAINER_SERVICES: SeedService[] = [
  {
    name: 'Individuální trénink',
    description: 'Individuální výcviková lekce.',
    durationMinutes: 60,
    price: 700,
    currency: 'CZK',
  },
  {
    name: 'Konzultace chování',
    description: 'Poradenství k chování a výchově.',
    durationMinutes: 45,
    price: 550,
    currency: 'CZK',
  },
]

const PET_HOTEL_SERVICES: SeedService[] = [
  {
    name: 'Ubytování',
    description: 'Denní / noční ubytování.',
    durationMinutes: 60,
    price: 500,
    currency: 'CZK',
  },
  {
    name: 'Denní péče',
    description: 'Denní péče bez přespání.',
    durationMinutes: 480,
    price: 400,
    currency: 'CZK',
  },
]

const PET_SERVICE_SERVICES: SeedService[] = [
  {
    name: 'Obecná služba',
    description: 'Konzultace a domluva termínu.',
    durationMinutes: 30,
  },
]

/** Breeder / shelter — extension point; booking off by default. */
const EXTENSION_SERVICES: SeedService[] = [
  {
    name: 'Konzultace',
    description: 'Nezávazná konzultace (rezervace zatím vypnuta).',
    durationMinutes: 30,
    bookingEnabled: false,
  },
]

export function seedServicesForRole(type: ProfessionalType): SeedService[] {
  switch (type) {
    case 'veterinarian':
    case 'veterinary_clinic':
      return VET_SERVICES
    case 'groomer':
      return GROOMER_SERVICES
    case 'trainer':
      return TRAINER_SERVICES
    case 'pet_hotel':
      return PET_HOTEL_SERVICES
    case 'pet_service':
      return PET_SERVICE_SERVICES
    case 'breeder':
    case 'shelter':
      return EXTENSION_SERVICES
    default:
      return PET_SERVICE_SERVICES
  }
}

export function buildSeedServices(
  professionalId: string,
  type: ProfessionalType,
  now = new Date().toISOString(),
): ProfessionalService[] {
  return seedServicesForRole(type).map((s) => ({
    id: createBookingId('svc'),
    professionalId,
    name: s.name,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: s.price,
    currency: s.currency,
    active: s.active ?? true,
    bookingEnabled: s.bookingEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  }))
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
