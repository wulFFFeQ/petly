import { SELF_OWNER_ID } from '../discover/owner'
import type { Pet } from '../../types'

/**
 * Resolve canonical pet owner Account.id.
 * Legacy pets without ownerAccountId map ONLY to SELF_OWNER_ID — the sole
 * historical ownership mechanism (entire lovedandknown.pets store = self).
 * Never derives ownership from Discover/public profile.
 */
export function resolvePetOwnerAccountId(pet: Pick<Pet, 'ownerAccountId'> | Pet): string {
  const raw = typeof pet.ownerAccountId === 'string' ? pet.ownerAccountId.trim() : ''
  if (raw) return raw
  return SELF_OWNER_ID
}

/** Ensure Pet has ownerAccountId set (backward-compatible DEMO migration). */
export function ensurePetOwnerAccountId<T extends Pet>(pet: T): T {
  const ownerAccountId = resolvePetOwnerAccountId(pet)
  if (pet.ownerAccountId === ownerAccountId) return pet
  return { ...pet, ownerAccountId }
}

export function isPetOwner(
  pet: Pick<Pet, 'ownerAccountId'> | Pet,
  actorAccountId: string,
): boolean {
  const actor = typeof actorAccountId === 'string' ? actorAccountId.trim() : ''
  if (!actor) return false
  return resolvePetOwnerAccountId(pet) === actor
}

export class PetOwnershipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PetOwnershipError'
  }
}

/**
 * Domain/security boundary: actor must be the pet's ownerAccountId.
 * Accepts a Pet object or petId + pets list.
 */
export function assertPetOwner(
  petOrId: Pet | string,
  actorAccountId: string,
  pets?: Pet[],
): Pet {
  const actor = typeof actorAccountId === 'string' ? actorAccountId.trim() : ''
  if (!actor) {
    throw new PetOwnershipError('Actor account id is required')
  }

  let pet: Pet | undefined
  if (typeof petOrId === 'string') {
    const petId = petOrId.trim()
    if (!petId) throw new PetOwnershipError('Pet id is required')
    if (!pets) throw new PetOwnershipError('Pets list is required when asserting by petId')
    pet = pets.find((p) => p.id === petId)
    if (!pet) throw new PetOwnershipError(`Pet not found: ${petId}`)
  } else {
    pet = petOrId
  }

  if (!isPetOwner(pet, actor)) {
    throw new PetOwnershipError('Only the pet owner may perform this operation')
  }

  return ensurePetOwnerAccountId(pet)
}
