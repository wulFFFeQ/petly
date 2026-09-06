import type { Pet, PetType } from '../../types'

/**
 * Whitelisted fields for the public found-pet page.
 * Intentionally excludes microchip, owner PII, health, GPS, documents, private photos.
 */
export interface FoundPetPublicView {
  token: string
  name: string
  breed: string
  type: PetType
  image: string
  contactEnabled: boolean
  approximateArea?: string
  urgentNote?: string
}

export function buildFoundPetPublicView(pet: Pet): FoundPetPublicView | null {
  const token = pet.foundContactToken?.trim()
  if (!token) return null

  const area =
    pet.foundPublic?.showApproximateArea && pet.foundPublic.approximateArea?.trim()
      ? pet.foundPublic.approximateArea.trim()
      : undefined
  const urgent =
    pet.foundPublic?.showUrgentNote && pet.foundPublic.urgentNote?.trim()
      ? pet.foundPublic.urgentNote.trim()
      : undefined

  return {
    token,
    name: pet.name,
    breed: pet.breed,
    type: pet.type,
    image: pet.image,
    contactEnabled: pet.qrContactEnabled !== false,
    ...(area ? { approximateArea: area } : {}),
    ...(urgent ? { urgentNote: urgent } : {}),
  }
}

export function findPetByFoundToken(pets: Pet[], token: string): Pet | undefined {
  const normalized = token.trim()
  if (!normalized) return undefined
  return pets.find((pet) => pet.foundContactToken === normalized)
}
