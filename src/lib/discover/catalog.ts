import { discoverOwners, discoverPets as rawDiscoverPets } from '../../data/mockData'
import type { DiscoverOwner, DiscoverPet, Pet, PetPhoto } from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { getDefaultBreedImage } from '../petBreedImages'
import type { PrivacySettings } from '../privacy'
import { getUserHomeCity } from '../userProfile'
import { formatDiscoverDistance } from './distance'
import { resolveEngagement } from './engagement'
import { projectOwnedPetToDiscover } from './fromOwnedPet'
import { SELF_OWNER_ID, getUserDisplayName } from './owner'
import {
  computeDiscoverPopularityScore,
  isCommunityFavorite,
  isDiscoverPopular,
} from './popularity'
import { sanitizeDiscoverPet } from './privacy'

export type DiscoverCatalogOptions = {
  /** Owned pets from AppContext — projected when `publicDiscover` is true. */
  ownedPets?: Pet[]
  /** Earned badges for owned → public projection. */
  earnedBadges?: EarnedBadge[]
  /** Optional privacy settings; when omitted, projection loads from localStorage. */
  privacySettings?: PrivacySettings | null
  /** Owned gallery photos — projected when photos privacy is public. */
  petPhotos?: PetPhoto[]
  /**
   * Exclude these pet ids from the list (typically the signed-in owner's pets
   * so they never see / connect to themselves in Objevovat results).
   */
  excludePetIds?: Iterable<string>
  /** Exclude pets belonging to these owner ids (e.g. SELF_OWNER_ID). */
  excludeOwnerIds?: Iterable<string>
}

function enrichPublicPet(pet: DiscoverPet): DiscoverPet {
  const engagement = resolveEngagement(pet.id, pet.engagement)
  const withEngagement: DiscoverPet = { ...pet, engagement }
  const popularityScore = computeDiscoverPopularityScore(withEngagement)
  const distance = formatDiscoverDistance(pet.location)
  return {
    ...withEngagement,
    popularityScore,
    popular: isDiscoverPopular(popularityScore),
    communityFavorite: isCommunityFavorite(popularityScore),
    distance: distance || undefined,
  }
}

function toPublicPet(raw: unknown): DiscoverPet | null {
  const sanitized = sanitizeDiscoverPet(raw)
  if (!sanitized) return null
  return enrichPublicPet(sanitized)
}

function collectRawCatalog(
  ownedPets: Pet[] | undefined,
  earnedBadges: EarnedBadge[] | undefined,
  privacySettings?: PrivacySettings | null,
  petPhotos?: PetPhoto[],
): DiscoverPet[] {
  const fromMock = rawDiscoverPets
    .map((pet) =>
      toPublicPet({
        ...pet,
        // Always resolve mock card photos from the breed map — never drift.
        image: getDefaultBreedImage(pet.type, pet.breed),
      }),
    )
    .filter((pet): pet is DiscoverPet => pet != null)

  const ownedIds = new Set((ownedPets ?? []).map((p) => p.id))
  // Owned pets with the same id replace mock entries (single source of truth).
  const withoutOwnedDupes = fromMock.filter((pet) => !ownedIds.has(pet.id))

  const fromOwned = (ownedPets ?? [])
    .map((pet) => {
      const projected = projectOwnedPetToDiscover(pet, earnedBadges ?? [], {
        privacySettings,
        petPhotos,
      })
      return projected ? toPublicPet(projected) : null
    })
    .filter((pet): pet is DiscoverPet => pet != null)

  return [...fromOwned, ...withoutOwnedDupes]
}

/**
 * Central Discover catalog.
 * Combines mock community profiles + owned pets with `publicDiscover`.
 */
export function getDiscoverPets(options: DiscoverCatalogOptions = {}): DiscoverPet[] {
  const excludePets = new Set(options.excludePetIds ?? [])
  const excludeOwners = new Set(options.excludeOwnerIds ?? [])

  return collectRawCatalog(
    options.ownedPets,
    options.earnedBadges,
    options.privacySettings,
    options.petPhotos,
  ).filter((pet) => {
    if (excludePets.has(pet.id)) return false
    if (pet.ownerId && excludeOwners.has(pet.ownerId)) return false
    return true
  })
}

/** Full public catalog including the owner's own public pets (for deep links / tests). */
export function getDiscoverPetsIncludingOwn(
  ownedPets?: Pet[],
  earnedBadges?: EarnedBadge[],
  privacySettings?: PrivacySettings | null,
  petPhotos?: PetPhoto[],
): DiscoverPet[] {
  return collectRawCatalog(ownedPets, earnedBadges, privacySettings, petPhotos)
}

export function getDiscoverPetById(
  id: string | undefined | null,
  ownedPets?: Pet[],
  earnedBadges?: EarnedBadge[],
  petPhotos?: PetPhoto[],
): DiscoverPet | undefined {
  if (!id) return undefined
  return getDiscoverPetsIncludingOwn(ownedPets, earnedBadges, undefined, petPhotos).find(
    (pet) => pet.id === id,
  )
}

export function getDiscoverPetsByOwnerId(
  ownerId: string | undefined | null,
  ownedPets?: Pet[],
  earnedBadges?: EarnedBadge[],
  petPhotos?: PetPhoto[],
): DiscoverPet[] {
  if (!ownerId) return []
  return getDiscoverPetsIncludingOwn(ownedPets, earnedBadges, undefined, petPhotos).filter(
    (pet) => pet.ownerId === ownerId,
  )
}

export function getDiscoverOwners(ownedPets?: Pet[]): DiscoverOwner[] {
  const publicOwned = (ownedPets ?? []).filter((p) => p.publicDiscover)
  const base = discoverOwners.filter((o) => o.id !== SELF_OWNER_ID)
  if (publicOwned.length === 0) return base

  return [
    ...base,
    {
      id: SELF_OWNER_ID,
      name: getUserDisplayName(),
      avatar: publicOwned[0].image,
      location: getUserHomeCity(),
      petsCount: publicOwned.length,
      bio: 'Veřejný profil majitele v LOVED & KNOWN.',
    },
  ]
}

export function getDiscoverOwnerById(
  id: string | undefined | null,
  ownedPets?: Pet[],
): DiscoverOwner | undefined {
  if (!id) return undefined
  return getDiscoverOwners(ownedPets).find((owner) => owner.id === id)
}

export function discoverCatalogHasPetId(id: string, ownedPets?: Pet[]): boolean {
  return getDiscoverPetsIncludingOwn(ownedPets).some((pet) => pet.id === id)
}

export function findDiscoverPetByName(name: string, ownedPets?: Pet[]): DiscoverPet | undefined {
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return undefined
  return getDiscoverPetsIncludingOwn(ownedPets).find(
    (pet) => pet.name.toLowerCase() === trimmed,
  )
}

export function isOwnDiscoverPet(petId: string, ownedPets: Pet[]): boolean {
  return ownedPets.some((pet) => pet.id === petId)
}
