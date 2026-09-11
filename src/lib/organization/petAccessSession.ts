/**
 * OrganizationPetAccess session API — load/save + owner mutations (K44).
 */

import type { Pet } from '../../types'
import type { ProfessionalPermission } from '../professional/types'
import {
  activateOrganizationPetAccess,
  expireOrganizationPetAccess,
  grantOrganizationPetAccess,
  listOrganizationPetAccessForOrganization,
  listOrganizationPetAccessForPet,
  requestOrganizationPetAccess,
  revokeOrganizationPetAccess,
  updateOrganizationPetAccessAssignments,
  type GrantOrganizationPetAccessInput,
  type RequestOrganizationPetAccessInput,
} from './petAccess'
import {
  loadOrganizationPetAccess,
  saveOrganizationPetAccess,
} from './petAccessStorage'
import type { OrganizationPetAccess, OrganizationRole } from './types'

export type OrganizationPetAccessSessionResult = {
  access: OrganizationPetAccess | null
  accessList: OrganizationPetAccess[]
}

function persist(accessList: OrganizationPetAccess[]): void {
  saveOrganizationPetAccess(accessList)
}

export function loadOrganizationPetAccessState(): {
  accessList: OrganizationPetAccess[]
} {
  return { accessList: loadOrganizationPetAccess() }
}

/** Owner-confirmed grant (default active). Blocks duplicate open access. */
export function grantOwnerOrganizationPetAccess(
  input: GrantOrganizationPetAccessInput,
): OrganizationPetAccessSessionResult & { access: OrganizationPetAccess } {
  const { accessList } = loadOrganizationPetAccessState()
  const result = grantOrganizationPetAccess(accessList, {
    ...input,
    status: input.status ?? 'active',
  })
  persist(result.accessList)
  return result
}

/** Org (or intermediary) creates a pending request — no data access yet. */
export function requestOwnerOrganizationPetAccess(
  input: RequestOrganizationPetAccessInput,
): OrganizationPetAccessSessionResult & { access: OrganizationPetAccess } {
  const { accessList } = loadOrganizationPetAccessState()
  const result = requestOrganizationPetAccess(accessList, input)
  persist(result.accessList)
  return result
}

export function approveOrganizationPetAccess(
  accessId: string,
  pet: Pet,
  actorAccountId: string,
): OrganizationPetAccessSessionResult {
  const { accessList } = loadOrganizationPetAccessState()
  const result = activateOrganizationPetAccess(accessList, accessId, pet, actorAccountId)
  if (result.access) persist(result.accessList)
  return result
}

export function revokeOwnerOrganizationPetAccess(
  accessId: string,
  pet: Pet,
  actorAccountId: string,
): OrganizationPetAccessSessionResult {
  const { accessList } = loadOrganizationPetAccessState()
  const result = revokeOrganizationPetAccess(accessList, accessId, pet, actorAccountId)
  if (result.access) persist(result.accessList)
  return result
}

export function setOrganizationPetAccessAssignments(
  accessId: string,
  pet: Pet,
  actorAccountId: string,
  assignedAccountIds: string[],
): OrganizationPetAccessSessionResult {
  const { accessList } = loadOrganizationPetAccessState()
  const result = updateOrganizationPetAccessAssignments(
    accessList,
    accessId,
    pet,
    actorAccountId,
    assignedAccountIds,
  )
  if (result.access) persist(result.accessList)
  return result
}

export function expireOwnerOrganizationPetAccess(
  accessId: string,
): OrganizationPetAccessSessionResult {
  const { accessList } = loadOrganizationPetAccessState()
  const result = expireOrganizationPetAccess(accessList, accessId)
  if (result.access) persist(result.accessList)
  return result
}

export function listStoredOrganizationPetAccessForPet(petId: string): OrganizationPetAccess[] {
  return listOrganizationPetAccessForPet(loadOrganizationPetAccess(), petId)
}

export function listStoredOrganizationPetAccessForOrganization(
  organizationId: string,
): OrganizationPetAccess[] {
  return listOrganizationPetAccessForOrganization(loadOrganizationPetAccess(), organizationId)
}

/** Convenience: owner grant with common clinic defaults. */
export function grantClinicPetAccess(opts: {
  pet: Pet
  organizationId: string
  grantedByAccountId: string
  permissions: ProfessionalPermission[]
  assignedAccountIds?: string[]
  visibilityMode?: GrantOrganizationPetAccessInput['visibilityMode']
  eligibleRoles?: OrganizationRole[]
}): OrganizationPetAccess {
  return grantOwnerOrganizationPetAccess({
    pet: opts.pet,
    organizationId: opts.organizationId,
    grantedByAccountId: opts.grantedByAccountId,
    permissions: opts.permissions,
    assignedAccountIds: opts.assignedAccountIds,
    visibilityMode: opts.visibilityMode ?? 'assigned_only',
    eligibleRoles: opts.eligibleRoles,
  }).access
}
