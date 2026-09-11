/**
 * Central catalog of service categories + role-specific suggestions.
 * Categories are not hard-locked to current roles (extension point).
 */
import type { ProfessionalType } from '../professional/types'
import type {
  ServiceCategory,
  ServiceLocationType,
  ServicePriceType,
} from './types'
import { SERVICE_CATEGORIES } from './types'

export type ServiceSuggestion = {
  name: string
  description?: string
  category: ServiceCategory
  durationMinutes: number
  priceType?: ServicePriceType
  price?: number
  currency?: string
  bookingEnabled?: boolean
  locationType?: ServiceLocationType
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  veterinary: 'Veterinární',
  grooming: 'Grooming',
  training: 'Výcvik',
  pet_hotel: 'Pet hotel',
  pet_care: 'Péče o mazlíčky',
  consultation: 'Konzultace',
  other: 'Ostatní',
}

export function isServiceCategory(value: unknown): value is ServiceCategory {
  return typeof value === 'string' && (SERVICE_CATEGORIES as string[]).includes(value)
}

/** Recommended categories for a professional role (not exclusive). */
export function recommendedCategoriesForRole(type: ProfessionalType): ServiceCategory[] {
  switch (type) {
    case 'veterinarian':
    case 'veterinary_clinic':
      return ['veterinary', 'consultation', 'other']
    case 'groomer':
      return ['grooming', 'pet_care', 'other']
    case 'trainer':
      return ['training', 'consultation', 'other']
    case 'pet_hotel':
      return ['pet_hotel', 'pet_care', 'other']
    case 'pet_service':
      return ['pet_care', 'consultation', 'other']
    case 'shelter':
      // Adoption is a future extension — not a booking service yet.
      return ['consultation', 'other']
    case 'breeder':
      // Breeding workflow is separate from booking.
      return ['consultation', 'other']
    default:
      return ['other', 'consultation', 'pet_care']
  }
}

const VET_SUGGESTIONS: ServiceSuggestion[] = [
  {
    name: 'Preventivní prohlídka',
    description: 'Základní zdravotní prohlídka mazlíčka.',
    category: 'veterinary',
    durationMinutes: 30,
    priceType: 'fixed',
    price: 800,
    currency: 'CZK',
  },
  {
    name: 'Očkování',
    description: 'Aplikace vakcíny dle očkovacího plánu.',
    category: 'veterinary',
    durationMinutes: 20,
    priceType: 'fixed',
    price: 600,
    currency: 'CZK',
  },
  {
    name: 'Konzultace',
    description: 'Konzultace zdravotního stavu nebo péče.',
    category: 'consultation',
    durationMinutes: 30,
    priceType: 'on_request',
  },
  {
    name: 'Kontrola',
    description: 'Kontrolní vyšetření po léčbě nebo zákroku.',
    category: 'veterinary',
    durationMinutes: 20,
    priceType: 'fixed',
    price: 500,
    currency: 'CZK',
  },
  {
    name: 'Další vyšetření',
    description: 'Doplňující diagnostika dle potřeby.',
    category: 'veterinary',
    durationMinutes: 45,
    priceType: 'from',
    price: 900,
    currency: 'CZK',
  },
]

const GROOMER_SUGGESTIONS: ServiceSuggestion[] = [
  {
    name: 'Kompletní péče o srst',
    description: 'Koupání, sušení a úprava srsti.',
    category: 'grooming',
    durationMinutes: 90,
    priceType: 'from',
    price: 1200,
    currency: 'CZK',
  },
  {
    name: 'Koupání',
    description: 'Koupání a sušení srsti.',
    category: 'grooming',
    durationMinutes: 45,
    priceType: 'fixed',
    price: 500,
    currency: 'CZK',
  },
  {
    name: 'Vyčesání',
    description: 'Vyčesání a rozčesání srsti.',
    category: 'grooming',
    durationMinutes: 40,
    priceType: 'fixed',
    price: 400,
    currency: 'CZK',
  },
  {
    name: 'Drápky',
    description: 'Úprava drápků.',
    category: 'grooming',
    durationMinutes: 15,
    priceType: 'fixed',
    price: 200,
    currency: 'CZK',
  },
  {
    name: 'Hygienická péče',
    description: 'Hygienické ošetření (ušní, anální žlázy apod.).',
    category: 'pet_care',
    durationMinutes: 25,
    priceType: 'fixed',
    price: 350,
    currency: 'CZK',
  },
]

const TRAINER_SUGGESTIONS: ServiceSuggestion[] = [
  {
    name: 'Individuální trénink',
    description: 'Individuální výcviková lekce.',
    category: 'training',
    durationMinutes: 60,
    priceType: 'fixed',
    price: 700,
    currency: 'CZK',
  },
  {
    name: 'Behaviorální konzultace',
    description: 'Poradenství k chování a výchově.',
    category: 'consultation',
    durationMinutes: 45,
    priceType: 'fixed',
    price: 550,
    currency: 'CZK',
  },
  {
    name: 'Skupinový trénink',
    description: 'Skupinová výcviková lekce.',
    category: 'training',
    durationMinutes: 60,
    priceType: 'fixed',
    price: 400,
    currency: 'CZK',
  },
]

const PET_HOTEL_SUGGESTIONS: ServiceSuggestion[] = [
  {
    name: 'Ubytování',
    description: 'Denní / noční ubytování.',
    category: 'pet_hotel',
    durationMinutes: 60,
    priceType: 'from',
    price: 500,
    currency: 'CZK',
  },
  {
    name: 'Denní péče',
    description: 'Denní péče bez přespání.',
    category: 'pet_hotel',
    durationMinutes: 480,
    priceType: 'fixed',
    price: 400,
    currency: 'CZK',
  },
  {
    name: 'Individuální péče',
    description: 'Individuální péče nad rámec standardního pobytu.',
    category: 'pet_care',
    durationMinutes: 60,
    priceType: 'on_request',
  },
]

const PET_SERVICE_SUGGESTIONS: ServiceSuggestion[] = [
  {
    name: 'Obecná služba',
    description: 'Konzultace a domluva termínu.',
    category: 'pet_care',
    durationMinutes: 30,
    priceType: 'on_request',
  },
]

/** Shelter / breeder — booking is not an adoption or breeding workflow. */
const EXTENSION_SUGGESTIONS: ServiceSuggestion[] = [
  {
    name: 'Konzultace',
    description: 'Nezávazná konzultace (rezervace zatím vypnuta).',
    category: 'consultation',
    durationMinutes: 30,
    priceType: 'on_request',
    bookingEnabled: false,
  },
]

export function suggestedServicesForRole(type: ProfessionalType): ServiceSuggestion[] {
  switch (type) {
    case 'veterinarian':
    case 'veterinary_clinic':
      return VET_SUGGESTIONS
    case 'groomer':
      return GROOMER_SUGGESTIONS
    case 'trainer':
      return TRAINER_SUGGESTIONS
    case 'pet_hotel':
      return PET_HOTEL_SUGGESTIONS
    case 'pet_service':
      return PET_SERVICE_SUGGESTIONS
    case 'breeder':
    case 'shelter':
      return EXTENSION_SUGGESTIONS
    default:
      return PET_SERVICE_SUGGESTIONS
  }
}
