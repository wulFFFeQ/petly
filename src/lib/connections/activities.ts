import type { ConnectionActivityId } from '../../types'

/** Stable activity IDs for pet-buddy connection preferences (extensible registry). */
export const CONNECTION_ACTIVITY_IDS = [
  'walks',
  'trips',
  'play',
  'socialization',
  'activities',
  'training',
  'travel',
] as const satisfies readonly ConnectionActivityId[]

export type { ConnectionActivityId }

export const CONNECTION_ACTIVITY_REGISTRY: {
  id: ConnectionActivityId
  label: string
  /** Shorter label for compact cards / filters. */
  shortLabel: string
  /** Phrase used in “Luna hledá: …” lines. */
  seekingLabel: string
}[] = [
  {
    id: 'walks',
    label: 'Procházky',
    shortLabel: 'Procházky',
    seekingLabel: 'parťáka na procházky',
  },
  {
    id: 'trips',
    label: 'Výlety',
    shortLabel: 'Výlety',
    seekingLabel: 'parťáka na výlety',
  },
  {
    id: 'play',
    label: 'Hraní',
    shortLabel: 'Hraní',
    seekingLabel: 'parťáka na hraní',
  },
  {
    id: 'socialization',
    label: 'Socializace',
    shortLabel: 'Socializace',
    seekingLabel: 'socializaci',
  },
  {
    id: 'activities',
    label: 'Aktivity',
    shortLabel: 'Aktivity',
    seekingLabel: 'společné aktivity',
  },
  {
    id: 'training',
    label: 'Trénink',
    shortLabel: 'Trénink',
    seekingLabel: 'parťáka na trénink',
  },
  {
    id: 'travel',
    label: 'Cestování',
    shortLabel: 'Cestování',
    seekingLabel: 'parťáka na cestování',
  },
]

const ID_SET = new Set<string>(CONNECTION_ACTIVITY_IDS)

export function isConnectionActivityId(value: unknown): value is ConnectionActivityId {
  return typeof value === 'string' && ID_SET.has(value)
}

export function getConnectionActivityLabel(id: ConnectionActivityId): string {
  return CONNECTION_ACTIVITY_REGISTRY.find((item) => item.id === id)?.label ?? id
}

export function getConnectionSeekingLabel(id: ConnectionActivityId): string {
  return CONNECTION_ACTIVITY_REGISTRY.find((item) => item.id === id)?.seekingLabel ?? id
}

/** Deduplicate and keep only known registry IDs (stable order from registry). */
export function normalizeConnectionActivityIds(raw: unknown): ConnectionActivityId[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<ConnectionActivityId>()
  for (const item of raw) {
    if (isConnectionActivityId(item)) seen.add(item)
  }
  return CONNECTION_ACTIVITY_IDS.filter((id) => seen.has(id))
}
