/**
 * Organization membership authorization + DEMO mutations (K42).
 * UI visibility is not the security boundary — mutations go through asserts here.
 */

import { permissionsForOrganizationRole, isOrganizationRole, isOrganizationType } from './permissions'
import {
  createOrganizationId,
  createOrganizationMembershipId,
  loadOrganizationMemberships,
  loadOrganizations,
  saveOrganizationMemberships,
  saveOrganizations,
  syncOrganizationMemberAccountIds,
} from './storage'
import type {
  Organization,
  OrganizationMembership,
  OrganizationPermission,
  OrganizationPublicVisibility,
  OrganizationRole,
  OrganizationStatus,
  OrganizationType,
} from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export class OrganizationPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrganizationPermissionError'
  }
}

export function isOrganizationMembershipEffective(
  membership: OrganizationMembership | null | undefined,
): boolean {
  if (!membership) return false
  return membership.status === 'active'
}

export function isOrganizationOperable(org: Organization | null | undefined): boolean {
  if (!org) return false
  return org.status === 'active' || org.status === 'draft'
}

export function listMembershipsForOrganization(
  memberships: OrganizationMembership[],
  organizationId: string,
): OrganizationMembership[] {
  return memberships.filter((m) => m.organizationId === organizationId)
}

export function listMembershipsForAccount(
  memberships: OrganizationMembership[],
  accountId: string,
): OrganizationMembership[] {
  return memberships.filter((m) => m.accountId === accountId)
}

export function findMembership(
  memberships: OrganizationMembership[],
  organizationId: string,
  accountId: string,
): OrganizationMembership | undefined {
  return memberships.find(
    (m) => m.organizationId === organizationId && m.accountId === accountId,
  )
}

/** Open = invited or active — blocks uncontrolled duplicates. */
export function findOpenMembership(
  memberships: OrganizationMembership[],
  organizationId: string,
  accountId: string,
): OrganizationMembership | undefined {
  return memberships.find(
    (m) =>
      m.organizationId === organizationId &&
      m.accountId === accountId &&
      (m.status === 'invited' || m.status === 'active'),
  )
}

export function listActiveOwners(
  memberships: OrganizationMembership[],
  organizationId: string,
): OrganizationMembership[] {
  return memberships.filter(
    (m) =>
      m.organizationId === organizationId &&
      m.status === 'active' &&
      m.role === 'owner',
  )
}

export function hasOrganizationPermission(
  membership: OrganizationMembership | null | undefined,
  permission: OrganizationPermission,
  org?: Organization | null,
): boolean {
  if (!isOrganizationMembershipEffective(membership)) return false
  if (org && org.status === 'closed') return false
  if (org && org.status === 'suspended') {
    // Suspended org: no mutations; read-only checks still fail for manage perms
    return false
  }
  if (!membership) return false
  return permissionsForOrganizationRole(membership.role).includes(permission)
}

export function isOrganizationMember(
  memberships: OrganizationMembership[],
  organizationId: string,
  accountId: string,
): boolean {
  const m = findMembership(memberships, organizationId, accountId)
  return isOrganizationMembershipEffective(m)
}

export function assertOrganizationMember(
  memberships: OrganizationMembership[],
  organizationId: string,
  accountId: string,
): OrganizationMembership {
  const m = findMembership(memberships, organizationId, accountId)
  if (!isOrganizationMembershipEffective(m) || !m) {
    throw new OrganizationPermissionError('Not an active organization member')
  }
  return m
}

export function assertCanManageOrganization(
  memberships: OrganizationMembership[],
  org: Organization,
  actorAccountId: string,
): OrganizationMembership {
  const m = assertOrganizationMember(memberships, org.id, actorAccountId)
  if (!hasOrganizationPermission(m, 'organization_manage', org)) {
    throw new OrganizationPermissionError('Lacks organization_manage permission')
  }
  if (!isOrganizationOperable(org) && org.status !== 'suspended') {
    // closed orgs: no manage
    throw new OrganizationPermissionError('Organization is not operable')
  }
  if (org.status === 'suspended' || org.status === 'closed') {
    throw new OrganizationPermissionError('Organization is not operable')
  }
  return m
}

