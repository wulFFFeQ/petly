import { appendAccessLog, createAccessLogEntry } from './audit'
import { normalizePermissions } from './permissions'
import type {
  PetProfessionalAccess,
  ProfessionalAccessLog,
  ProfessionalAccessStatus,
  ProfessionalPermission,
} from './types'

export function createAccessId(prefix = 'ppa'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

/**
 * Effective access: status active, not revoked, and not past expiresAt.
 * Stored status `expired` is also non-effective.
 */
export function isAccessEffective(
  access: PetProfessionalAccess | null | undefined,
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

/** Derive runtime status including time-based expiry. */
export function resolveAccessStatus(
  access: PetProfessionalAccess,
  now: number = Date.now(),
): ProfessionalAccessStatus {
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

export function hasPermission(
  access: PetProfessionalAccess | null | undefined,
  permission: ProfessionalPermission,
  now: number = Date.now(),
): boolean {
  if (!isAccessEffective(access, now)) return false
  return Boolean(access?.permissions.includes(permission))
}

export type GrantPetAccessInput = {
  petId: string
  professionalId: string
  permissions: ProfessionalPermission[]
  grantedByAccountId: string
  /** Default `active` for owner-confirmed grants; use `pending` for request flow. */
  status?: 'pending' | 'active'
  expiresAt?: string
  grantedAt?: string
  id?: string
}

export function grantPetAccess(
  existing: PetProfessionalAccess[],
  logs: ProfessionalAccessLog[],
  input: GrantPetAccessInput,
): { access: PetProfessionalAccess; accessList: PetProfessionalAccess[]; logs: ProfessionalAccessLog[] } {
  const nowIso = input.grantedAt ?? new Date().toISOString()
  const access: PetProfessionalAccess = {
    id: input.id ?? createAccessId(),
    petId: input.petId,
    professionalId: input.professionalId,
    permissions: normalizePermissions(input.permissions),
    status: input.status ?? 'active',
    grantedAt: nowIso,
    grantedByAccountId: input.grantedByAccountId,
  }
  if (input.expiresAt) access.expiresAt = input.expiresAt

  const entry = createAccessLogEntry({
    petId: access.petId,
    professionalId: access.professionalId,
    action: 'access_granted',
    timestamp: nowIso,
    metadata: {
      accessId: access.id,
      status: access.status,
      permissions: [...access.permissions],
    },
  })

  const accessList = [...existing.filter((a) => a.id !== access.id), access]
  return { access, accessList, logs: appendAccessLog(logs, entry) }
}

export function activateAccess(
  accessList: PetProfessionalAccess[],
  logs: ProfessionalAccessLog[],
  accessId: string,
  nowIso: string = new Date().toISOString(),
): { accessList: PetProfessionalAccess[]; logs: ProfessionalAccessLog[]; access: PetProfessionalAccess | null } {
  let updated: PetProfessionalAccess | null = null
  const next = accessList.map((a) => {
    if (a.id !== accessId) return a
    updated = {
      ...a,
      status: 'active',
      revokedAt: undefined,
    }
    return updated
  })
  if (!updated) return { accessList, logs, access: null }
  const entry = createAccessLogEntry({
    petId: updated.petId,
    professionalId: updated.professionalId,
    action: 'access_granted',
    timestamp: nowIso,
    metadata: { accessId, activated: true },
  })
  return { accessList: next, logs: appendAccessLog(logs, entry), access: updated }
}

export function revokeAccess(
  accessList: PetProfessionalAccess[],
  logs: ProfessionalAccessLog[],
  accessId: string,
  nowIso: string = new Date().toISOString(),
): { accessList: PetProfessionalAccess[]; logs: ProfessionalAccessLog[]; access: PetProfessionalAccess | null } {
  let updated: PetProfessionalAccess | null = null
  const next = accessList.map((a) => {
    if (a.id !== accessId) return a
    updated = {
      ...a,
      status: 'revoked',
      revokedAt: nowIso,
    }
    return updated
  })
  if (!updated) return { accessList, logs, access: null }
  const entry = createAccessLogEntry({
    petId: updated.petId,
    professionalId: updated.professionalId,
    action: 'access_revoked',
    timestamp: nowIso,
    metadata: { accessId },
  })
  return { accessList: next, logs: appendAccessLog(logs, entry), access: updated }
}

export function listAccessForOwner(
  accessList: PetProfessionalAccess[],
  ownerAccountId: string,
): PetProfessionalAccess[] {
  return accessList.filter((a) => a.grantedByAccountId === ownerAccountId)
}

export function listAccessForPet(
  accessList: PetProfessionalAccess[],
  petId: string,
): PetProfessionalAccess[] {
  return accessList.filter((a) => a.petId === petId)
}

export function listAccessForProfessional(
  accessList: PetProfessionalAccess[],
  professionalId: string,
): PetProfessionalAccess[] {
  return accessList.filter((a) => a.professionalId === professionalId)
}

export function findAccess(
  accessList: PetProfessionalAccess[],
  petId: string,
  professionalId: string,
): PetProfessionalAccess | undefined {
  return accessList.find((a) => a.petId === petId && a.professionalId === professionalId)
}

export function canProfessionalViewHealth(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return hasPermission(access, 'viewHealth', now)
}

export function canProfessionalViewVaccinations(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return (
    hasPermission(access, 'viewVaccinations', now) || hasPermission(access, 'viewHealth', now)
  )
}

export function canProfessionalViewMedications(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return (
    hasPermission(access, 'viewMedications', now) || hasPermission(access, 'viewHealth', now)
  )
}

export function canProfessionalViewDocuments(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return hasPermission(access, 'viewDocuments', now)
}

export function canProfessionalAddVisit(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return hasPermission(access, 'addVisit', now)
}

export function canProfessionalAddVaccination(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return hasPermission(access, 'addVaccination', now)
}

export function canProfessionalAddHealthRecord(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return hasPermission(access, 'addHealthRecord', now)
}

export function canProfessionalAddNote(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): boolean {
  return hasPermission(access, 'addNote', now)
}

export function assertCanAddHealthRecord(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): void {
  if (!canProfessionalAddHealthRecord(access, now)) {
    throw new Error('Professional lacks addHealthRecord permission')
  }
}

export function assertCanAddVisit(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): void {
  if (!canProfessionalAddVisit(access, now)) {
    throw new Error('Professional lacks addVisit permission')
  }
}

export function assertCanAddVaccination(
  access: PetProfessionalAccess | null | undefined,
  now?: number,
): void {
  if (!canProfessionalAddVaccination(access, now)) {
    throw new Error('Professional lacks addVaccination permission')
  }
}
