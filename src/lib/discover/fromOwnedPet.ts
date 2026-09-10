import type {
  DiscoverBreedingPublic,
  DiscoverPet,
  Pet,
  PetBreedingData,
} from '../../types'
import { getUserHomeCity } from '../userProfile'
import { resolveEngagement } from './engagement'
import { SELF_OWNER_ID, getUserDisplayName } from './owner'

function mapPublicBreeding(
  breedingProfile: boolean | undefined,
  breeding: PetBreedingData | undefined,
): { breedingProfile?: boolean; breeding?: DiscoverBreedingPublic } {
  if (!breedingProfile || !breeding) return {}

  const titles = (breeding.titles ?? [])
    .map((t) => t.name?.trim())
    .filter((t): t is string => Boolean(t))

  const shows = (breeding.shows ?? [])
    .filter((s) => s.name?.trim())
    .map((s) => ({
      name: s.name!.trim(),
      year: s.date?.slice(0, 4) || '—',
      result: s.result?.trim() || undefined,
    }))

  const litters = (breeding.litters ?? []).map((l) => ({
    date: l.birthDate || '—',
    count: typeof l.totalCount === 'number' ? l.totalCount : 0,
    note: l.notes?.trim() || undefined,
  }))

  const sire = breeding.pedigree?.find((a) => a.role === 'sire')?.name
  const dam = breeding.pedigree?.find((a) => a.role === 'dam')?.name
  const pedigreeSummary =
    sire || dam
      ? `Rodiče: ${[sire && `otec ${sire}`, dam && `matka ${dam}`].filter(Boolean).join(', ')}`
      : breeding.info?.notes?.trim() || undefined

  const status = breeding.info?.kennelName
    ? `Chovatelská stanice ${breeding.info.kennelName}`
    : undefined

  const publicBreeding: DiscoverBreedingPublic = {
    status,
    titles: titles.length ? titles : undefined,
    shows: shows.length ? shows : undefined,
    pedigreeSummary,
    litters: litters.length ? litters : undefined,
  }

  const hasContent =
    publicBreeding.status ||
    publicBreeding.titles?.length ||
    publicBreeding.shows?.length ||
    publicBreeding.pedigreeSummary ||
    publicBreeding.litters?.length

  if (!hasContent) return { breedingProfile: true }

  return { breedingProfile: true, breeding: publicBreeding }
}

/**
 * Project an owned Pet into a public DiscoverPet payload.
 * Caller must ensure `publicDiscover` is true. Never copies health/chip/PII.
 */
export function projectOwnedPetToDiscover(pet: Pet): DiscoverPet | null {
  if (!pet.publicDiscover) return null
  if (!pet.name?.trim() || !pet.breed?.trim() || !pet.image?.trim()) return null
  if (pet.type !== 'dog' && pet.type !== 'cat') return null

  const age = typeof pet.age === 'number' && Number.isFinite(pet.age) ? pet.age : 0
  const location = getUserHomeCity()
  const breeding = mapPublicBreeding(pet.breedingProfile, pet.breeding)

  const projected: DiscoverPet = {
    id: pet.id,
    name: pet.name.trim(),
    type: pet.type,
    breed: pet.breed.trim(),
    age,
    location,
    image: pet.image,
    verified: pet.microchipVerification?.status === 'found',
    ownerId: SELF_OWNER_ID,
    ownerName: getUserDisplayName(),
    bio: pet.bio?.trim() || undefined,
    gender: pet.gender?.trim() || undefined,
    personality: pet.personality?.trim() || undefined,
    likes: pet.likes?.length ? [...pet.likes] : undefined,
    dislikes: pet.dislikes?.length ? [...pet.dislikes] : undefined,
    lookingFor: pet.lookingFor?.trim() || undefined,
    engagement: resolveEngagement(pet.id, pet.discoverEngagement),
    ...breeding,
  }

  return projected
}