export function assertCanManageOrganizationMembers(
  memberships: OrganizationMembership[],
  org: Organization,
  actorAccountId: string,
): OrganizationMembership {
  const m = assertOrganizationMember(memberships, org.id, actorAccountId)
  if (!hasOrganizationPermission(m, 'organization_members_manage', org)) {
    throw new OrganizationPermissionError('Lacks organization_members_manage permission')
  }
  if (org.status === 'suspended' || org.status === 'closed') {
    throw new OrganizationPermissionError('Organization is not operable')
  }
  return m
}

export function assertCanManageOrganizationSettings(
  memberships: OrganizationMembership[],
  org: Organization,
  actorAccountId: string,
): OrganizationMembership {
  const m = assertOrganizationMember(memberships, org.id, actorAccountId)
  if (!hasOrganizationPermission(m, 'organization_settings_manage', org)) {
    throw new OrganizationPermissionError('Lacks organization_settings_manage permission')
  }
  if (org.status === 'suspended' || org.status === 'closed') {
    throw new OrganizationPermissionError('Organization is not operable')
  }
  return m
}

export function assertCanActOnOwnInvitation(
  membership: OrganizationMembership,
  actorAccountId: string,
): void {
  if (membership.accountId !== actorAccountId) {
    throw new OrganizationPermissionError('Invitation does not belong to this account')
  }
  if (membership.status !== 'invited') {
    throw new OrganizationPermissionError('Membership is not an open invitation')
  }
}

function assertLastActiveOwnerProtected(
  memberships: OrganizationMembership[],
  organizationId: string,
  target: OrganizationMembership,
  nextRole?: OrganizationRole,
  nextStatus?: OrganizationMembership['status'],
): void {
  if (target.role !== 'owner' || target.status !== 'active') return
  const wouldLoseOwner =
    (nextStatus !== undefined && nextStatus !== 'active') ||
    (nextRole !== undefined && nextRole !== 'owner')
  if (!wouldLoseOwner) return
  const owners = listActiveOwners(memberships, organizationId)
  if (owners.length <= 1) {
    throw new OrganizationPermissionError(
      'Cannot remove or demote the last active organization owner',
    )
  }
}

function persistOrgWithSyncedMembers(
  org: Organization,
  memberships: OrganizationMembership[],
): Organization {
  const synced = syncOrganizationMemberAccountIds(org, memberships)
  const orgs = loadOrganizations()
  const next = orgs.some((o) => o.id === synced.id)
    ? orgs.map((o) => (o.id === synced.id ? synced : o))
    : [...orgs, synced]
  saveOrganizations(next)
  return synced
}

export type CreateOrganizationInput = {
  actorAccountId: string
  displayName: string
  organizationType: OrganizationType
  legalName?: string
  status?: OrganizationStatus
  publicVisibility?: OrganizationPublicVisibility
}

export type CreateOrganizationResult = {
  organization: Organization
  membership: OrganizationMembership
}

export function createOrganization(input: CreateOrganizationInput): CreateOrganizationResult {
  const actor = input.actorAccountId.trim()
  const displayName = input.displayName.trim()
  if (!actor) throw new OrganizationPermissionError('actorAccountId required')
  if (!displayName) throw new OrganizationPermissionError('displayName required')
  if (!isOrganizationType(input.organizationType)) {
    throw new OrganizationPermissionError('Invalid organizationType')
  }

  const ts = nowIso()
  const organization: Organization = {
    id: createOrganizationId('org'),
    displayName,
    organizationType: input.organizationType,
    status: input.status ?? 'active',
    publicVisibility: input.publicVisibility ?? 'private',
    name: displayName,
    type: input.organizationType,
    memberAccountIds: [actor],
    createdAt: ts,
    updatedAt: ts,
  }
  if (input.legalName?.trim()) organization.legalName = input.legalName.trim()

  const membership: OrganizationMembership = {
    id: createOrganizationMembershipId('om'),
    organizationId: organization.id,
    accountId: actor,
    role: 'owner',
    status: 'active',
    joinedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  }

  const memberships = [...loadOrganizationMemberships(), membership]
  saveOrganizationMemberships(memberships)
  persistOrgWithSyncedMembers(organization, memberships)

  return { organization, membership }
}

