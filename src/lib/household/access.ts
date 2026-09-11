import { assertPetOwner, isPetOwner, resolvePetOwnerAccountId } from '../pets/ownership'
import { appendHouseholdAccessLog, createHouseholdAccessLogEntry } from './audit'
import { normalizeHouseholdPermissions, suggestedHouseholdPermissionsForRole } from './permissions'
import type {
  HouseholdAccessStatus,
  HouseholdPetPermission,
  HouseholdPetRole,
  PetHouseholdAccess,
  PetHouseholdAccessLog,
} from './types'
import type { Pet } from '../../types'
import type { Account } from '../../types/professional'

export function createHouseholdAccessId(prefix = 'pha'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function isHouseholdAccessEffective(
  access: PetHouseholdAccess | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!access) return false
  if (access.status === 'revoked' || access.status === 'pending' || access.status === 'expired') {
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

export function resolveHouseholdAccessStatus(
  access: PetHouseholdAccess,
  now: number = Date.now(),
): HouseholdAccessStatus {
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

export function hasHouseholdPermission(
  access: PetHouseholdAccess | null | undefined,
  permission: HouseholdPetPermission,
  now: number = Date.now(),
): boolean {
  if (!isHouseholdAccessEffective(access, now)) return false
  return Boolean(access?.permissions.includes(permission))
}

/**
 * Owner has full access independent of any access record.
 * Household members need effective access + explicit permission.
 */
export function actorHasHouseholdPermission(
  pet: Pet,
  actorAccountId: string,
  access: PetHouseholdAccess | null | undefined,
  permission: HouseholdPetPermission,
  now: number = Date.now(),
): boolean {
  if (isPetOwner(pet, actorAccountId)) return true
  return hasHouseholdPermission(access, permission, now)
}

export class HouseholdPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HouseholdPermissionError'
  }
}

/**
 * Lost & Found mark/resolve/close — Owner OR active household access + lost_manage.
 * Role alone is never enough; Professional Access is not consulted.
 */
export function canManagePetLostFound(
  pet: Pet,
  actorAccountId: string,
  accessList: PetHouseholdAccess[],
  now: number = Date.now(),
): boolean {
  const actor = typeof actorAccountId === 'string' ? actorAccountId.trim() : ''
  if (!actor) return false
  if (isPetOwner(pet, actor)) return true
  const access = findHouseholdAccess(accessList, pet.id, actor)
  return hasHouseholdPermission(access, 'lost_manage', now)
}

export function assertCanManagePetLostFound(
  pet: Pet,
  actorAccountId: string,
  accessList: PetHouseholdAccess[],
  now: number = Date.now(),
): Pet {
  if (!canManagePetLostFound(pet, actorAccountId, accessList, now)) {
    throw new HouseholdPermissionError(
      'Only the pet owner or a household member with lost_manage may manage Lost & Found',
    )
  }
  return pet
}

/**
 * Emergency Card write — Owner OR active household access + emergency_write.
 */
export function canWritePetEmergency(
  pet: Pet,
  actorAccountId: string,
  accessList: PetHouseholdAccess[],
  now: number = Date.now(),
): boolean {
  const actor = typeof actorAccountId === 'string' ? actorAccountId.trim() : ''
  if (!actor) return false
  if (isPetOwner(pet, actor)) return true
  const access = findHouseholdAccess(accessList, pet.id, actor)
  return hasHouseholdPermission(access, 'emergency_write', now)
}

export function assertCanWritePetEmergency(
  pet: Pet,
  actorAccountId: string,
  accessList: PetHouseholdAccess[],
  now: number = Date.now(),
): Pet {
  if (!canWritePetEmergency(pet, actorAccountId, accessList, now)) {
    throw new HouseholdPermissionError(
      'Only the pet owner or a household member with emergency_write may edit the Emergency Card',
    )
  }
  return pet
}

/** Emergency Card read — Owner OR active household access + emergency_read. */
export function canReadPetEmergency(
  pet: Pet,
  actorAccountId: string,
  accessList: PetHouseholdAccess[],
  now: number = Date.now(),
): boolean {
  const actor = typeof actorAccountId === 'string' ? actorAccountId.trim() : ''
  if (!actor) return false
  if (isPetOwner(pet, actor)) return true
  const access = findHouseholdAccess(accessList, pet.id, actor)
  return hasHouseholdPermission(access, 'emergency_read', now)
}

export function listHouseholdAccessForPet(
  accessList: PetHouseholdAccess[],
  petId: string,
): PetHouseholdAccess[] {
  return accessList.filter((a) => a.petId === petId)
}

export function listHouseholdAccessForAccount(
  accessList: PetHouseholdAccess[],
  accountId: string,
): PetHouseholdAccess[] {
  return accessList.filter((a) => a.accountId === accountId)
}

export function findHouseholdAccess(
  accessList: PetHouseholdAccess[],
  petId: string,
  accountId: string,
): PetHouseholdAccess | undefined {
  return accessList.find((a) => a.petId === petId && a.accountId === accountId)
}

/** Pending or active grant for the same pet + account (blocks duplicates). */
export function findOpenHouseholdAccess(
  accessList: PetHouseholdAccess[],
  petId: string,
  accountId: string,
): PetHouseholdAccess | undefined {
  return accessList.find(
    (a) =>
      a.petId === petId &&
      a.accountId === accountId &&
      (a.status === 'pending' || a.status === 'active'),
  )
}

export type GrantHouseholdAccessInput = {
  pet: Pet
  accountId: string
  role: HouseholdPetRole
  permissions?: HouseholdPetPermission[]
  grantedByAccountId: string
  /** Accounts catalog for target existence check. */
  accounts: Account[]
  status?: 'pending' | 'active'
  grantedAt?: string
  id?: string
}

export type HouseholdAccessMutationResult = {
  access: PetHouseholdAccess
  accessList: PetHouseholdAccess[]
  logs: PetHouseholdAccessLog[]
}

/**
 * Owner grants household access. Does not create professional access,
 * membership, booking, or payment.
 */
export function grantHouseholdAccess(
  existing: PetHouseholdAccess[],
  logs: PetHouseholdAccessLog[],
  input: GrantHouseholdAccessInput,
): HouseholdAccessMutationResult {
  assertPetOwner(input.pet, input.grantedByAccountId)

  const targetId = input.accountId.trim()
  if (!targetId) throw new Error('Target account id is required')

  const ownerId = resolvePetOwnerAccountId(input.pet)
  if (targetId === ownerId) {
    throw new Error('Owner cannot grant household access to themselves')
  }
  if (targetId === input.grantedByAccountId) {
    throw new Error('Owner cannot grant household access to themselves')
  }

  const target = input.accounts.find((a) => a.id === targetId)
  if (!target) throw new Error(`Target account not found: ${targetId}`)

  const open = findOpenHouseholdAccess(existing, input.pet.id, targetId)
  if (open && open.id !== input.id) {
    throw new Error('Open household access already exists for this account and pet')
  }

  const nowIso = input.grantedAt ?? new Date().toISOString()
  const permissions = normalizeHouseholdPermissions(
    input.permissions ?? suggestedHouseholdPermissionsForRole(input.role),
  )

  const access: PetHouseholdAccess = {
    id: input.id ?? open?.id ?? createHouseholdAccessId(),
    petId: input.pet.id,
    accountId: targetId,
    role: input.role,
    permissions,
    status: input.status ?? 'active',
    grantedByAccountId: input.grantedByAccountId,
    grantedAt: nowIso,
    createdAt: open?.createdAt ?? nowIso,
    updatedAt: nowIso,
  }
  if (input.status === 'pending' || open?.invitedAt) {
    access.invitedAt = open?.invitedAt ?? nowIso
  }

  const entry = createHouseholdAccessLogEntry({
    petId: access.petId,
    accountId: access.accountId,
    action: 'access_granted',
    timestamp: nowIso,
    metadata: {
      accessId: access.id,
      status: access.status,
      role: access.role,
      permissions: [...access.permissions],
    },
  })

  const accessList = [...existing.filter((a) => a.id !== access.id), access]
  return { access, accessList, logs: appendHouseholdAccessLog(logs, entry) }
}

export function revokeHouseholdAccess(
  accessList: PetHouseholdAccess[],
  logs: PetHouseholdAccessLog[],
  accessId: string,
  opts: { pet: Pet; actorAccountId: string },
): { access: PetHouseholdAccess | null; accessList: PetHouseholdAccess[]; logs: PetHouseholdAccessLog[] } {
  assertPetOwner(opts.pet, opts.actorAccountId)

  const current = accessList.find((a) => a.id === accessId)
  if (!current) return { access: null, accessList, logs }
  if (current.petId !== opts.pet.id) {
    throw new Error('Access record does not belong to this pet')
  }

  // Cannot remove the original owner via household access
  if (isPetOwner(opts.pet, current.accountId)) {
    throw new Error('Cannot revoke the original pet owner via household access')
  }

  const nowIso = new Date().toISOString()
  const access: PetHouseholdAccess = {
    ...current,
    status: 'revoked',
    revokedAt: nowIso,
    updatedAt: nowIso,
  }

  const entry = createHouseholdAccessLogEntry({
    petId: access.petId,
    accountId: access.accountId,
    action: 'access_revoked',
    timestamp: nowIso,
    metadata: { accessId: access.id },
  })

  return {
    access,
    accessList: accessList.map((a) => (a.id === accessId ? access : a)),
    logs: appendHouseholdAccessLog(logs, entry),
  }
}

export type UpdateHouseholdAccessInput = {
  pet: Pet
  actorAccountId: string
  role?: HouseholdPetRole
  permissions?: HouseholdPetPermission[]
}

/**
 * Update role and/or permissions on an existing record (no second record).
 * Co-owner cannot transfer ownership — ownership transfer is not supported.
 */
export function updateHouseholdAccess(
  accessList: PetHouseholdAccess[],
  logs: PetHouseholdAccessLog[],
  accessId: string,
  input: UpdateHouseholdAccessInput,
): { access: PetHouseholdAccess | null; accessList: PetHouseholdAccess[]; logs: PetHouseholdAccessLog[] } {
  assertPetOwner(input.pet, input.actorAccountId)

  const current = accessList.find((a) => a.id === accessId)
  if (!current) return { access: null, accessList, logs }
  if (current.petId !== input.pet.id) {
    throw new Error('Access record does not belong to this pet')
  }
  if (current.status === 'revoked' || current.status === 'expired') {
    throw new Error('Cannot update a revoked or expired household access')
  }

  // Guard: never allow treating grantee as owner / ownership transfer
  if (isPetOwner(input.pet, current.accountId)) {
    throw new Error('Cannot change ownership via household access')
  }

  const nowIso = new Date().toISOString()
  const roleChanged = input.role != null && input.role !== current.role
  const nextRole = input.role ?? current.role
  let nextPermissions = current.permissions
  if (input.permissions) {
    nextPermissions = normalizeHouseholdPermissions(input.permissions)
  } else if (roleChanged) {
    nextPermissions = suggestedHouseholdPermissionsForRole(nextRole)
  }

  const access: PetHouseholdAccess = {
    ...current,
    role: nextRole,
    permissions: nextPermissions,
    updatedAt: nowIso,
  }

  const action = roleChanged ? 'role_changed' : 'permissions_updated'
  const entry = createHouseholdAccessLogEntry({
    petId: access.petId,
    accountId: access.accountId,
    action,
    timestamp: nowIso,
    metadata: {
      accessId: access.id,
      role: access.role,
      previousRole: current.role,
      permissions: [...access.permissions],
    },
  })

  return {
    access,
    accessList: accessList.map((a) => (a.id === accessId ? access : a)),
    logs: appendHouseholdAccessLog(logs, entry),
  }
}

/** Explicit reject of ownership transfer / removing original owner. */
export function assertCannotRemoveOrTransferOwner(
  pet: Pet,
  targetAccountId: string,
): void {
  if (isPetOwner(pet, targetAccountId)) {
    throw new Error('Cannot remove or transfer the original pet owner via household access')
  }
}

export function transferPetOwnership(_pet: Pet, _newOwnerAccountId: string): never {
  throw new Error('Ownership transfer is not supported')
}
