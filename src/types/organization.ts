/**
 * Organization + OrganizationMembership — workforce identity layer (K42 / K41).
 * OrganizationPetAccess — org→pet grant layer (K43 design / K44 runtime).
 * Separate from ProfessionalProfile, PetProfessionalAccess, HouseholdAccess, and billing membership.
 */

import type { ProfessionalPermission } from './professional'

export type OrganizationType =
  | 'veterinary_clinic'
  | 'shelter'
  | 'breeder'
  | 'groomer'
  | 'trainer'
  | 'pet_hotel'
  | 'pet_service'
  | 'insurance'
  | 'public_institution'
  | 'other'
  | (string & {})

export type OrganizationStatus = 'draft' | 'active' | 'suspended' | 'closed'

export type OrganizationPublicVisibility = 'public' | 'private'

/**
 * Organization identity (clinic, shelter, etc.).
 * Account ≠ Organization. ProfessionalProfile ≠ Organization.
 *
 * Legacy stub fields `name`, `type`, `memberAccountIds` remain for compat;
 * SSOT is displayName / organizationType / OrganizationMembership.
 */
export interface Organization {
  id: string
  displayName: string
  legalName?: string
  organizationType: OrganizationType
  status: OrganizationStatus
  publicVisibility: OrganizationPublicVisibility
  createdAt: string
  updatedAt: string
  /**
   * @deprecated Prefer displayName — kept in sync for stub readers.
   */
  name: string
  /**
   * @deprecated Prefer organizationType — kept in sync for stub readers.
   */
  type: OrganizationType
  /**
   * @deprecated Derived from active memberships — not membership SSOT.
   */
  memberAccountIds: string[]
}

export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'professional'
  | 'staff'
  | 'viewer'

export type OrganizationMembershipStatus =
  | 'invited'
  | 'active'
  | 'suspended'
  | 'removed'

/**
 * Account ↔ Organization workforce link.
 * Role ≠ Pet permission. Membership ≠ verification ≠ billing plan.
 */
export interface OrganizationMembership {
  id: string
  organizationId: string
  accountId: string
  role: OrganizationRole
  status: OrganizationMembershipStatus
  invitedByAccountId?: string
  joinedAt?: string
  leftAt?: string
  createdAt: string
  updatedAt: string
}

/** Organization-ops permissions only — never pet health / documents / microchip. */
export type OrganizationPermission =
  | 'organization_manage'
  | 'organization_members_manage'
  | 'organization_settings_manage'

/** Safe public projection — catalog unused in K42; returns null when private. */
export interface PublicOrganization {
  id: string
  displayName: string
  organizationType: OrganizationType
  city?: string
}

/**
 * Organization → Pet access grant (K43/K44).
 * Separate from PetProfessionalAccess and PetHouseholdAccess.
 * Membership ≠ this grant. Role ≠ health permission.
 */
export type OrganizationPetAccessStatus = 'pending' | 'active' | 'revoked' | 'expired'

/**
 * Who among active members may act under an effective org→pet grant.
 * Default `assigned_only` — membership alone never opens the pet card.
 */
export type OrganizationPetVisibilityMode = 'assigned_only' | 'role_eligible'

export interface OrganizationPetAccess {
  id: string
  petId: string
  organizationId: string
  /** Reuses ProfessionalPermission vocabulary — not a second permission system. */
  permissions: ProfessionalPermission[]
  status: OrganizationPetAccessStatus
  visibilityMode: OrganizationPetVisibilityMode
  /** Used when visibilityMode === 'role_eligible'. Default interpretation: ['professional']. */
  eligibleRoles?: OrganizationRole[]
  /** Account ids eligible when visibilityMode === 'assigned_only'. */
  assignedAccountIds?: string[]
  /** Future multi-location scope — unused in K44. */
  locationId?: string
  requestedAt?: string
  /** Account that requested access (org side); optional for owner-initiated grants. */
  requestedByAccountId?: string
  grantedAt: string
  expiresAt?: string
  revokedAt?: string
  grantedByAccountId: string
  createdAt: string
  updatedAt: string
}
