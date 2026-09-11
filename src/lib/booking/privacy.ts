/**
 * Privacy helpers for booking payloads.
 * Booking ≠ PetProfessionalAccess — never attach protected pet/owner fields.
 */

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

export function formatServicePrice(
  price?: number,
  currency?: string,
): string {
  if (price === undefined || price === null || Number.isNaN(price)) {
    return 'Cena na dotaz'
  }
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
