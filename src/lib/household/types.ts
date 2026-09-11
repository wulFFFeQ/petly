/**
 * Household pet access types — separate from Professional Access.
 * Owner lives on Pet.ownerAccountId; PetHouseholdAccess stores shared members only.
 */

export type HouseholdPetRole = 'co_owner' | 'caregiver' | 'viewer'

export type HouseholdAccessStatus = 'pending' | 'active' | 'revoked' | 'expired'

export type HouseholdPetPermission =
  | 'pet_profile_read'
  | 'pet_profile_write'
  | 'health_read'
  | 'health_write'
  | 'documents_read'
  | 'documents_write'
  | 'calendar_read'
  | 'calendar_write'
  | 'gallery_read'
  | 'gallery_write'
  | 'timeline_read'
  | 'timeline_write'
  | 'emergency_read'
  | 'emergency_write'
  | 'lost_manage'
  | 'household_manage'

export const HOUSEHOLD_PET_PERMISSIONS: HouseholdPetPermission[] = [
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
  'lost_manage',
  'household_manage',
]

export const HOUSEHOLD_PET_ROLES: HouseholdPetRole[] = ['co_owner', 'caregiver', 'viewer']

export const HOUSEHOLD_ACCESS_STATUSES: HouseholdAccessStatus[] = [
  'pending',
  'active',
  'revoked',
  'expired',
]

/**
 * Shared household member access to a pet.
 * Does NOT store the original Owner — ownership is Pet.ownerAccountId.
 */
export interface PetHouseholdAccess {
  id: string
  petId: string
  /** Grantee Account.id */
  accountId: string
  role: HouseholdPetRole
  /** Explicit stored permissions — role only suggests defaults. */
  permissions: HouseholdPetPermission[]
  status: HouseholdAccessStatus
  grantedByAccountId: string
  grantedAt: string
  createdAt: string
  updatedAt: string
  revokedAt?: string
  expiresAt?: string
  /** Extension point for future invitation flow. */
  invitedAt?: string
}

export type HouseholdAccessLogAction =
  | 'access_granted'
  | 'access_revoked'
  | 'role_changed'
  | 'permissions_updated'
  | (string & {})

export interface PetHouseholdAccessLog {
  id: string
  petId: string
  accountId: string
  action: HouseholdAccessLogAction
  timestamp: string
  /** Must not contain clinical content or PII payloads. */
  metadata?: Record<string, unknown>
}
