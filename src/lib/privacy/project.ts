import type {
  DiscoverBreedingPublic,
  DiscoverPet,
  DiscoverPublicPhoto,
  Pet,
  PetBreedingData,
  PetPhoto,
} from '../../types'
import type { EarnedBadge } from '../../types/badges'
import type { Verification } from '../../types/verification'
import { toPublicBadges } from '../badges/toPublicBadges'
import { toPublicConnectionPreferences } from '../connections'
import { SELF_OWNER_ID, getUserDisplayName } from '../discover/owner'
import { resolveEngagement } from '../discover/engagement'
import { getUserHomeCity } from '../userProfile'
import { toSafePublicLabel } from '../lostPet/privacy'
import { toPublicTrustBadges } from '../verification/public'
import { canViewAccountField, canViewPetField } from './access'
import { PUBLIC_PAYLOAD_FORBIDDEN_KEYS } from './fields'
import type { PrivacySettings, ViewerRole } from './types'

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
 * Connection-scoped projection — may include fields that are never allowed
 * on Discover / public payloads (weight, chip, health summary, etc.).
 */
export type ConnectionPetProjection = {
  id: string
  name?: string
  type?: Pet['type']
  breed?: string
  age?: number
  dateOfBirth?: string
  image?: string
  location?: string
  weight?: number
  microchip?: string
  healthStatus?: Pet['healthStatus']
  allergies?: string
  medications?: string
  breedingProfile?: boolean
  breeding?: DiscoverBreedingPublic
  ownerContacts?: {
    phone?: string
    email?: string
    address?: string
  }
}

export type ProjectPetOptions = {
  settings?: PrivacySettings | null
  earnedBadges?: EarnedBadge[]
  /** Optional owner contact values for connection-level sharing. */
  ownerContacts?: { phone?: string; email?: string; address?: string }
  /** Verification records (private). Only safe publicTrustBadges are projected. */
  verifications?: Verification[]
  ownerId?: string
  /**
   * Owned gallery photos. When `photos` is public (required for Discover),
   * mapped to DiscoverPublicPhoto — never documents / health / emergency media.
   */
  petPhotos?: PetPhoto[]
}

/** Map owned PetPhoto rows for one pet into a public Discover gallery. */
export function mapPublicGallery(
  petId: string,
  petPhotos: PetPhoto[] | undefined,
): DiscoverPublicPhoto[] | undefined {
  if (!petPhotos?.length) return undefined
  const gallery = petPhotos
    .filter((photo) => photo.petId === petId && Boolean(photo.url?.trim()))
    .map((photo) => ({
      id: photo.id,
      url: photo.url.trim(),
      caption: photo.caption?.trim() || undefined,
    }))
  return gallery.length > 0 ? gallery : undefined
}

function safePublicLocation(raw?: string): string {
  const city = getUserHomeCity()
  if (raw?.trim()) return toSafePublicLabel(raw)
  return toSafePublicLabel(city)
}

/**
 * Project an owned pet for a specific viewer role.
 * Public / Discover callers must still run sanitizeDiscoverPet on the result
 * of projectPublicPet — never use this for Discover with viewer !== 'public'.
 */
