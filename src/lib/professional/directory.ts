import type { Verification } from '../verification/types'
import { loadVerifications } from '../verification/storage'
import { getRoleMeta } from './catalog'
import { toPublicProfessionalProfile } from './public'
import { isProfessionalType } from './roles'
import { loadProfessionalProfiles } from './storage'
import type { ProfessionalType, PublicProfessionalProfile } from './types'

/** Catalog category → professional type (owner excluded). */
export type CatalogRoleFilter = {
  role: ProfessionalType
  /** UI label without emoji (emoji lives in UI only). */
  label: string
  /** Short Czech catalog label for chips. */
  catalogLabel: string
}

/**
 * Stable catalog categories mapped 1:1 to ROLE_CATALOG professional types.
 * Extensible: add a row when a new known professional type ships.
 */
export const CATALOG_ROLE_FILTERS: readonly CatalogRoleFilter[] = [
  { role: 'veterinarian', label: 'Veterináři', catalogLabel: 'Veterináři' },
  { role: 'veterinary_clinic', label: 'Veterinární kliniky', catalogLabel: 'Veterinární kliniky' },
  { role: 'shelter', label: 'Útulky', catalogLabel: 'Útulky' },
  { role: 'groomer', label: 'Grooming', catalogLabel: 'Grooming' },
  { role: 'trainer', label: 'Trenéři', catalogLabel: 'Trenéři' },
  { role: 'breeder', label: 'Chovatelé / chovné stanice', catalogLabel: 'Chovatelé' },
  { role: 'pet_hotel', label: 'Pet-friendly ubytování', catalogLabel: 'Ubytování' },
  { role: 'pet_service', label: 'Další služby', catalogLabel: 'Další služby' },
] as const

export const CATALOG_ROLE_SET = new Set<string>(
  CATALOG_ROLE_FILTERS.map((c) => c.role),
)

export type CatalogSpeciesFilter = 'all' | 'dog' | 'cat'

/**
 * Catalog filter criteria.
 * Functional: role, q, city, verifiedOnly, serviceQuery.
 * Prepared but ignored (no model data yet): distanceKm, species.
 */
export type ProfessionalCatalogCriteria = {
  role?: ProfessionalType | ''
  q?: string
  city?: string
  verifiedOnly?: boolean
  serviceQuery?: string
  /** Prepared — not applied until lat/lng exist on public projection. */
  distanceKm?: number | null
  /** Prepared — not applied until species exists on professional profiles. */
  species?: CatalogSpeciesFilter
}

export type ProfessionalCatalogCriteriaFunctional = Pick<
  ProfessionalCatalogCriteria,
  'role' | 'q' | 'city' | 'verifiedOnly' | 'serviceQuery'
>

function normalizeNeedle(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase()
}

function includesNeedle(haystack: string | undefined | null, needle: string): boolean {
  if (!needle) return true
  return normalizeNeedle(haystack).includes(needle)
}

/**
 * List all publicly visible professional profiles via the existing projection.
 * Owner / non-professional types never appear.
 */
export function listPublicProfessionals(
  verifications: Verification[] = loadVerifications(),
): PublicProfessionalProfile[] {
  const profiles = loadProfessionalProfiles()
  const out: PublicProfessionalProfile[] = []
  for (const profile of profiles) {
    if (!isProfessionalType(profile.type)) continue
    const pub = toPublicProfessionalProfile(profile, { verifications })
    if (pub) out.push(pub)
  }
  return out
}

/** Case-insensitive match over safe public fields only (never email/phone/id internals). */
export function matchProfessionalCatalogQuery(
  pub: PublicProfessionalProfile,
  q: string | undefined,
): boolean {
  const needle = normalizeNeedle(q)
  if (!needle) return true

  if (includesNeedle(pub.displayName, needle)) return true
  if (includesNeedle(pub.organizationName, needle)) return true
  if (includesNeedle(pub.description, needle)) return true
  if (includesNeedle(pub.city, needle)) return true
  if (includesNeedle(pub.type, needle)) return true
  if (includesNeedle(getRoleMeta(pub.type).label, needle)) return true
  if (pub.services?.some((s) => includesNeedle(s, needle))) return true
  if (pub.specializations?.some((s) => includesNeedle(s, needle))) return true
  return false
}

function matchesServiceQuery(
  pub: PublicProfessionalProfile,
  serviceQuery: string | undefined,
): boolean {
  const needle = normalizeNeedle(serviceQuery)
  if (!needle) return true
  if (pub.services?.some((s) => includesNeedle(s, needle))) return true
  if (pub.specializations?.some((s) => includesNeedle(s, needle))) return true
  return false
}

/** Filter public professionals. Distance / species are intentionally ignored. */
export function filterPublicProfessionals(
  list: PublicProfessionalProfile[],
  criteria: ProfessionalCatalogCriteria = {},
): PublicProfessionalProfile[] {
  const role = (criteria.role ?? '').trim()
  const cityNeedle = normalizeNeedle(criteria.city)
  const verifiedOnly = Boolean(criteria.verifiedOnly)

  return list.filter((pub) => {
    if (role && pub.type !== role) return false
    if (!matchProfessionalCatalogQuery(pub, criteria.q)) return false
    if (cityNeedle && !includesNeedle(pub.city, cityNeedle)) return false
    if (verifiedOnly && pub.verifiedBadge !== true) return false
    if (!matchesServiceQuery(pub, criteria.serviceQuery)) return false
    return true
  })
}

