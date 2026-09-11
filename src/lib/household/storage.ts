import { normalizeHouseholdPermissions, isHouseholdPetRole } from './permissions'
import {
  HOUSEHOLD_ACCESS_STATUSES,
  type HouseholdAccessStatus,
  type PetHouseholdAccess,
  type PetHouseholdAccessLog,
} from './types'

export const PET_HOUSEHOLD_ACCESS_STORAGE_KEY = 'lovedandknown.petHouseholdAccess'
export const PET_HOUSEHOLD_ACCESS_LOGS_STORAGE_KEY = 'lovedandknown.petHouseholdAccessLogs'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const STATUS_SET = new Set<string>(HOUSEHOLD_ACCESS_STATUSES)

export function normalizePetHouseholdAccess(raw: unknown): PetHouseholdAccess | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const petId = typeof raw.petId === 'string' ? raw.petId.trim() : ''
  const accountId = typeof raw.accountId === 'string' ? raw.accountId.trim() : ''
  const grantedByAccountId =
    typeof raw.grantedByAccountId === 'string' ? raw.grantedByAccountId.trim() : ''
  const status = raw.status
  if (!id || !petId || !accountId || !grantedByAccountId) return null
  if (typeof status !== 'string' || !STATUS_SET.has(status)) return null
  if (!isHouseholdPetRole(raw.role)) return null

  const nowFallback = new Date(0).toISOString()
  const grantedAt =
    typeof raw.grantedAt === 'string' && raw.grantedAt.trim()
      ? raw.grantedAt.trim()
      : nowFallback
  const createdAt =
    typeof raw.createdAt === 'string' && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : grantedAt
  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
      ? raw.updatedAt.trim()
      : grantedAt

  const access: PetHouseholdAccess = {
    id,
    petId,
    accountId,
    role: raw.role,
    permissions: normalizeHouseholdPermissions(raw.permissions),
    status: status as HouseholdAccessStatus,
    grantedByAccountId,
    grantedAt,
    createdAt,
    updatedAt,
  }
  if (typeof raw.revokedAt === 'string' && raw.revokedAt.trim()) {
    access.revokedAt = raw.revokedAt.trim()
  }
  if (typeof raw.expiresAt === 'string' && raw.expiresAt.trim()) {
    access.expiresAt = raw.expiresAt.trim()
  }
  if (typeof raw.invitedAt === 'string' && raw.invitedAt.trim()) {
    access.invitedAt = raw.invitedAt.trim()
  }
  return access
}

export function normalizePetHouseholdAccessList(raw: unknown): PetHouseholdAccess[] {
  if (!Array.isArray(raw)) return []
  const out: PetHouseholdAccess[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const a = normalizePetHouseholdAccess(item)
    if (!a || seen.has(a.id)) continue
    seen.add(a.id)
    out.push(a)
  }
  return out
}

export function normalizeHouseholdAccessLog(raw: unknown): PetHouseholdAccessLog | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const petId = typeof raw.petId === 'string' ? raw.petId.trim() : ''
  const accountId = typeof raw.accountId === 'string' ? raw.accountId.trim() : ''
  const action = typeof raw.action === 'string' ? raw.action.trim() : ''
  const timestamp =
    typeof raw.timestamp === 'string' && raw.timestamp.trim() ? raw.timestamp.trim() : ''
  if (!id || !petId || !accountId || !action || !timestamp) return null
  const entry: PetHouseholdAccessLog = {
    id,
    petId,
    accountId,
    action,
    timestamp,
  }
  if (isRecord(raw.metadata)) entry.metadata = { ...raw.metadata }
  return entry
}

export function normalizeHouseholdAccessLogs(raw: unknown): PetHouseholdAccessLog[] {
  if (!Array.isArray(raw)) return []
  const out: PetHouseholdAccessLog[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const e = normalizeHouseholdAccessLog(item)
    if (!e || seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out
}

function loadJson(key: string): unknown {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function loadPetHouseholdAccess(): PetHouseholdAccess[] {
  return normalizePetHouseholdAccessList(loadJson(PET_HOUSEHOLD_ACCESS_STORAGE_KEY))
}

export function savePetHouseholdAccess(list: PetHouseholdAccess[]): void {
  saveJson(PET_HOUSEHOLD_ACCESS_STORAGE_KEY, normalizePetHouseholdAccessList(list))
}

export function loadPetHouseholdAccessLogs(): PetHouseholdAccessLog[] {
  return normalizeHouseholdAccessLogs(loadJson(PET_HOUSEHOLD_ACCESS_LOGS_STORAGE_KEY))
}

export function savePetHouseholdAccessLogs(list: PetHouseholdAccessLog[]): void {
  saveJson(PET_HOUSEHOLD_ACCESS_LOGS_STORAGE_KEY, normalizeHouseholdAccessLogs(list))
}
