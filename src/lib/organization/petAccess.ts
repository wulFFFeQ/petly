/**
 * OrganizationPetAccess authorization (K44).
 * Grant effective AND membership effective AND member eligible AND permission.
 * Membership alone never opens pet data.
 */

import { assertPetOwner } from '../pets/ownership'
import { normalizePermissions } from '../professional/permissions'
import type { ProfessionalPermission } from '../professional/types'
import { assertEmergencyWriteGrantHasExpiry } from '../security/emergencyWriteGrant'
import type { Pet } from '../../types'
import {
  findMembership,
  isOrganizationMembershipEffective,
} from './access'
import { createOrganizationPetAccessId } from './petAccessStorage'
import {
  DEFAULT_ORGANIZATION_PET_ELIGIBLE_ROLES,
  type OrganizationMembership,
  type OrganizationPetAccess,
  type OrganizationPetAccessStatus,
  type OrganizationPetVisibilityMode,
  type OrganizationRole,
} from './types'

export class OrganizationPetAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrganizationPetAccessError'
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeAssignedAccountIds(raw: string[] | undefined): string[] | undefined {
  if (!raw || raw.length === 0) return undefined
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of raw) {
    const trimmed = typeof id === 'string' ? id.trim() : ''
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out.length > 0 ? out : undefined
}

function normalizeEligibleRoles(raw: OrganizationRole[] | undefined): OrganizationRole[] | undefined {
  if (!raw || raw.length === 0) return undefined
  const out: OrganizationRole[] = []
  const seen = new Set<string>()
  for (const role of raw) {
    if (seen.has(role)) continue
    seen.add(role)
    out.push(role)
  }
  return out.length > 0 ? out : undefined
}

/**
 * Effective org→pet grant: active, not revoked, not past expiresAt.
 */
export function isOrganizationPetAccessEffective(
  access: OrganizationPetAccess | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!access) return false
  if (
    access.status === 'revoked' ||
    access.status === 'pending' ||
    access.status === 'expired'
  ) {
    return false
  }
  if (access.status !== 'active') return false
  if (access.revokedAt) return false
  if (access.expiresAt) {
    const exp = Date.parse(access.expiresAt)
    if (!Number.isNaN(exp) && exp <= now) return false
  }
  return true
}

export function resolveOrganizationPetAccessStatus(
  access: OrganizationPetAccess,
  now: number = Date.now(),
): OrganizationPetAccessStatus {
  if (access.status === 'revoked') return 'revoked'
  if (access.status === 'pending') return 'pending'
  if (access.status === 'expired') return 'expired'
  if (access.expiresAt) {
    const exp = Date.parse(access.expiresAt)
    if (!Number.isNaN(exp) && exp <= now) return 'expired'
  }
  if (access.status === 'active') return 'active'
  return access.status
}

export function listOrganizationPetAccessForPet(
  accessList: OrganizationPetAccess[],
  petId: string,
): OrganizationPetAccess[] {
  return accessList.filter((a) => a.petId === petId)
}

export function listOrganizationPetAccessForOrganization(
  accessList: OrganizationPetAccess[],
  organizationId: string,
): OrganizationPetAccess[] {
  return accessList.filter((a) => a.organizationId === organizationId)
}

export function findOrganizationPetAccess(
  accessList: OrganizationPetAccess[],
  petId: string,
  organizationId: string,
): OrganizationPetAccess | undefined {
  return accessList.find((a) => a.petId === petId && a.organizationId === organizationId)
}

/** Pending or active grant for the same pet + organization (blocks duplicates). */
export function findOpenOrganizationPetAccess(
  accessList: OrganizationPetAccess[],
  petId: string,
  organizationId: string,
): OrganizationPetAccess | undefined {
  return accessList.find(
    (a) =>
      a.petId === petId &&
      a.organizationId === organizationId &&
      (a.status === 'pending' || a.status === 'active'),
  )
}

/**
 * Member may act under grant only when assigned or role-eligible.
 * Active membership alone is insufficient.
 */