export function projectForViewer(
  pet: Pet,
  viewer: ViewerRole,
  options: ProjectPetOptions = {},
): ConnectionPetProjection | null {
  const settings = options.settings
  const can = (field: Parameters<typeof canViewPetField>[2]) =>
    canViewPetField(settings, pet.id, field, viewer)

  if (viewer === 'owner') {
    return {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      age: pet.age,
      dateOfBirth: pet.dateOfBirth,
      image: pet.image,
      location: pet.foundPublic?.approximateArea || getUserHomeCity(),
      weight: pet.weight,
      microchip: pet.microchip,
      healthStatus: pet.healthStatus,
      allergies: pet.emergencyCard?.health?.allergies,
      medications: pet.emergencyCard?.health?.regularMedication,
      ...mapPublicBreeding(pet.breedingProfile, pet.breeding),
      ownerContacts: options.ownerContacts,
    }
  }

  const out: ConnectionPetProjection = { id: pet.id }

  if (can('name')) out.name = pet.name?.trim() || undefined
  if (can('speciesBreed')) {
    out.type = pet.type
    out.breed = pet.breed?.trim() || undefined
  }
  if (can('ageDob')) {
    if (typeof pet.age === 'number' && Number.isFinite(pet.age)) out.age = pet.age
    if (pet.dateOfBirth?.trim()) out.dateOfBirth = pet.dateOfBirth
  }
  if (can('photos')) out.image = pet.image?.trim() || undefined
  if (can('location')) out.location = safePublicLocation()
  if (can('weight') && typeof pet.weight === 'number') out.weight = pet.weight
  if (can('microchip') && pet.microchip?.trim()) out.microchip = pet.microchip.trim()
  if (can('health') && pet.healthStatus) out.healthStatus = pet.healthStatus
  if (can('allergies')) {
    const allergies = pet.emergencyCard?.health?.allergies?.trim()
    if (allergies) out.allergies = allergies
  }
  if (can('medications')) {
    const meds = pet.emergencyCard?.health?.regularMedication?.trim()
    if (meds) out.medications = meds
  }
  if (can('breeding')) {
    Object.assign(out, mapPublicBreeding(pet.breedingProfile, pet.breeding))
  }

  if (
    canViewAccountField(settings, 'ownerContacts', viewer) &&
    options.ownerContacts
  ) {
    out.ownerContacts = { ...options.ownerContacts }
  }

  return out
}

/**
 * Build a Discover-shaped public payload respecting field privacy.
 * Returns null if publicDiscover is off or required public identity fields are missing.
 * Never copies health/chip/PII — hard-forbidden even if misconfigured.
 */
export function projectPublicPet(
  pet: Pet,
  options: ProjectPetOptions = {},
): DiscoverPet | null {
  if (!pet.publicDiscover) return null

  const settings = options.settings
  const viewer: ViewerRole = 'public'
  const can = (field: Parameters<typeof canViewPetField>[2]) =>
    canViewPetField(settings, pet.id, field, viewer)

  if (!can('name') || !can('photos') || !can('speciesBreed') || !can('ageDob') || !can('location')) {
    return null
  }

  if (!pet.name?.trim() || !pet.breed?.trim() || !pet.image?.trim()) return null
  if (pet.type !== 'dog' && pet.type !== 'cat') return null

  const age = typeof pet.age === 'number' && Number.isFinite(pet.age) ? pet.age : 0
  const location = safePublicLocation()
  const breeding = can('breeding')
    ? mapPublicBreeding(pet.breedingProfile, pet.breeding)
    : {}
  const publicBadges = toPublicBadges(pet, options.earnedBadges ?? [])
  const ownerId = options.ownerId ?? SELF_OWNER_ID
  const publicTrustBadges = toPublicTrustBadges(options.verifications ?? [], {
    petId: pet.id,
    ownerId,
  })

  const projected: DiscoverPet = {
    id: pet.id,
    name: pet.name.trim(),
    type: pet.type,
    breed: pet.breed.trim(),
    age,
    location,
    image: pet.image,
    ownerId,
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

  if (publicTrustBadges.length > 0) {
    projected.publicTrustBadges = publicTrustBadges
  }

  if (publicBadges.length > 0) {
    projected.publicBadges = publicBadges
  }

  const connectionPreferences = toPublicConnectionPreferences(pet.connectionPreferences)
  if (connectionPreferences) {
    projected.connectionPreferences = connectionPreferences
  }

  // Gallery: only when photos are public (already required above). No per-photo flag.
  // Activities / publicTimeline: owned models lack a safe public visibility gate —
  // leave as extension points (mock Discover pets may still carry them via sanitize).
  const gallery = mapPublicGallery(pet.id, options.petPhotos)
  if (gallery) {
    projected.gallery = gallery
  }

  // Runtime backstop: strip any accidental forbidden keys before return.
  const record = projected as unknown as Record<string, unknown>
  for (const key of PUBLIC_PAYLOAD_FORBIDDEN_KEYS) {
    if (key in record) delete record[key]
  }

  return projected
}

/** Whether community tagging is allowed for this pet under privacy + publicDiscover. */
export function canTagPetInCommunity(
  pet: Pet,
  settings?: PrivacySettings | null,
): boolean {
  if (!pet.publicDiscover) return false
  return canViewPetField(settings, pet.id, 'postsAndTagging', 'public')
}

export { mapPublicBreeding }
