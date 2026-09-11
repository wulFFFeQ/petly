import {
  HOUSEHOLD_PET_PERMISSIONS,
  type HouseholdPetPermission,
  type HouseholdPetRole,
} from './types'

const PERM_SET = new Set<string>(HOUSEHOLD_PET_PERMISSIONS)

export function isHouseholdPetPermission(value: unknown): value is HouseholdPetPermission {
  return typeof value === 'string' && PERM_SET.has(value)
}

export function isHouseholdPetRole(value: unknown): value is HouseholdPetRole {
  return value === 'co_owner' || value === 'caregiver' || value === 'viewer'
}

export function normalizeHouseholdPermissions(raw: unknown): HouseholdPetPermission[] {
  if (!Array.isArray(raw)) return []
  const out: HouseholdPetPermission[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!isHouseholdPetPermission(item) || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

/**
 * Role suggests defaults only — permissions are stored explicitly on grant/update.
 * Co-owner: full pet data including health R/W; household_manage defaults false.
 * Caregiver: read health/docs; calendar write; no health write / household_manage / profile write.
 * Viewer: basic profile read only (no health/docs).
 */
export function suggestedHouseholdPermissionsForRole(
  role: HouseholdPetRole,
): HouseholdPetPermission[] {
  switch (role) {
    case 'co_owner':
      return [
        'pet_profile_read',
        'pet_profile_write',
        'health_read',
        'health_write',
        'documents_read',
        'documents_write',
        'calendar_read',
        'calendar_write',
        'gallery_read',
        'gallery_write',
        'timeline_read',
        'timeline_write',
        'emergency_read',
        'emergency_write',
        // household_manage intentionally omitted — Owner must grant explicitly
      ]
    case 'caregiver':
      return [
        'pet_profile_read',
        'health_read',
        'documents_read',
        'calendar_read',
        'calendar_write',
        'gallery_read',
        'gallery_write',
        'timeline_read',
        'timeline_write',
        'emergency_read',
      ]
    case 'viewer':
      return ['pet_profile_read', 'gallery_read']
    default:
      return []
  }
}
