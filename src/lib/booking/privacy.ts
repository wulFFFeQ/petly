/**
 * Privacy helpers for booking payloads and public service projection.
 * Booking ≠ PetProfessionalAccess — never attach protected pet/owner fields.
 * Public service ≠ internal notes / professionalId / account metadata.
 */

import { isServiceBookable } from './services'
import type {
  Booking,
  ProfessionalService,
  PublicProfessionalService,
  ServicePriceType,
} from './types'

const FORBIDDEN_KEYS = [
  'microchip',
  'health',
  'healthRecords',
  'medications',
  'vaccinations',
  'documents',
  'ownerContacts',
  'ownerPhone',
  'ownerEmail',
  'privateNotes',
  'privateLocation',
  'address',
  'locationPrivate',
] as const

export const BOOKING_FORBIDDEN_PET_KEYS = FORBIDDEN_KEYS

/** Keys that must never appear on a public service projection. */
export const PUBLIC_SERVICE_FORBIDDEN_KEYS = [
  'professionalId',
  'accountId',
  'notes',
  'privateNotes',
  'capacity',
  'bookingBufferBeforeMinutes',
  'bookingBufferAfterMinutes',
  'createdAt',
  'updatedAt',
  'locationType',
] as const

export type BookingPublicPetInfo = {
  petId: string
  petName: string
}

export type BookingOwnerContactInfo = {
  ownerAccountId: string
  displayName?: string
}

export function projectPetForBooking(
  pet: { id: string; name?: string } | null | undefined,
): BookingPublicPetInfo | null {
  if (!pet?.id) return null
  const name = typeof pet.name === 'string' && pet.name.trim() ? pet.name.trim() : 'Mazlíček'
  return { petId: pet.id, petName: name }
}

export function projectOwnerForBooking(
  owner: { id: string; displayName?: string } | null | undefined,
): BookingOwnerContactInfo | null {
  if (!owner?.id) return null
  const info: BookingOwnerContactInfo = { ownerAccountId: owner.id }
  if (typeof owner.displayName === 'string' && owner.displayName.trim()) {
    info.displayName = owner.displayName.trim()
  }
  return info
}

export function assertBookingPayloadSafe(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return true
  const keys = Object.keys(payload as object).map((k) => k.toLowerCase())
  for (const forbidden of FORBIDDEN_KEYS) {
    if (keys.some((k) => k.includes(forbidden.toLowerCase()))) return false
  }
  return true
}

export function toPublicProfessionalService(
  service: ProfessionalService,
): PublicProfessionalService {
  const pub: PublicProfessionalService = {
    id: service.id,
    name: service.name,
    category: service.category,
    durationMinutes: service.durationMinutes,
    priceType: service.priceType,
    publicVisibility: service.publicVisibility,
    bookingEnabled: service.bookingEnabled,
    canBook: isServiceBookable(service),
  }
  if (service.description?.trim()) pub.description = service.description.trim()
  if (service.priceType !== 'on_request' && service.price !== undefined) {
    pub.price = service.price
  }
  if (service.priceType !== 'on_request' && service.currency) {
    pub.currency = service.currency
  }
  if (service.isDemo) pub.isDemo = true
  return pub
}

export function assertPublicServiceSafe(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const keys = Object.keys(payload as object)
  for (const forbidden of PUBLIC_SERVICE_FORBIDDEN_KEYS) {
    if (keys.includes(forbidden)) return false
  }
  if (keys.includes('professionalId') || keys.includes('accountId') || keys.includes('notes')) {
    return false
  }
  return true
}

function formatMoney(price: number, currency?: string): string {
  const cur = currency?.trim() || 'CZK'
  try {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${price} ${cur}`
  }
}

export function formatServicePrice(
  price?: number,
  currency?: string,
  priceType?: ServicePriceType,
): string {
  const type: ServicePriceType =
    priceType ??
    (price === undefined || price === null || Number.isNaN(price) ? 'on_request' : 'fixed')

  if (type === 'on_request') return 'Na dotaz'
  if (price === undefined || price === null || Number.isNaN(price)) return 'Na dotaz'
  if (type === 'from') return `od ${formatMoney(price, currency)}`
  return formatMoney(price, currency)
}

/** Prefer snapshot fields; fall back to legacy booking fields. */
export function bookingServiceName(booking: Booking): string {
  return booking.serviceNameSnapshot ?? booking.serviceName ?? 'Služba'
}

export function bookingPriceLabel(booking: Booking): string | null {
  const price = booking.priceSnapshot ?? booking.price
  const currency = booking.currencySnapshot ?? booking.currency
  if (price === undefined) return null
  return formatServicePrice(price, currency, 'fixed')
}

export function bookingDurationMinutes(booking: Booking): number | null {
  if (booking.durationSnapshot !== undefined && booking.durationSnapshot > 0) {
    return booking.durationSnapshot
  }
  const start = Date.parse(booking.startAt)
  const end = Date.parse(booking.endAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  return Math.round((end - start) / 60_000)
}
