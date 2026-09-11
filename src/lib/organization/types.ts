/**
 * Organization domain types + const arrays (K42).
 */

export type {
  Organization,
  OrganizationMembership,
  OrganizationMembershipStatus,
  OrganizationPermission,
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
