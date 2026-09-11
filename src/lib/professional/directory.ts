import type { Verification } from '../verification/types'
import { loadVerifications } from '../verification/storage'
import {
  buildReviewSummaryMap,
  type CatalogMinRatingFilter,
  type CatalogReviewSort,
  type ProfessionalReviewSummary,
} from '../reviews'
import { loadProfessionalReviews } from '../reviews/storage'
import {
  SERVICE_CATEGORIES,
  listPublicServices,
  type ServiceCategory,
} from '../booking'
import { isServiceCategory, SERVICE_CATEGORY_LABELS } from '../booking/serviceCategories'
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

export const CATALOG_MIN_RATING_OPTIONS: readonly {
  value: CatalogMinRatingFilter | ''
  label: string
}[] = [
  { value: '', label: 'Libovolné' },
  { value: 4.5, label: '4,5+' },
  { value: 4.0, label: '4,0+' },
  { value: 3.5, label: '3,5+' },
  { value: 'none', label: 'Bez hodnocení' },
] as const

export const CATALOG_SORT_OPTIONS: readonly {
  value: CatalogReviewSort
  label: string
}[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Hodnocení' },
  { value: 'reviewCount', label: 'Počet hodnocení' },
] as const

export type CatalogSpeciesFilter = 'all' | 'dog' | 'cat'

/**
 * Catalog filter criteria.
 * Functional: role, q, city, verifiedOnly, serviceQuery, serviceCategory, maxPrice, minRating, sortBy.
 * Prepared but ignored (no model data yet): distanceKm, species.
 */
export type ProfessionalCatalogCriteria = {
  role?: ProfessionalType | ''
  q?: string
  city?: string
  verifiedOnly?: boolean
  serviceQuery?: string
  /** Filter by public active ProfessionalService category. */
  serviceCategory?: ServiceCategory | ''
  /** Max price among public active priced services (CZK). */
  maxPrice?: number | null
  /** Real review average threshold — or 'none' for zero reviews. */
  minRating?: CatalogMinRatingFilter | ''
  /** Sort mode — rating uses confidenceScore, not raw average alone. */
  sortBy?: CatalogReviewSort
  /** Prepared — not applied until lat/lng exist on public projection. */
  distanceKm?: number | null
  /** Prepared — not applied until species exists on professional profiles. */
  species?: CatalogSpeciesFilter
}

/** Public profile + optional review summary enrichment (never mixes with verification). */
export type CatalogProfessionalCard = PublicProfessionalProfile & {
  reviewSummary?: ProfessionalReviewSummary
}

export type ProfessionalCatalogCriteriaFunctional = Pick<
  ProfessionalCatalogCriteria,
  | 'role'
  | 'q'
  | 'city'
  | 'verifiedOnly'
  | 'serviceQuery'
  | 'serviceCategory'
  | 'maxPrice'
  | 'minRating'
  | 'sortBy'
>

export const CATALOG_SERVICE_CATEGORY_OPTIONS: readonly {
  value: ServiceCategory | ''
  label: string
}[] = [
  { value: '', label: 'Všechny služby' },
  ...SERVICE_CATEGORIES.map((c) => ({
    value: c,
    label: SERVICE_CATEGORY_LABELS[c],
  })),
]

export const CATALOG_MAX_PRICE_OPTIONS: readonly {
  value: number | ''
  label: string
}[] = [
  { value: '', label: 'Libovolná cena' },
  { value: 300, label: 'do 300 Kč' },
  { value: 500, label: 'do 500 Kč' },
  { value: 800, label: 'do 800 Kč' },
  { value: 1200, label: 'do 1 200 Kč' },
  { value: 2000, label: 'do 2 000 Kč' },
]

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
  // Public active structured services (names only — never notes).
  const structured = listPublicServices(pub.id)
  if (structured.some((s) => includesNeedle(s.name, needle))) return true
  if (structured.some((s) => includesNeedle(s.description, needle))) return true
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
  const structured = listPublicServices(pub.id)
  if (structured.some((s) => includesNeedle(s.name, needle))) return true
  if (structured.some((s) => includesNeedle(s.description, needle))) return true
  if (structured.some((s) => includesNeedle(SERVICE_CATEGORY_LABELS[s.category], needle))) {
    return true
  }
  return false
}

