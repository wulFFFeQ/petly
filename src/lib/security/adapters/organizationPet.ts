/**
 * Organization pet access adapter — AND gate via existing actorHasOrganizationPetPermission.
 * Membership alone never opens pet data. Cross-org claimed context → DENY.
 */

import {
  actorHasOrganizationPetPermission,
  isOrganizationPetAccessEffective,
  resolveActorOrganizationPetAccess,
} from '../../organization/petAccess'
import { loadOrganizationMemberships } from '../../organization/storage'
import { loadOrganizationPetAccess } from '../../organization/petAccessStorage'
import type { OrganizationMembership, OrganizationPetAccess } from '../../organization/types'
import { isOrganizationMembershipEffective } from '../../organization/access'
import { professionalPermissionForAction } from '../actions'
import { denyIfEmergencyWriteLacksExpiry } from '../emergencyWriteGrant'
import type { AuthorizationDecision, SecurityAction, ValidatedOrganizationContext } from '../types'

export type OrganizationPetAdapterDeps = {
  loadAccess?: () => OrganizationPetAccess[]
  loadMemberships?: () => OrganizationMembership[]
  now?: number
}

export function authorizeOrganizationPet(
  petId: string,
  actorAccountId: string,
  orgContext: ValidatedOrganizationContext,
  action: SecurityAction,
  claimedOrganizationId: string | undefined,
  deps: OrganizationPetAdapterDeps = {},
): AuthorizationDecision {
  if (action === 'microchip.read' || action === 'ownerContacts.read') {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Organization pet access does not grant microchip or ownerContacts',
      denyClass: 'deny_by_default',
    }
  }

  // Cross-org tampering: claimed org must match validated context.
  const claimed = claimedOrganizationId?.trim()
  if (claimed && claimed !== orgContext.organizationId) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Claimed organizationId does not match validated organization context',
      denyClass: 'cross_organization',
    }
  }

  const mapping = professionalPermissionForAction(action)
  if (!mapping && action !== 'organization.pet.access') {
    // organization.pet.access uses viewHealth as probe for "has any pet access"
    if (action !== 'pet.profile.read') {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: `Unknown organization pet permission mapping for action: ${action}`,
        denyClass: 'unknown_permission',
      }
    }
  }

  const permMapping =
    mapping ??
    (action === 'organization.pet.access' || action === 'pet.profile.read'
      ? { permission: 'viewHealth' as const, viewHealthImplies: false }
      : null)

  if (!permMapping) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: `Unknown organization pet permission mapping for action: ${action}`,
      denyClass: 'unknown_permission',
    }
  }

  const loadAccess = deps.loadAccess ?? loadOrganizationPetAccess
  const loadMemberships = deps.loadMemberships ?? loadOrganizationMemberships
  const now = deps.now ?? Date.now()

  const resolved = resolveActorOrganizationPetAccess(
    loadAccess(),
    loadMemberships(),
    petId,
    orgContext.organizationId,
    actorAccountId,
    now,
  )

  if (!resolved.access) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'No OrganizationPetAccess grant for this organization and pet',
      denyClass: 'missing_grant',
    }
  }

  if (!isOrganizationPetAccessEffective(resolved.access, now)) {
    if (resolved.access.status === 'revoked' || resolved.access.revokedAt) {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'OrganizationPetAccess revoked',
        denyClass: 'revoked',
      }
    }
    if (
      resolved.access.status === 'expired' ||
      (resolved.access.expiresAt && Date.parse(resolved.access.expiresAt) <= now)
    ) {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'OrganizationPetAccess expired',
        denyClass: 'expired',
      }
    }
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'OrganizationPetAccess not effective',
      denyClass: 'missing_grant',
    }
  }

  if (!isOrganizationMembershipEffective(resolved.membership)) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Organization membership not active',
      denyClass: 'forbidden',
    }
  }

  // Grant org must match validated context (prevent org Y accessing org X grant).
  if (resolved.access.organizationId !== orgContext.organizationId) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'OrganizationPetAccess grant organization mismatch',
      denyClass: 'cross_organization',
    }
  }

  // K62 — Org emergency write must be time-bounded (expiresAt required).
  const expiryDeny = denyIfEmergencyWriteLacksExpiry(
    action,
    resolved.access.expiresAt,
    now,
  )
  if (expiryDeny) return expiryDeny

  const ctx = {
    access: resolved.access,
    membership: resolved.membership,
    actorAccountId,
    now,
  }

  const allowed =
    actorHasOrganizationPetPermission(ctx, permMapping.permission) ||
    (permMapping.viewHealthImplies === true &&
      actorHasOrganizationPetPermission(ctx, 'viewHealth'))

  if (!allowed) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: resolved.eligible
        ? `Missing organization pet permission: ${permMapping.permission}`
        : 'Member not eligible for this OrganizationPetAccess grant',
      denyClass: 'forbidden',
    }
  }

  return {
    allowed: true,
    reason: 'organization',
    path: 'organization',
    grantId: resolved.access.id,
    permission: permMapping.permission,
  }
}

/**
 * Membership-only check — NEVER implies pet access.
 * Used to prove organization.ops / membership ≠ pet health.
 */
export function actorHasOrgMembershipOnly(
  organizationId: string,
  actorAccountId: string,
  deps: OrganizationPetAdapterDeps = {},
): boolean {
  const loadMemberships = deps.loadMemberships ?? loadOrganizationMemberships
  const membership = loadMemberships().find(
    (m) => m.organizationId === organizationId && m.accountId === actorAccountId,
  )
  return isOrganizationMembershipEffective(membership)
}
