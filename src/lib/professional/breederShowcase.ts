import type { DiscoverBreedingPublic, DiscoverPet, Pet, PetType } from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { projectOwnedPetToDiscover } from '../discover/fromOwnedPet'
import { hasActiveBreedingProfile } from '../breedingProfile'
import type { PrivacySettings } from '../privacy/types'
import type { Verification } from '../verification/types'
import type { ProfessionalProfile } from './types'

/** Keys that must never appear on a public breeder showcase payload. */
export const PUBLIC_BREEDER_SHOWCASE_FORBIDDEN_KEYS = [
  'microchip',
  'ownerContacts',
  'health',
  'healthRecords',
  'healthStatus',
  'medications',
  'allergies',
  'documents',
  'documentIds',
  'access',
  'permissions',
  'accountId',
  'address',
  'weight',
  'registrationNumber',
  'pedigreeNumber',
  'healthTests',
  'matings',
  'verifications',
  'metadata',
] as const

/**
 * Safe public animal card for a breeder's public profile.
 * Built only from Discover public projection — never raw Pet.
 */
export type PublicBreederAnimal = {
  id: string
  name: string
  breed: string
  type: PetType
  image: string
  breeding?: DiscoverBreedingPublic
  /**
   * Extension point for a future public gallery link from Discover projection.
   * Not populated or rendered in KROK 24.
   */
  gallery?: never
}

export type PublicBreederShowcase = {
  animals: PublicBreederAnimal[]
  /** Aggregated kennel / status line when available from public breeding. */
  kennelSummary?: string
}

export type ToPublicBreederShowcaseOptions = {
  /** Account id that owns `ownedPets` in this local-first store (typically self). */
  viewerAccountId?: string | null
  privacySettings?: PrivacySettings | null
  earnedBadges?: EarnedBadge[]
  verifications?: Verification[]
}

function breedingHasPublicContent(breeding: DiscoverBreedingPublic | undefined): boolean {
  if (!breeding) return false
  return Boolean(
    breeding.status ||
      breeding.titles?.length ||
      breeding.shows?.length ||
      breeding.pedigreeSummary ||
      breeding.litters?.length,
  )
}

function toPublicAnimal(discover: DiscoverPet): PublicBreederAnimal | null {
  if (!discover.breedingProfile) return null
  if (!breedingHasPublicContent(discover.breeding)) return null

  return {
    id: discover.id,
    name: discover.name,
    breed: discover.breed,
    type: discover.type,
    image: discover.image,
    breeding: { ...discover.breeding! },
  }
}

/**
 * Build a safe public breeding showcase for a professional.
 *
 * - Only `type === 'breeder'`
 * - Only pets owned by the same account as the professional (local DEMO: account match)
 * - Never uses PetProfessionalAccess (client pets)
 * - Only pets that pass Discover public projection + active breeding profile
 */
export function toPublicBreederShowcase(
  professional: Pick<ProfessionalProfile, 'type' | 'accountId'>,
  ownedPets: Pet[],
  options: ToPublicBreederShowcaseOptions = {},
): PublicBreederShowcase | null {
  if (professional.type !== 'breeder') return null

  const viewerAccountId = options.viewerAccountId
  if (!viewerAccountId || professional.accountId !== viewerAccountId) {
    // Local-first: other accounts' pets are not in this store — no leak, no fake data.
    return null
  }

  const animals: PublicBreederAnimal[] = []

  for (const pet of ownedPets) {
    if (!hasActiveBreedingProfile(pet)) continue

    const discover = projectOwnedPetToDiscover(pet, options.earnedBadges ?? [], {
      privacySettings: options.privacySettings,
      verifications: options.verifications,
    })
    if (!discover) continue

    const animal = toPublicAnimal(discover)
    if (animal) {
      assertPublicBreederAnimalSafe(animal)
      animals.push(animal)
    }
  }

  if (animals.length === 0) return null

  const kennelSummary = animals
    .map((a) => a.breeding?.status)
    .find((s): s is string => Boolean(s?.trim()))

  const showcase: PublicBreederShowcase = { animals }
  if (kennelSummary) showcase.kennelSummary = kennelSummary
  return showcase
}

export function assertPublicBreederAnimalSafe(animal: PublicBreederAnimal): void {
  const record = animal as unknown as Record<string, unknown>
  for (const key of PUBLIC_BREEDER_SHOWCASE_FORBIDDEN_KEYS) {
    if (key in record && record[key] != null) {
      throw new Error(`PublicBreederAnimal must not include ${key}`)
    }
  }
  if (animal.breeding) {
    const breeding = animal.breeding as unknown as Record<string, unknown>
    for (const key of PUBLIC_BREEDER_SHOWCASE_FORBIDDEN_KEYS) {
      if (key in breeding && breeding[key] != null) {
        throw new Error(`PublicBreederAnimal.breeding must not include ${key}`)
      }
    }
  }
}

export function assertPublicBreederShowcaseSafe(showcase: PublicBreederShowcase): void {
  for (const animal of showcase.animals) {
    assertPublicBreederAnimalSafe(animal)
  }
}