/**
 * Ensure founder membership exists for a stub Organization (session bridge).
 * Does not create a new Organization — only membership + memberAccountIds sync.
 */
export function ensureFounderOrganizationMembership(
  organizationId: string,
  accountId: string,
): OrganizationMembership {
  const orgId = organizationId.trim()
  const acct = accountId.trim()
  const orgs = loadOrganizations()
  const org = orgs.find((o) => o.id === orgId)
  if (!org) throw new OrganizationPermissionError('Organization not found')

  let memberships = loadOrganizationMemberships()
  const open = findOpenMembership(memberships, orgId, acct)
  if (open && open.status === 'active' && open.role === 'owner') {
    persistOrgWithSyncedMembers(org, memberships)
    return open
  }
  if (open && open.status === 'active') {
    persistOrgWithSyncedMembers(org, memberships)
    return open
  }
  if (open && open.status === 'invited') {
    const ts = nowIso()
    const activated: OrganizationMembership = {
      ...open,
      role: 'owner',
      status: 'active',
      joinedAt: open.joinedAt ?? ts,
      updatedAt: ts,
    }
    memberships = memberships.map((m) => (m.id === activated.id ? activated : m))
    saveOrganizationMemberships(memberships)
    persistOrgWithSyncedMembers(org, memberships)
    return activated
  }

  const ts = nowIso()
  const membership: OrganizationMembership = {
    id: createOrganizationMembershipId('om'),
    organizationId: orgId,
    accountId: acct,
    role: 'owner',
    status: 'active',
    joinedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  }
  memberships = [...memberships, membership]
  saveOrganizationMemberships(memberships)
  persistOrgWithSyncedMembers(org, memberships)
  return membership
}

/**
 * Lazy backfill: stub memberAccountIds without memberships → active owner rows.
 */
export function backfillMembershipsFromStubMemberIds(): number {
  const orgs = loadOrganizations()
  let memberships = loadOrganizationMemberships()
  let created = 0
  const ts = nowIso()

  for (const org of orgs) {
    for (const accountId of org.memberAccountIds) {
      if (findOpenMembership(memberships, org.id, accountId)) continue
      const membership: OrganizationMembership = {
        id: createOrganizationMembershipId('om'),
        organizationId: org.id,
        accountId,
        role: 'owner',
        status: 'active',
        joinedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      }
      memberships = [...memberships, membership]
      created += 1
    }
  }

  if (created > 0) {
    saveOrganizationMemberships(memberships)
    for (const org of orgs) {
      persistOrgWithSyncedMembers(org, memberships)
    }
  }
  return created
}

export type InviteOrganizationMemberInput = {
  organizationId: string
  actorAccountId: string
  inviteeAccountId: string
  role: OrganizationRole
}

export function inviteOrganizationMember(
  input: InviteOrganizationMemberInput,
): OrganizationMembership {
  const orgs = loadOrganizations()
  const org = orgs.find((o) => o.id === input.organizationId.trim())
  if (!org) throw new OrganizationPermissionError('Organization not found')

  const memberships = loadOrganizationMemberships()
  assertCanManageOrganizationMembers(memberships, org, input.actorAccountId)

  const invitee = input.inviteeAccountId.trim()
  if (!invitee) throw new OrganizationPermissionError('inviteeAccountId required')
  if (!isOrganizationRole(input.role)) {
    throw new OrganizationPermissionError('Invalid organization role')
  }
  if (input.role === 'owner') {
    // Inviting as owner is allowed (multi-owner); still goes through invite accept
  }

  const existingOpen = findOpenMembership(memberships, org.id, invitee)
  if (existingOpen) {
    throw new OrganizationPermissionError(
      'Duplicate open membership for this account and organization',
    )
  }

  // Re-invite after removed: create new row (history preserved on old removed row)
  const ts = nowIso()
  const membership: OrganizationMembership = {
    id: createOrganizationMembershipId('om'),
    organizationId: org.id,
    accountId: invitee,
    role: input.role,
    status: 'invited',
    invitedByAccountId: input.actorAccountId.trim(),
    createdAt: ts,
    updatedAt: ts,
  }

  const next = [...memberships, membership]
  saveOrganizationMemberships(next)
  return membership
}

