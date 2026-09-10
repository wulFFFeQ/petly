import type { DiscoverPet, Pet, PetType } from '../../types'
import { distanceKmBetweenCities, distanceKmFromHome } from '../discover/distance'
import { getUserHomeCity } from '../userProfile'
import type { ConnectionActivityId } from './activities'
import { hasPublicConnectionPreferences } from './normalize'
import { toPublicConnectionPreferences } from './normalize'

export const CONNECTION_EMPTY_TITLE = 'Zatím jsme nenašli vhodného parťáka.'
export const CONNECTION_EMPTY_DESCRIPTION =
  'Zkuste rozšířit vzdálenost nebo vybrat více aktivit.'

export type ConnectionRecommendContext = {
  /** Own pet used as scoring context (optional). */
  contextPet?: Pet | null
  /** Active connection-activity filter IDs from Discover. */
  filterActivityIds?: ConnectionActivityId[]
  /** Home city override (defaults to user home). */
  homeCity?: string
}

function candidateActivityIds(pet: DiscoverPet): ConnectionActivityId[] {
  const prefs = pet.connectionPreferences
  if (!prefs) return []
  const fromLooking = prefs.lookingFor ?? []
  const fromActivities = prefs.activityTypes ?? []
  const merged = new Set<ConnectionActivityId>([...fromLooking, ...fromActivities])
  return [...merged]
}

/** Eligible for buddy recommendations (public prefs present). */
export function isConnectionCandidate(pet: DiscoverPet): boolean {
  return hasPublicConnectionPreferences(pet.connectionPreferences)
}

/**
 * Filter candidates that offer connection and match optional activity filter.
 * Does not exclude by distance — that is handled by Discover criteria / scoring.
 */
export function filterConnectionCandidates(
  pets: DiscoverPet[],
  filterActivityIds: ConnectionActivityId[] = [],
): DiscoverPet[] {
  return pets.filter((pet) => {
    if (!isConnectionCandidate(pet)) return false
    if (filterActivityIds.length === 0) return true
    const ids = candidateActivityIds(pet)
    return filterActivityIds.some((id) => ids.includes(id))
  })
}

function contextActivityIds(contextPet: Pet | null | undefined): ConnectionActivityId[] {
  const pub = toPublicConnectionPreferences(contextPet?.connectionPreferences)
  if (pub) return [...pub.lookingFor, ...pub.activityTypes]
  const raw = contextPet?.connectionPreferences
  if (!raw) return []
  return [...(raw.lookingFor ?? []), ...(raw.activityTypes ?? [])]
}

function sharedCount(a: ConnectionActivityId[], b: ConnectionActivityId[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  return a.filter((id) => setB.has(id)).length
}

/**
 * Deterministic internal score for ranking only — never show to the user.
 *
 * Weights:
 * - shared activities with context / filter
 * - same species
 * - closer distance
 * - has public connection prefs (eligibility already required)
 */
export function scoreConnectionCandidate(
  pet: DiscoverPet,
  context: ConnectionRecommendContext = {},
): number {
  let score = 0
  const petIds = candidateActivityIds(pet)
  const filterIds = context.filterActivityIds ?? []
  const ctxIds = contextActivityIds(context.contextPet)

  if (petIds.length > 0) score += 10

  const filterOverlap = sharedCount(petIds, filterIds)
  score += filterOverlap * 25

  const ctxOverlap = sharedCount(petIds, ctxIds)
  score += ctxOverlap * 20

  const ctxType: PetType | undefined = context.contextPet?.type
  if (ctxType && pet.type === ctxType) score += 15
  else if (!ctxType) score += 5

  const home = context.homeCity?.trim() || getUserHomeCity()
  const km =
    home === getUserHomeCity()
      ? distanceKmFromHome(pet.location)
      : distanceKmBetweenCities(home, pet.location)

  if (km != null) {
    if (km <= 10) score += 30
    else if (km <= 20) score += 22
    else if (km <= 30) score += 15
    else if (km <= 50) score += 8
    else score += 2
    // Slight continuous preference for nearer pets (stable tie-break).
    score += Math.max(0, 20 - Math.min(20, km / 5))
  }

  return score
}

/** Sort pets by connection score (desc). Stable by id for ties. */
export function rankConnectionCandidates(
  pets: DiscoverPet[],
  context: ConnectionRecommendContext = {},
): DiscoverPet[] {
  return [...pets].sort((a, b) => {
    const diff = scoreConnectionCandidate(b, context) - scoreConnectionCandidate(a, context)
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })
}

/**
 * Apply connection ranking when filters or a context pet with prefs are active.
 * Otherwise returns pets unchanged (preserves Discover popularity order).
 */
export function applyConnectionRanking(
  pets: DiscoverPet[],
  context: ConnectionRecommendContext = {},
): DiscoverPet[] {
  const hasFilter = (context.filterActivityIds?.length ?? 0) > 0
  const hasContextPrefs = Boolean(
    toPublicConnectionPreferences(context.contextPet?.connectionPreferences) ||
      (context.contextPet?.connectionPreferences?.enabled &&
        (context.contextPet.connectionPreferences.lookingFor?.length ?? 0) > 0),
  )
  if (!hasFilter && !hasContextPrefs) return pets
  return rankConnectionCandidates(pets, context)
}

export function shouldShowConnectionEmptyState(
  filteredCount: number,
  filterActivityIds: ConnectionActivityId[],
): boolean {
  return filteredCount === 0 && filterActivityIds.length > 0
}