function matchesServiceCategory(
  pub: PublicProfessionalProfile,
  serviceCategory: ServiceCategory | '' | undefined,
): boolean {
  if (!serviceCategory) return true
  return listPublicServices(pub.id).some((s) => s.category === serviceCategory)
}

function matchesMaxPrice(
  pub: PublicProfessionalProfile,
  maxPrice: number | null | undefined,
): boolean {
  if (maxPrice == null || !Number.isFinite(maxPrice) || maxPrice <= 0) return true
  const priced = listPublicServices(pub.id).filter(
    (s) => s.priceType !== 'on_request' && s.price !== undefined && s.price >= 0,
  )
  if (priced.length === 0) return false
  return priced.some((s) => (s.price as number) <= maxPrice)
}

function matchesMinRating(
  summary: ProfessionalReviewSummary | undefined,
  minRating: CatalogMinRatingFilter | '' | undefined,
): boolean {
  if (minRating === undefined || minRating === '') return true
  if (minRating === 'none') return !summary || summary.count === 0
  const avg = summary?.average
  if (avg == null || !summary || summary.count === 0) return false
  return avg >= minRating
}

/** Filter public professionals. Distance / species are intentionally ignored. */
export function filterPublicProfessionals(
  list: PublicProfessionalProfile[],
  criteria: ProfessionalCatalogCriteria = {},
  reviewSummaries?: Map<string, ProfessionalReviewSummary>,
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
    if (!matchesServiceCategory(pub, criteria.serviceCategory)) return false
    if (!matchesMaxPrice(pub, criteria.maxPrice)) return false
    if (reviewSummaries) {
      if (!matchesMinRating(reviewSummaries.get(pub.id), criteria.minRating)) return false
    } else if (criteria.minRating) {
      if (criteria.minRating !== 'none') return false
    }
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
  const structured = listPublicServices(pub.id)
  if (structured.some((s) => includesNeedle(s.name, needle))) score += 12
  if (includesNeedle(pub.description, needle)) score += 5
  return score
}

/**
 * Deterministic sort:
 * - sortBy rating → confidenceScore (Bayesian-ready), then count
 * - sortBy reviewCount → count, then confidence
 * - default relevance: search → role → verified → city → name
 */
