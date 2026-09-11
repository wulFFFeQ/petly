/**
 * Organization domain types + const arrays (K42 / K44).
 */

export type {
  Organization,
  OrganizationMembership,
  OrganizationMembershipStatus,
  OrganizationPermission,
  OrganizationPetAccess,
  OrganizationPetAccessStatus,
  OrganizationPetVisibilityMode,
  OrganizationPublicVisibility,
  OrganizationRole,
  OrganizationStatus,
  OrganizationType,
  PublicOrganization,
} from '../../types/organization'

export const ORGANIZATION_TYPES = [
  'veterinary_clinic',
  'shelter',
  'breeder',
  'groomer',
  'trainer',
  'pet_hotel',
  'pet_service',
  'insurance',
  'public_institution',
  'other',
] as const

export const ORGANIZATION_STATUSES = [
  'draft',
  'active',
  'suspended',
  'closed',
] as const

export const ORGANIZATION_PUBLIC_VISIBILITIES = ['public', 'private'] as const

export const ORGANIZATION_ROLES = [
  'owner',
  'admin',
  'professional',
  'staff',
  'viewer',
] as const

export const ORGANIZATION_MEMBERSHIP_STATUSES = [
  'invited',
  'active',
  'suspended',
  'removed',
] as const

export const ORGANIZATION_PERMISSIONS = [
  'organization_manage',
  'organization_members_manage',
  'organization_settings_manage',
] as const

export const ORGANIZATION_PET_ACCESS_STATUSES = [
  'pending',
  'active',
  'revoked',
  'expired',
] as const

export const ORGANIZATION_PET_VISIBILITY_MODES = [
  'assigned_only',
  'role_eligible',
] as const

/** Default eligible roles when visibilityMode is role_eligible. */
export const DEFAULT_ORGANIZATION_PET_ELIGIBLE_ROLES = ['professional'] as const