export function isMemberPetEligible(
  access: OrganizationPetAccess | null | undefined,
  membership: OrganizationMembership | null | undefined,
  actorAccountId: string,
): boolean {
  if (!access || !membership) return false
  if (!isOrganizationMembershipEffective(membership)) return false
  if (membership.organizationId !== access.organizationId) return false
  if (membership.accountId !== actorAccountId) return false

  if (access.visibilityMode === 'assigned_only') {
    return Boolean(access.assignedAccountIds?.includes(actorAccountId))
  }

  if (access.visibilityMode === 'role_eligible') {
    const roles =
      access.eligibleRoles && access.eligibleRoles.length > 0
        ? access.eligibleRoles
        : ([...DEFAULT_ORGANIZATION_PET_ELIGIBLE_ROLES] as OrganizationRole[])
    return roles.includes(membership.role)
  }

  return false
}

export function hasOrganizationPetPermission(
  access: OrganizationPetAccess | null | undefined,
  permission: ProfessionalPermission,
  now: number = Date.now(),
): boolean {
  if (!isOrganizationPetAccessEffective(access, now)) return false
  return Boolean(access?.permissions.includes(permission))
}

export type ActorOrgPetAccessContext = {
  access: OrganizationPetAccess | null | undefined
  membership: OrganizationMembership | null | undefined
  actorAccountId: string
  now?: number
}

/**
 * Full AND gate: grant effective + membership + eligibility + permission.
 */
export function actorHasOrganizationPetPermission(
  ctx: ActorOrgPetAccessContext,
  permission: ProfessionalPermission,
): boolean {
  const now = ctx.now ?? Date.now()
  if (!isOrganizationPetAccessEffective(ctx.access, now)) return false
  if (!isMemberPetEligible(ctx.access, ctx.membership, ctx.actorAccountId)) return false
  return Boolean(ctx.access?.permissions.includes(permission))
}

export function canOrganizationActorViewHealth(ctx: ActorOrgPetAccessContext): boolean {
  return actorHasOrganizationPetPermission(ctx, 'viewHealth')
}

export function canOrganizationActorViewVaccinations(ctx: ActorOrgPetAccessContext): boolean {
  return (
    actorHasOrganizationPetPermission(ctx, 'viewVaccinations') ||
    actorHasOrganizationPetPermission(ctx, 'viewHealth')
  )
}

export function canOrganizationActorViewMedications(ctx: ActorOrgPetAccessContext): boolean {
  return (
    actorHasOrganizationPetPermission(ctx, 'viewMedications') ||
    actorHasOrganizationPetPermission(ctx, 'viewHealth')
  )
}

export function canOrganizationActorViewDocuments(ctx: ActorOrgPetAccessContext): boolean {
  return actorHasOrganizationPetPermission(ctx, 'viewDocuments')
}

export function canOrganizationActorAddHealthRecord(ctx: ActorOrgPetAccessContext): boolean {
  return actorHasOrganizationPetPermission(ctx, 'addHealthRecord')
}

export function canOrganizationActorAddVisit(ctx: ActorOrgPetAccessContext): boolean {
  return actorHasOrganizationPetPermission(ctx, 'addVisit')
}

export function canOrganizationActorAddVaccination(ctx: ActorOrgPetAccessContext): boolean {
  return actorHasOrganizationPetPermission(ctx, 'addVaccination')
}

export function canOrganizationActorAddNote(ctx: ActorOrgPetAccessContext): boolean {
  return actorHasOrganizationPetPermission(ctx, 'addNote')
}

export function assertCanOrganizationAddHealthRecord(ctx: ActorOrgPetAccessContext): void {
  if (!canOrganizationActorAddHealthRecord(ctx)) {
    throw new OrganizationPetAccessError('Organization actor lacks addHealthRecord permission')
  }
}

export function resolveActorOrganizationPetAccess(
  accessList: OrganizationPetAccess[],
  memberships: OrganizationMembership[],
  petId: string,
  organizationId: string,
  actorAccountId: string,
  now: number = Date.now(),
): {
  access: OrganizationPetAccess | null
  membership: OrganizationMembership | null
  eligible: boolean
} {
  const access =
    findOrganizationPetAccess(accessList, petId, organizationId) ??
    findOpenOrganizationPetAccess(accessList, petId, organizationId) ??
    null
  const membership = findMembership(memberships, organizationId, actorAccountId) ?? null
  const effective = isOrganizationPetAccessEffective(access, now)
  const eligible =
    effective && isMemberPetEligible(access, membership, actorAccountId)
  return {
    access: access && effective ? access : access,
    membership,
    eligible: Boolean(eligible),
  }
}

