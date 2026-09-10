/**
 * Extensible Discover engagement metrics.
 * MVP may seed or increment a subset; later wire profile views, likes, etc.
 */
export interface DiscoverEngagementStats {
  profileViews?: number
  favorites?: number
  connections?: number
  communityInteractions?: number
  /** Free-form activity points (gallery updates, etc.). */
  activityPoints?: number
}

const ENGAGEMENT_KEY = 'lovedandknown.discoverEngagement'

function emptyStats(): DiscoverEngagementStats {
  return {}
}

export function loadDiscoverEngagementMap(): Record<string, DiscoverEngagementStats> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ENGAGEMENT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, DiscoverEngagementStats> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      const row = value as Record<string, unknown>
      out[id] = {
        profileViews: typeof row.profileViews === 'number' ? row.profileViews : undefined,
        favorites: typeof row.favorites === 'number' ? row.favorites : undefined,
        connections: typeof row.connections === 'number' ? row.connections : undefined,
        communityInteractions:
          typeof row.communityInteractions === 'number'
            ? row.communityInteractions
            : undefined,
        activityPoints: typeof row.activityPoints === 'number' ? row.activityPoints : undefined,
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveDiscoverEngagementMap(map: Record<string, DiscoverEngagementStats>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(map))
  } catch {
    // best-effort
  }
}

export function getDiscoverEngagement(petId: string): DiscoverEngagementStats {
  return loadDiscoverEngagementMap()[petId] ?? emptyStats()
}

export function mergeEngagement(
  base: DiscoverEngagementStats | undefined,
  overlay: DiscoverEngagementStats | undefined,
): DiscoverEngagementStats {
  return {
    profileViews: (overlay?.profileViews ?? 0) + (base?.profileViews ?? 0) || undefined,
    favorites: Math.max(overlay?.favorites ?? 0, base?.favorites ?? 0) || undefined,
    connections: (overlay?.connections ?? 0) + (base?.connections ?? 0) || undefined,
    communityInteractions:
      (overlay?.communityInteractions ?? 0) + (base?.communityInteractions ?? 0) || undefined,
    activityPoints: (overlay?.activityPoints ?? 0) + (base?.activityPoints ?? 0) || undefined,
  }
}

/** Prefer stored runtime stats over seed; take max for counters that shouldn't double-count badly. */
export function resolveEngagement(
  petId: string,
  seeded?: DiscoverEngagementStats,
): DiscoverEngagementStats {
  const stored = getDiscoverEngagement(petId)
  return {
    profileViews: Math.max(seeded?.profileViews ?? 0, stored.profileViews ?? 0) || undefined,
    favorites: Math.max(seeded?.favorites ?? 0, stored.favorites ?? 0) || undefined,
    connections: Math.max(seeded?.connections ?? 0, stored.connections ?? 0) || undefined,
    communityInteractions:
      Math.max(seeded?.communityInteractions ?? 0, stored.communityInteractions ?? 0) ||
      undefined,
    activityPoints: Math.max(seeded?.activityPoints ?? 0, stored.activityPoints ?? 0) || undefined,
  }
}

export function bumpDiscoverEngagement(
  petId: string,
  patch: Partial<DiscoverEngagementStats>,
): DiscoverEngagementStats {
  const map = loadDiscoverEngagementMap()
  const current = map[petId] ?? emptyStats()
  const next: DiscoverEngagementStats = {
    profileViews: (current.profileViews ?? 0) + (patch.profileViews ?? 0) || undefined,
    favorites: (current.favorites ?? 0) + (patch.favorites ?? 0) || undefined,
    connections: (current.connections ?? 0) + (patch.connections ?? 0) || undefined,
    communityInteractions:
      (current.communityInteractions ?? 0) + (patch.communityInteractions ?? 0) || undefined,
    activityPoints: (current.activityPoints ?? 0) + (patch.activityPoints ?? 0) || undefined,
  }
  map[petId] = next
  saveDiscoverEngagementMap(map)
  return next
}