/** Relevance: higher = better match for sort. */
export function catalogRelevanceScore(
  pub: PublicProfessionalProfile,
  q: string | undefined,
): number {
  const needle = normalizeNeedle(q)
  if (!needle) return 0

  let score = 0
  const name = normalizeNeedle(pub.displayName)
  const org = normalizeNeedle(pub.organizationName)
  if (name === needle) score += 100
  else if (name.startsWith(needle)) score += 80
  else if (name.includes(needle)) score += 60
  if (org === needle) score += 50
  else if (org.includes(needle)) score += 30
  if (includesNeedle(pub.city, needle)) score += 20
  if (includesNeedle(getRoleMeta(pub.type).label, needle)) score += 15
  if (pub.services?.some((s) => includesNeedle(s, needle))) score += 10
  if (pub.specializations?.some((s) => includesNeedle(s, needle))) score += 10
  if (includesNeedle(pub.description, needle)) score += 5
  return score
}

/**
 * Deterministic sort:
 * 1. search relevance
 * 2. selected category match
 * 3. verified badge
 * 4. city match
 * 5. displayName + id fallback
 */
export function sortPublicProfessionals(
  list: PublicProfessionalProfile[],
  criteria: ProfessionalCatalogCriteria = {},
): PublicProfessionalProfile[] {
  const role = (criteria.role ?? '').trim()
  const cityNeedle = normalizeNeedle(criteria.city)
  const q = criteria.q

  return [...list].sort((a, b) => {
    const rel = catalogRelevanceScore(b, q) - catalogRelevanceScore(a, q)
    if (rel !== 0) return rel

    if (role) {
      const aRole = a.type === role ? 1 : 0
      const bRole = b.type === role ? 1 : 0
      if (bRole !== aRole) return bRole - aRole
    }

    const aVer = a.verifiedBadge ? 1 : 0
    const bVer = b.verifiedBadge ? 1 : 0
    if (bVer !== aVer) return bVer - aVer

    if (cityNeedle) {
      const aCity = includesNeedle(a.city, cityNeedle) ? 1 : 0
      const bCity = includesNeedle(b.city, cityNeedle) ? 1 : 0
      if (bCity !== aCity) return bCity - aCity
    }

    const nameCmp = a.displayName.localeCompare(b.displayName, 'cs', {
      sensitivity: 'base',
    })
    if (nameCmp !== 0) return nameCmp
    return a.id.localeCompare(b.id)
  })
}

/** List → filter → sort in one call. */
export function queryPublicProfessionals(
  criteria: ProfessionalCatalogCriteria = {},
  verifications: Verification[] = loadVerifications(),
): PublicProfessionalProfile[] {
  const all = listPublicProfessionals(verifications)
  return sortPublicProfessionals(filterPublicProfessionals(all, criteria), criteria)
}

export function parseCatalogSearchParams(
  params: URLSearchParams | Record<string, string | undefined | null>,
): ProfessionalCatalogCriteria {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) return params.get(key) ?? ''
    return String(params[key] ?? '')
  }

  const roleRaw = get('role').trim()
  const role =
    roleRaw && isProfessionalType(roleRaw) && roleRaw !== 'owner'
      ? (roleRaw as ProfessionalType)
      : ''

  const location = get('location').trim() || get('city').trim()
  const verifiedRaw = get('verified').trim().toLowerCase()
  const verifiedOnly =
    verifiedRaw === '1' || verifiedRaw === 'true' || verifiedRaw === 'yes'

  return {
    role: role || '',
    q: get('q').trim(),
    city: location,
    verifiedOnly,
    serviceQuery: get('service').trim(),
    // Prepared-only — parsed if present but never applied by filter.
    distanceKm: null,
    species: 'all',
  }
}

export function buildCatalogSearchParams(
  criteria: ProfessionalCatalogCriteria,
): URLSearchParams {
  const params = new URLSearchParams()
  const role = (criteria.role ?? '').trim()
  if (role) params.set('role', role)
  const q = (criteria.q ?? '').trim()
  if (q) params.set('q', q)
  const city = (criteria.city ?? '').trim()
  if (city) params.set('location', city)
  if (criteria.verifiedOnly) params.set('verified', '1')
  const service = (criteria.serviceQuery ?? '').trim()
  if (service) params.set('service', service)
  return params
}

export function catalogHasActiveFilters(criteria: ProfessionalCatalogCriteria): boolean {
  return Boolean(
    (criteria.role ?? '').trim() ||
      (criteria.q ?? '').trim() ||
      (criteria.city ?? '').trim() ||
      criteria.verifiedOnly ||
      (criteria.serviceQuery ?? '').trim(),
  )
}

export function getCatalogRoleFilter(role: string): CatalogRoleFilter | undefined {
  return CATALOG_ROLE_FILTERS.find((c) => c.role === role)
}
