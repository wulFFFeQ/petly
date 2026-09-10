import type { DiscoverPet } from '../../types'
import { PUBLIC_PAYLOAD_FORBIDDEN_KEYS } from '../privacy/fields'

/**
 * Keys that must never appear on a public Discover payload.
 * Type boundary is the primary safeguard; this is a runtime backstop
 * for accidental spreads from private Pet / owner records.
 * Source of truth: src/lib/privacy/fields.ts
 */
export const DISCOVER_FORBIDDEN_KEYS = PUBLIC_PAYLOAD_FORBIDDEN_KEYS

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
  'communityFavorite',
  'popularityScore',
  'engagement',
  'distance',
  'publicTrustBadges',
  'ownerName',
  'ownerId',
  'bio',
  'gender',
  'personality',
  'likes',
  'dislikes',
  'lookingFor',
  'connectionPreferences',
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

  // Trust badges: keep only safe public fields (no metadata / demo leakage).
  if (cleaned.publicTrustBadges != null) {
    if (!Array.isArray(cleaned.publicTrustBadges)) {
      delete cleaned.publicTrustBadges
    } else {
      const allowedTypes = new Set(['email', 'phone', 'pet', 'breeding'])
      cleaned.publicTrustBadges = cleaned.publicTrustBadges
        .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === 'object')
        .map((b) => {
          const type = b.type
          if (typeof type !== 'string' || !allowedTypes.has(type)) return null
          if (typeof b.label !== 'string' || !b.label.trim()) return null
          const out: Record<string, unknown> = { type, label: b.label.trim() }
          if (typeof b.verifiedAt === 'string') out.verifiedAt = b.verifiedAt
          if (typeof b.expiresAt === 'string') out.expiresAt = b.expiresAt
          if (typeof b.sourceSummary === 'string') out.sourceSummary = b.sourceSummary
          return out
        })
        .filter(Boolean)
      if ((cleaned.publicTrustBadges as unknown[]).length === 0) {
        delete cleaned.publicTrustBadges
      }
    }
  }

  // Never keep legacy flat verified boolean on public payloads.
  delete cleaned.verified

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
