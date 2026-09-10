import { discoverOwners, discoverPets as rawDiscoverPets } from '../../data/mockData'
import type { DiscoverOwner, DiscoverPet } from '../../types'
import { formatDiscoverDistance } from './distance'
import { sanitizeDiscoverPet } from './privacy'

/**
 * Central Discover catalog accessors.
 * Today backed by mockData; swap implementation later for API / owned-pet projection
 * without changing page consumers.
 */

function enrichPublicPet(pet: DiscoverPet): DiscoverPet {
  const distance = formatDiscoverDistance(pet.location)
  return distance ? { ...pet, distance } : { ...pet, distance: undefined }
}

function toPublicPet(raw: unknown): DiscoverPet | null {
  const sanitized = sanitizeDiscoverPet(raw)
  if (!sanitized) return null
  return enrichPublicPet(sanitized)
}

export function getDiscoverPets(): DiscoverPet[] {
  return rawDiscoverPets
    .map((pet) => toPublicPet(pet))
    .filter((pet): pet is DiscoverPet => pet != null)
}

export function getDiscoverPetById(id: string | undefined | null): DiscoverPet | undefined {
  if (!id) return undefined
  const raw = rawDiscoverPets.find((pet) => pet.id === id)
  if (!raw) return undefined
  return toPublicPet(raw) ?? undefined
}

export function getDiscoverPetsByOwnerId(ownerId: string | undefined | null): DiscoverPet[] {
  if (!ownerId) return []
  return getDiscoverPets().filter((pet) => pet.ownerId === ownerId)
}

export function getDiscoverOwners(): DiscoverOwner[] {
  return discoverOwners
}

export function getDiscoverOwnerById(id: string | undefined | null): DiscoverOwner | undefined {
  if (!id) return undefined
  return discoverOwners.find((owner) => owner.id === id)
}

export function discoverCatalogHasPetId(id: string): boolean {
  return rawDiscoverPets.some((pet) => pet.id === id)
}

export function findDiscoverPetByName(name: string): DiscoverPet | undefined {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return undefined
  return getDiscoverPets().find((pet) => pet.name.toLowerCase() === trimmed)
}
