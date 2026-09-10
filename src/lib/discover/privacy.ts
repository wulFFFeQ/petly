import type { DiscoverPet } from '../../types'

/**
 * Keys that must never appear on a public Discover payload.
 * Type boundary is the primary safeguard; this is a runtime backstop
 * for accidental spreads from private Pet / owner records.
 */
export const DISCOVER_FORBIDDEN_KEYS = [
  'microchip',
  'microchipNumber',
  'microchipVerification',
  'phone',
  'email',
  'address',
  'street',
  'postalCode',
  'weight',
  'healthRecords',
  'health',
  'medications',
  'documents',
  'privateNotes',
  'ownerPhone',
  'ownerEmail',
  'ownerAddress',
  'vetPhone',
  'emergencyContacts',
] as const

const FORBIDDEN_SET = new Set<string>(DISCOVER_FORBIDDEN_KEYS)

/** Allowed top-level keys on DiscoverPet (public surface). */
const ALLOWED_DISCOVER_KEYS = new Set([
  'id',
  'name',
  'type',
  'breed',
  'age',
  'location',
  'image',
  'popular',
  'distance',
  'verified',
  'ownerName',
  'ownerId',
  'bio',
  'gender',
  'personality',
  'likes',
  'dislikes',
  'lookingFor',
  'activities',
  'publicBadges',
  'gallery',
  'publicTimeline',
  'breedingProfile',
  'breeding',
])

export function collectForbiddenDiscoverKeys(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.keys(raw as Record<string, unknown>).filter((key) => FORBIDDEN_SET.has(key))
}

/**
 * Strip forbidden keys and drop unknown private-looking extras.
 * Keeps only the public DiscoverPet shape.
 */
export function sanitizeDiscoverPet(raw: unknown): DiscoverPet | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const source = raw as Record<string, unknown>

  const cleaned: Record<string, unknown> = {}
  for (const key of Object.keys(source)) {
    if (FORBIDDEN_SET.has(key)) continue
    if (!ALLOWED_DISCOVER_KEYS.has(key)) continue
    cleaned[key] = source[key]
  }

  if (typeof cleaned.id !== 'string' || !cleaned.id) return null
  if (typeof cleaned.name !== 'string' || !cleaned.name) return null
  if (cleaned.type !== 'dog' && cleaned.type !== 'cat') return null
  if (typeof cleaned.breed !== 'string') return null
  if (typeof cleaned.age !== 'number') return null
  if (typeof cleaned.location !== 'string') return null
  if (typeof cleaned.image !== 'string') return null

  // Breeding dossier on private Pet uses a different shape; only slim public breeding is allowed.
  if (cleaned.breeding != null && typeof cleaned.breeding === 'object') {
    const breeding = cleaned.breeding as Record<string, unknown>
    cleaned.breeding = {
      status: typeof breeding.status === 'string' ? breeding.status : undefined,
      titles: Array.isArray(breeding.titles)
        ? breeding.titles.filter((t): t is string => typeof t === 'string')
        : undefined,
      shows: Array.isArray(breeding.shows) ? breeding.shows : undefined,
      pedigreeSummary:
        typeof breeding.pedigreeSummary === 'string' ? breeding.pedigreeSummary : undefined,
      litters: Array.isArray(breeding.litters) ? breeding.litters : undefined,
    }
  }

  return cleaned as unknown as DiscoverPet
}

/** Returns sanitized pet or throws if required public fields are missing. */
export function assertPublicDiscoverPet(raw: unknown): DiscoverPet {
  const forbidden = collectForbiddenDiscoverKeys(raw)
  const sanitized = sanitizeDiscoverPet(raw)
  if (!sanitized) {
    throw new Error(
      `Invalid DiscoverPet payload${forbidden.length ? ` (also had: ${forbidden.join(', ')})` : ''}`,
    )
  }
  return sanitized
}