export function acceptOrganizationInvitation(
  membershipId: string,
  actorAccountId: string,
): OrganizationMembership {
  const memberships = loadOrganizationMemberships()
  const membership = memberships.find((m) => m.id === membershipId.trim())
  if (!membership) throw new OrganizationPermissionError('Membership not found')
  assertCanActOnOwnInvitation(membership, actorAccountId.trim())

  const org = loadOrganizations().find((o) => o.id === membership.organizationId)
  if (!org) throw new OrganizationPermissionError('Organization not found')
  if (org.status === 'closed') {
    throw new OrganizationPermissionError('Organization is closed')
  }

  // Guard: another active membership for same pair must not exist
  const otherOpen = memberships.find(
    (m) =>
      m.id !== membership.id &&
      m.organizationId === membership.organizationId &&
      m.accountId === membership.accountId &&
      (m.status === 'active' || m.status === 'invited'),
  )
  if (otherOpen) {
    throw new OrganizationPermissionError('Duplicate open membership')
  }

  const ts = nowIso()
  const updated: OrganizationMembership = {
    ...membership,
    status: 'active',
    joinedAt: ts,
    updatedAt: ts,
  }
  const next = memberships.map((m) => (m.id === updated.id ? updated : m))
  saveOrganizationMemberships(next)
  persistOrgWithSyncedMembers(org, next)
  return updated
}

export function rejectOrganizationInvitation(
  membershipId: string,
  actorAccountId: string,
): OrganizationMembership {
  const memberships = loadOrganizationMemberships()
  const membership = memberships.find((m) => m.id === membershipId.trim())
  if (!membership) throw new OrganizationPermissionError('Membership not found')
  assertCanActOnOwnInvitation(membership, actorAccountId.trim())

  const ts = nowIso()
  const updated: OrganizationMembership = {
    ...membership,
    status: 'removed',
    leftAt: ts,
    updatedAt: ts,
  }
  const next = memberships.map((m) => (m.id === updated.id ? updated : m))
  saveOrganizationMemberships(next)
  return updated
}

export function updateOrganizationMemberRole(
  organizationId: string,
  actorAccountId: string,
  targetMembershipId: string,
  role: OrganizationRole,
): OrganizationMembership {
  if (!isOrganizationRole(role)) {
    throw new OrganizationPermissionError('Invalid organization role')
  }
  const org = loadOrganizations().find((o) => o.id === organizationId.trim())
  if (!org) throw new OrganizationPermissionError('Organization not found')

  const memberships = loadOrganizationMemberships()
  assertCanManageOrganizationMembers(memberships, org, actorAccountId)

  const target = memberships.find((m) => m.id === targetMembershipId.trim())
  if (!target || target.organizationId !== org.id) {
    throw new OrganizationPermissionError('Membership not found in organization')
  }
  if (target.status !== 'active' && target.status !== 'invited') {
    throw new OrganizationPermissionError('Cannot change role of inactive membership')
  }

  assertLastActiveOwnerProtected(memberships, org.id, target, role, target.status)

  const ts = nowIso()
  const updated: OrganizationMembership = {
    ...target,
    role,
    updatedAt: ts,
  }
  const next = memberships.map((m) => (m.id === updated.id ? updated : m))
  saveOrganizationMemberships(next)
  persistOrgWithSyncedMembers(org, next)
  return updated
}

export function suspendOrganizationMember(
  organizationId: string,
  actorAccountId: string,
  targetMembershipId: string,
): OrganizationMembership {
  const org = loadOrganizations().find((o) => o.id === organizationId.trim())
  if (!org) throw new OrganizationPermissionError('Organization not found')

  const memberships = loadOrganizationMemberships()
  assertCanManageOrganizationMembers(memberships, org, actorAccountId)

  const target = memberships.find((m) => m.id === targetMembershipId.trim())
  if (!target || target.organizationId !== org.id) {
    throw new OrganizationPermissionError('Membership not found in organization')
  }
  if (target.status !== 'active') {
    throw new OrganizationPermissionError('Only active members can be suspended')
  }

  assertLastActiveOwnerProtected(memberships, org.id, target, undefined, 'suspended')

  const ts = nowIso()
  const updated: OrganizationMembership = {
    ...target,
    status: 'suspended',
    updatedAt: ts,
  }
  const next = memberships.map((m) => (m.id === updated.id ? updated : m))
  saveOrganizationMemberships(next)
  persistOrgWithSyncedMembers(org, next)
  return updated
}

