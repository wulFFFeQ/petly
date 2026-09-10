import type { DiscoverCriteria } from '../discoverCriteria'
import { DEFAULT_DISCOVER_CRITERIA } from '../discoverCriteria'

const FILTERS_SESSION_KEY = 'lovedandknown.discoverFilters'

export type PersistedDiscoverFilters = {
  search: string
  criteria: DiscoverCriteria
}

function isDiscoverCriteria(value: unknown): value is DiscoverCriteria {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const c = value as Record<string, unknown>
  return (
    (c.species === 'all' || c.species === 'dog' || c.species === 'cat') &&
    typeof c.nearby === 'boolean' &&
    typeof c.popular === 'boolean' &&
    typeof c.verified === 'boolean' &&
    typeof c.breeding === 'boolean' &&
    Array.isArray(c.locations) &&
    Array.isArray(c.locationAnchors) &&
    Array.isArray(c.activities) &&
    Array.isArray(c.seeking)
  )
}

export function loadDiscoverFiltersFromSession(): PersistedDiscoverFilters | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(FILTERS_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedDiscoverFilters>
    const search = typeof parsed.search === 'string' ? parsed.search : ''
    const criteria = isDiscoverCriteria(parsed.criteria)
      ? {
          ...DEFAULT_DISCOVER_CRITERIA,
          ...parsed.criteria,
          locationRadiusKm:
            parsed.criteria.locationRadiusKm === null ||
            parsed.criteria.locationRadiusKm === 10 ||
            parsed.criteria.locationRadiusKm === 20 ||
            parsed.criteria.locationRadiusKm === 30 ||
            parsed.criteria.locationRadiusKm === 40 ||
            parsed.criteria.locationRadiusKm === 50
              ? parsed.criteria.locationRadiusKm
              : DEFAULT_DISCOVER_CRITERIA.locationRadiusKm,
        }
      : DEFAULT_DISCOVER_CRITERIA
    return { search, criteria }
  } catch {
    return null
  }
}

export function saveDiscoverFiltersToSession(filters: PersistedDiscoverFilters): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(FILTERS_SESSION_KEY, JSON.stringify(filters))
  } catch {
    // best-effort
  }
}

export function clearDiscoverFiltersSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(FILTERS_SESSION_KEY)
  } catch {
    // ignore
  }
}

export { FILTERS_SESSION_KEY as DISCOVER_FILTERS_SESSION_KEY }