export type GrantOrganizationPetAccessInput = {
  pet: Pet
  organizationId: string
  permissions: ProfessionalPermission[]
  grantedByAccountId: string
  status?: 'pending' | 'active'
  visibilityMode?: OrganizationPetVisibilityMode
  eligibleRoles?: OrganizationRole[]
  assignedAccountIds?: string[]
  expiresAt?: string
  grantedAt?: string
  requestedByAccountId?: string
  id?: string
}

export type OrganizationPetAccessMutationResult = {
  access: OrganizationPetAccess
  accessList: OrganizationPetAccess[]
}

/**
 * Owner grants organization access to a specific pet.
 * Does not create professional access, household access, booking, or membership.
 */
export function grantOrganizationPetAccess(
  existing: OrganizationPetAccess[],
  input: GrantOrganizationPetAccessInput,
): OrganizationPetAccessMutationResult {
  assertPetOwner(input.pet, input.grantedByAccountId)

  const organizationId = input.organizationId.trim()
  if (!organizationId) {
    throw new OrganizationPetAccessError('organizationId is required')
  }

  const open = findOpenOrganizationPetAccess(existing, input.pet.id, organizationId)
  if (open && open.id !== input.id) {
    throw new OrganizationPetAccessError(
      'Open organization pet access already exists for this organization and pet',
    )
  }

  const stamp = input.grantedAt ?? nowIso()
  const visibilityMode: OrganizationPetVisibilityMode =
    input.visibilityMode ?? 'assigned_only'

  const permissions = normalizePermissions(input.permissions)
  assertEmergencyWriteGrantHasExpiry(permissions, input.expiresAt)

  const access: OrganizationPetAccess = {
    id: input.id ?? open?.id ?? createOrganizationPetAccessId(),
    petId: input.pet.id,
    organizationId,
    permissions,
    status: input.status ?? 'active',
    visibilityMode,
    grantedAt: stamp,
    grantedByAccountId: input.grantedByAccountId,
    createdAt: open?.createdAt ?? stamp,
    updatedAt: stamp,
  }

  const eligibleRoles = normalizeEligibleRoles(input.eligibleRoles ?? open?.eligibleRoles)
  if (eligibleRoles) access.eligibleRoles = eligibleRoles

  const assigned = normalizeAssignedAccountIds(
    input.assignedAccountIds ?? open?.assignedAccountIds,
  )
  if (assigned) access.assignedAccountIds = assigned

  if (input.status === 'pending' || open?.requestedAt) {
    access.requestedAt = open?.requestedAt ?? stamp
  }
  if (input.requestedByAccountId?.trim() || open?.requestedByAccountId) {
    access.requestedByAccountId =
      input.requestedByAccountId?.trim() || open?.requestedByAccountId
  }
  if (input.expiresAt) access.expiresAt = input.expiresAt

  const accessList = [...existing.filter((a) => a.id !== access.id), access]
  return { access, accessList }
}

export type RequestOrganizationPetAccessInput = {
  petId: string
  organizationId: string
  /** Pet owner who must approve. */
  grantedByAccountId: string
  requestedByAccountId: string
  permissions?: ProfessionalPermission[]
  visibilityMode?: OrganizationPetVisibilityMode
  eligibleRoles?: OrganizationRole[]
  assignedAccountIds?: string[]
  requestedAt?: string
  id?: string
}

/**
 * Create a pending org→pet access request. Does not grant data access.
 */
