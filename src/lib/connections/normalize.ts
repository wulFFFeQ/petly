import type { PetConnectionPreferences, PublicConnectionPreferences } from '../../types'
import {
  normalizeConnectionActivityIds,
  type ConnectionActivityId,
} from './activities'

/**
 * Normalize private Pet.connectionPreferences from storage / updates.
 * Invalid IDs are dropped; activityTypes syncs with lookingFor when empty.
 */
export function normalizePetConnectionPreferences(
  raw: unknown,
): PetConnectionPreferences | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const source = raw as Record<string, unknown>
  const lookingFor = normalizeConnectionActivityIds(source.lookingFor)
  let activityTypes = normalizeConnectionActivityIds(source.activityTypes)
  if (activityTypes.length === 0 && lookingFor.length > 0) {
    activityTypes = [...lookingFor]
  }
  const enabled = source.enabled === true
  if (!enabled && lookingFor.length === 0 && activityTypes.length === 0) {
    return undefined
  }
  return { enabled, lookingFor, activityTypes }
}

/**
 * Public Discover subset — only when enabled and at least one lookingFor ID.
 * Never includes enabled flag or private fields.
 */
export function toPublicConnectionPreferences(
  prefs: PetConnectionPreferences | undefined | null,
): PublicConnectionPreferences | undefined {
  if (!prefs?.enabled) return undefined
  const lookingFor = normalizeConnectionActivityIds(prefs.lookingFor)
  if (lookingFor.length === 0) return undefined
  let activityTypes = normalizeConnectionActivityIds(prefs.activityTypes)
  if (activityTypes.length === 0) activityTypes = [...lookingFor]
  return { lookingFor, activityTypes }
}

export function hasPublicConnectionPreferences(
  prefs: PublicConnectionPreferences | undefined | null,
): boolean {
  return Boolean(prefs?.lookingFor && prefs.lookingFor.length > 0)
}

export function toggleConnectionActivity(
  list: ConnectionActivityId[],
  id: ConnectionActivityId,
): ConnectionActivityId[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

/** Build prefs for updatePet — syncs activityTypes with lookingFor in v1. */
export function buildConnectionPreferencesUpdate(input: {
  enabled: boolean
  lookingFor: ConnectionActivityId[]
}): PetConnectionPreferences {
  const lookingFor = normalizeConnectionActivityIds(input.lookingFor)
  return {
    enabled: input.enabled,
    lookingFor,
    activityTypes: [...lookingFor],
  }
}