export function removeOrganizationMember(
  organizationId: string,
  actorAccountId: string,
  targetMembershipId: string,
): OrganizationMembership {
  const org = loadOrganizations().find((o) => o.id === organizationId.trim())
  if (!org) throw new OrganizationPermissionError('Organization not found')

  const memberships = loadOrganizationMemberships()
  assertCanManageOrganizationMembers(memberships, org, actorAccountId)

  const target = memberships.find((m) => m.id === targetMembershipId.trim())
  if (!target || target.organizationId !== org.id) {
    throw new OrganizationPermissionError('Membership not found in organization')
  }
  if (target.status === 'removed') {
    throw new OrganizationPermissionError('Membership already removed')
  }

  assertLastActiveOwnerProtected(memberships, org.id, target, undefined, 'removed')

  const ts = nowIso()
  const updated: OrganizationMembership = {
    ...target,
    status: 'removed',
    leftAt: ts,
    updatedAt: ts,
  }
  const next = memberships.map((m) => (m.id === updated.id ? updated : m))
  saveOrganizationMemberships(next)
  persistOrgWithSyncedMembers(org, next)
  return updated
}

export type UpdateOrganizationSettingsInput = {
  displayName?: string
  legalName?: string | null
  organizationType?: OrganizationType
  publicVisibility?: OrganizationPublicVisibility
  status?: OrganizationStatus
}

export function updateOrganizationSettings(
  organizationId: string,
  actorAccountId: string,
  patch: UpdateOrganizationSettingsInput,
): Organization {
  const orgs = loadOrganizations()
  const org = orgs.find((o) => o.id === organizationId.trim())
  if (!org) throw new OrganizationPermissionError('Organization not found')

  const memberships = loadOrganizationMemberships()
  assertCanManageOrganizationSettings(memberships, org, actorAccountId)

  const next: Organization = { ...org, updatedAt: nowIso() }
  if (typeof patch.displayName === 'string' && patch.displayName.trim()) {
    next.displayName = patch.displayName.trim()
    next.name = next.displayName
  }
  if (patch.legalName === null) {
    delete next.legalName
  } else if (typeof patch.legalName === 'string' && patch.legalName.trim()) {
    next.legalName = patch.legalName.trim()
  }
  if (patch.organizationType !== undefined) {
    if (!isOrganizationType(patch.organizationType)) {
      throw new OrganizationPermissionError('Invalid organizationType')
    }
    next.organizationType = patch.organizationType
    next.type = patch.organizationType
  }
  if (patch.publicVisibility !== undefined) {
    next.publicVisibility = patch.publicVisibility
  }
  if (patch.status !== undefined) {
    next.status = patch.status
  }

  return persistOrgWithSyncedMembers(next, memberships)
}

/**
 * Extension point for ownership transfer workflow (K42: not fully implemented).
 * Throws until a dedicated multi-step transfer is designed.
 */
export function transferOrganizationOwnership(
  _organizationId: string,
  _actorAccountId: string,
  _toAccountId: string,
): never {
  throw new OrganizationPermissionError(
    'Organization ownership transfer workflow is not implemented (K42 extension point)',
  )
}

export function getOrganizationById(organizationId: string): Organization | undefined {
  return loadOrganizations().find((o) => o.id === organizationId.trim())
}

export function listOrganizationsForAccount(accountId: string): Organization[] {
  const acct = accountId.trim()
  const memberships = loadOrganizationMemberships()
  const orgIds = new Set(
    memberships
      .filter((m) => m.accountId === acct && (m.status === 'active' || m.status === 'invited'))
      .map((m) => m.organizationId),
  )
  return loadOrganizations().filter((o) => orgIds.has(o.id))
}