export function requestOrganizationPetAccess(
  existing: OrganizationPetAccess[],
  input: RequestOrganizationPetAccessInput,
): OrganizationPetAccessMutationResult {
  const petId = input.petId.trim()
  const organizationId = input.organizationId.trim()
  if (!petId || !organizationId) {
    throw new OrganizationPetAccessError('petId and organizationId are required')
  }

  const open = findOpenOrganizationPetAccess(existing, petId, organizationId)
  if (open) {
    throw new OrganizationPetAccessError(
      'Open organization pet access already exists for this organization and pet',
    )
  }

  const stamp = input.requestedAt ?? nowIso()
  const access: OrganizationPetAccess = {
    id: input.id ?? createOrganizationPetAccessId(),
    petId,
    organizationId,
    permissions: normalizePermissions(input.permissions ?? []),
    status: 'pending',
    visibilityMode: input.visibilityMode ?? 'assigned_only',
    requestedAt: stamp,
    requestedByAccountId: input.requestedByAccountId.trim(),
    grantedAt: stamp,
    grantedByAccountId: input.grantedByAccountId,
    createdAt: stamp,
    updatedAt: stamp,
  }

  const eligibleRoles = normalizeEligibleRoles(input.eligibleRoles)
  if (eligibleRoles) access.eligibleRoles = eligibleRoles
  const assigned = normalizeAssignedAccountIds(input.assignedAccountIds)
  if (assigned) access.assignedAccountIds = assigned

  return { access, accessList: [...existing, access] }
}

export function activateOrganizationPetAccess(
  accessList: OrganizationPetAccess[],
  accessId: string,
  pet: Pet,
  actorAccountId: string,
  now: string = nowIso(),
): { access: OrganizationPetAccess | null; accessList: OrganizationPetAccess[] } {
  assertPetOwner(pet, actorAccountId)
  let updated: OrganizationPetAccess | null = null
  const next = accessList.map((a) => {
    if (a.id !== accessId) return a
    if (a.petId !== pet.id) {
      throw new OrganizationPetAccessError('Access does not belong to this pet')
    }
    updated = {
      ...a,
      status: 'active',
      grantedAt: now,
      updatedAt: now,
      revokedAt: undefined,
    }
    return updated
  })
  return { access: updated, accessList: next }
}

export function revokeOrganizationPetAccess(
  accessList: OrganizationPetAccess[],
  accessId: string,
  pet: Pet,
  actorAccountId: string,
  now: string = nowIso(),
): { access: OrganizationPetAccess | null; accessList: OrganizationPetAccess[] } {
  assertPetOwner(pet, actorAccountId)
  let updated: OrganizationPetAccess | null = null
  const next = accessList.map((a) => {
    if (a.id !== accessId) return a
    if (a.petId !== pet.id) {
      throw new OrganizationPetAccessError('Access does not belong to this pet')
    }
    updated = {
      ...a,
      status: 'revoked',
      revokedAt: now,
      updatedAt: now,
    }
    return updated
  })
  return { access: updated, accessList: next }
}

/**
 * Owner updates which members are assigned (assigned_only mode).
 * Does not change OrganizationMembership or ProfessionalAccess.
 */
export function updateOrganizationPetAccessAssignments(
  accessList: OrganizationPetAccess[],
  accessId: string,
  pet: Pet,
  actorAccountId: string,
  assignedAccountIds: string[],
  now: string = nowIso(),
): { access: OrganizationPetAccess | null; accessList: OrganizationPetAccess[] } {
  assertPetOwner(pet, actorAccountId)
  let updated: OrganizationPetAccess | null = null
  const assigned = normalizeAssignedAccountIds(assignedAccountIds)
  const next = accessList.map((a) => {
    if (a.id !== accessId) return a
    if (a.petId !== pet.id) {
      throw new OrganizationPetAccessError('Access does not belong to this pet')
    }
    if (a.status === 'revoked' || a.status === 'expired') {
      throw new OrganizationPetAccessError('Cannot update assignments on revoked/expired access')
    }
    updated = {
      ...a,
      assignedAccountIds: assigned,
      updatedAt: now,
    }
    return updated
  })
  return { access: updated, accessList: next }
}

export function expireOrganizationPetAccess(
  accessList: OrganizationPetAccess[],
  accessId: string,
  now: string = nowIso(),
): { access: OrganizationPetAccess | null; accessList: OrganizationPetAccess[] } {
  const nowMs = Date.parse(now)
  let updated: OrganizationPetAccess | null = null
  const next = accessList.map((a) => {
    if (a.id !== accessId) return a
    if (a.status !== 'active') return a
    if (!a.expiresAt) return a
    const exp = Date.parse(a.expiresAt)
    if (Number.isNaN(exp) || exp > nowMs) return a
    updated = {
      ...a,
      status: 'expired',
      updatedAt: now,
    }
    return updated
  })
  return { access: updated, accessList: next }
}
