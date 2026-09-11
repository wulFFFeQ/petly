/**
 * OrganizationPetAccess localStorage (K44).
 * Separate key from PetProfessionalAccess / PetHouseholdAccess.
 */

import { normalizePermissions } from '../professional/permissions'
import { isOrganizationRole } from './permissions'
import {
  ORGANIZATION_PET_ACCESS_STATUSES,
  ORGANIZATION_PET_VISIBILITY_MODES,
  type OrganizationPetAccess,
  type OrganizationPetAccessStatus,
  type OrganizationPetVisibilityMode,
  type OrganizationRole,
} from './types'

export const ORGANIZATION_PET_ACCESS_STORAGE_KEY = 'lovedandknown.organizationPetAccess'

const STATUS_SET = new Set<string>(ORGANIZATION_PET_ACCESS_STATUSES)
const VISIBILITY_SET = new Set<string>(ORGANIZATION_PET_VISIBILITY_MODES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function createOrganizationPetAccessId(prefix = 'opa'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

function normalizeEligibleRoles(raw: unknown): OrganizationRole[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: OrganizationRole[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string' || !isOrganizationRole(item) || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out.length > 0 ? out : undefined
}

export function normalizeOrganizationPetAccess(raw: unknown): OrganizationPetAccess | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const petId = typeof raw.petId === 'string' ? raw.petId.trim() : ''
  const organizationId = typeof raw.organizationId === 'string' ? raw.organizationId.trim() : ''
  const grantedByAccountId =
    typeof raw.grantedByAccountId === 'string' ? raw.grantedByAccountId.trim() : ''
  const grantedAt = typeof raw.grantedAt === 'string' ? raw.grantedAt.trim() : ''
  const status = typeof raw.status === 'string' ? raw.status.trim() : ''
  const visibilityMode =
    typeof raw.visibilityMode === 'string' ? raw.visibilityMode.trim() : 'assigned_only'

  if (!id || !petId || !organizationId || !grantedByAccountId || !grantedAt) return null
  if (!STATUS_SET.has(status)) return null
  if (!VISIBILITY_SET.has(visibilityMode)) return null

  const createdAt =
    typeof raw.createdAt === 'string' && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : grantedAt
  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
      ? raw.updatedAt.trim()
      : createdAt

  const access: OrganizationPetAccess = {
    id,
    petId,
    organizationId,
    permissions: normalizePermissions(raw.permissions),
    status: status as OrganizationPetAccessStatus,
    visibilityMode: visibilityMode as OrganizationPetVisibilityMode,
    grantedAt,
    grantedByAccountId,
    createdAt,
    updatedAt,
  }

  const eligibleRoles = normalizeEligibleRoles(raw.eligibleRoles)
  if (eligibleRoles) access.eligibleRoles = eligibleRoles

  const assigned = normalizeStringList(raw.assignedAccountIds)
  if (assigned.length > 0) access.assignedAccountIds = assigned

  if (typeof raw.locationId === 'string' && raw.locationId.trim()) {
    access.locationId = raw.locationId.trim()
  }
  if (typeof raw.requestedAt === 'string' && raw.requestedAt.trim()) {
    access.requestedAt = raw.requestedAt.trim()
  }
  if (typeof raw.requestedByAccountId === 'string' && raw.requestedByAccountId.trim()) {
    access.requestedByAccountId = raw.requestedByAccountId.trim()
  }
  if (typeof raw.expiresAt === 'string' && raw.expiresAt.trim()) {
    access.expiresAt = raw.expiresAt.trim()
  }
  if (typeof raw.revokedAt === 'string' && raw.revokedAt.trim()) {
    access.revokedAt = raw.revokedAt.trim()
  }

  return access
}

export function normalizeOrganizationPetAccessList(raw: unknown): OrganizationPetAccess[] {
  if (!Array.isArray(raw)) return []
  const out: OrganizationPetAccess[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const access = normalizeOrganizationPetAccess(item)
    if (!access || seen.has(access.id)) continue
    seen.add(access.id)
    out.push(access)
  }
  return out
}

export function loadOrganizationPetAccess(): OrganizationPetAccess[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(ORGANIZATION_PET_ACCESS_STORAGE_KEY)
    if (!raw) return []
    return normalizeOrganizationPetAccessList(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function saveOrganizationPetAccess(list: OrganizationPetAccess[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(ORGANIZATION_PET_ACCESS_STORAGE_KEY, JSON.stringify(list))
}