export function sortPublicProfessionals(
  list: PublicProfessionalProfile[],
  criteria: ProfessionalCatalogCriteria = {},
  reviewSummaries?: Map<string, ProfessionalReviewSummary>,
): PublicProfessionalProfile[] {
  const role = (criteria.role ?? '').trim()
  const cityNeedle = normalizeNeedle(criteria.city)
  const q = criteria.q
  const sortBy = criteria.sortBy ?? 'relevance'

  return [...list].sort((a, b) => {
    if (sortBy === 'rating' && reviewSummaries) {
      const aConf = reviewSummaries.get(a.id)?.confidenceScore ?? -1
      const bConf = reviewSummaries.get(b.id)?.confidenceScore ?? -1
      if (bConf !== aConf) return bConf - aConf
      const aCount = reviewSummaries.get(a.id)?.count ?? 0
      const bCount = reviewSummaries.get(b.id)?.count ?? 0
      if (bCount !== aCount) return bCount - aCount
    }

    if (sortBy === 'reviewCount' && reviewSummaries) {
      const aCount = reviewSummaries.get(a.id)?.count ?? 0
      const bCount = reviewSummaries.get(b.id)?.count ?? 0
      if (bCount !== aCount) return bCount - aCount
      const aConf = reviewSummaries.get(a.id)?.confidenceScore ?? -1
      const bConf = reviewSummaries.get(b.id)?.confidenceScore ?? -1
      if (bConf !== aConf) return bConf - aConf
    }

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

function enrichWithReviews(
  list: PublicProfessionalProfile[],
  reviewSummaries: Map<string, ProfessionalReviewSummary>,
): CatalogProfessionalCard[] {
  return list.map((pub) => ({
    ...pub,
    reviewSummary: reviewSummaries.get(pub.id),
  }))
}

/** List → filter → sort in one call (with real review enrichment). */
export function queryPublicProfessionals(
  criteria: ProfessionalCatalogCriteria = {},
  verifications: Verification[] = loadVerifications(),
): CatalogProfessionalCard[] {
  const all = listPublicProfessionals(verifications)
  const reviews = loadProfessionalReviews()
  const reviewSummaries = buildReviewSummaryMap(
    all.map((p) => p.id),
    reviews,
  )
  const filtered = filterPublicProfessionals(all, criteria, reviewSummaries)
  const sorted = sortPublicProfessionals(filtered, criteria, reviewSummaries)
  return enrichWithReviews(sorted, reviewSummaries)
}

function parseMinRating(raw: string): CatalogMinRatingFilter | '' {
  const v = raw.trim().toLowerCase()
  if (!v) return ''
  if (v === 'none' || v === 'bez') return 'none'
  if (v === '4.5' || v === '4,5') return 4.5
  if (v === '4.0' || v === '4' || v === '4,0') return 4.0
  if (v === '3.5' || v === '3,5') return 3.5
  return ''
}

function parseSortBy(raw: string): CatalogReviewSort {
  const v = raw.trim().toLowerCase()
  if (v === 'rating') return 'rating'
  if (v === 'reviewcount' || v === 'reviews' || v === 'count') return 'reviewCount'
  return 'relevance'
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

  const minRating = parseMinRating(get('rating'))
  const sortBy = parseSortBy(get('sort'))

  const categoryRaw = get('serviceCategory').trim() || get('category').trim()
  const serviceCategory = isServiceCategory(categoryRaw) ? categoryRaw : ''

  const maxPriceRaw = get('maxPrice').trim() || get('price').trim()
  const maxPriceParsed = maxPriceRaw ? Number(maxPriceRaw) : NaN
  const maxPrice =
    Number.isFinite(maxPriceParsed) && maxPriceParsed > 0 ? maxPriceParsed : null

  return {
    role: role || '',
    q: get('q').trim(),
    city: location,
    verifiedOnly,
    serviceQuery: get('service').trim(),
    serviceCategory,
    maxPrice,
    minRating,
    sortBy,
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
  const serviceCategory = (criteria.serviceCategory ?? '').trim()
  if (serviceCategory) params.set('serviceCategory', serviceCategory)
  if (criteria.maxPrice != null && criteria.maxPrice > 0) {
    params.set('maxPrice', String(criteria.maxPrice))
  }
  if (criteria.minRating === 'none') params.set('rating', 'none')
  else if (typeof criteria.minRating === 'number') {
    params.set('rating', String(criteria.minRating))
  }
  if (criteria.sortBy && criteria.sortBy !== 'relevance') {
    params.set('sort', criteria.sortBy === 'reviewCount' ? 'reviewCount' : 'rating')
  }
  return params
}

export function catalogHasActiveFilters(criteria: ProfessionalCatalogCriteria): boolean {
  return Boolean(
    (criteria.role ?? '').trim() ||
      (criteria.q ?? '').trim() ||
      (criteria.city ?? '').trim() ||
      criteria.verifiedOnly ||
      (criteria.serviceQuery ?? '').trim() ||
      (criteria.serviceCategory ?? '').trim() ||
      (criteria.maxPrice != null && criteria.maxPrice > 0) ||
      (criteria.minRating !== undefined && criteria.minRating !== '') ||
      (criteria.sortBy && criteria.sortBy !== 'relevance'),
  )
}

export function getCatalogRoleFilter(role: string): CatalogRoleFilter | undefined {
  return CATALOG_ROLE_FILTERS.find((c) => c.role === role)
}
