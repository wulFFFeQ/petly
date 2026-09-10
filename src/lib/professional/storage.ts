import { normalizePermissions } from './permissions'
import { isProfessionalType } from './roles'
import {
  ACCOUNT_KINDS,
  PROFESSIONAL_ACCESS_STATUSES,
  PROFESSIONAL_PUBLIC_VISIBILITIES,
  type Account,
  type AccountKind,
  type AccountRole,
  type Organization,
  type PetProfessionalAccess,
  type ProfessionalAccessLog,
  type ProfessionalAccessLogAction,
  type ProfessionalAccessStatus,
  type ProfessionalProfile,
  type ProfessionalPublicVisibility,
  type ProfessionalType,
  type ProfessionalVerificationStatus,
} from './types'

export const ACCOUNTS_STORAGE_KEY = 'lovedandknown.accounts'
export const PROFESSIONAL_PROFILES_STORAGE_KEY = 'lovedandknown.professionalProfiles'
export const PET_PROFESSIONAL_ACCESS_STORAGE_KEY = 'lovedandknown.petProfessionalAccess'
export const PROFESSIONAL_ACCESS_LOGS_STORAGE_KEY = 'lovedandknown.professionalAccessLogs'
export const ORGANIZATIONS_STORAGE_KEY = 'lovedandknown.organizations'

const KIND_SET = new Set<string>(ACCOUNT_KINDS)
const STATUS_SET = new Set<string>(PROFESSIONAL_ACCESS_STATUSES)
const VISIBILITY_SET = new Set<string>(PROFESSIONAL_PUBLIC_VISIBILITIES)
const VERIFICATION_STATUS_SET = new Set([
  'unverified',
  'pending',
  'verified',
  'expired',
  'revoked',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function createProfessionalId(prefix = 'pro'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function normalizeAccount(raw: unknown): Account | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const kind = raw.kind
  if (!id || typeof kind !== 'string' || !KIND_SET.has(kind)) return null
  const rolesRaw = Array.isArray(raw.roles) ? raw.roles : []
  const roles: AccountRole[] = []
  for (const r of rolesRaw) {
    if (typeof r !== 'string' || !r.trim()) continue
    const role = r.trim() as AccountRole
    if (role === 'owner' || isProfessionalType(role)) {
      if (!roles.includes(role)) roles.push(role)
    }
  }
  if (roles.length === 0) {
    if (kind === 'consumer') roles.push('owner')
    else return null
  }
  const account: Account = {
    id,
    kind: kind as AccountKind,
    roles,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt.trim()
        ? raw.createdAt.trim()
        : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt.trim()
        : new Date(0).toISOString(),
  }
  if (typeof raw.displayName === 'string' && raw.displayName.trim()) {
    account.displayName = raw.displayName.trim()
  }
  return account
}

export function normalizeAccounts(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return []
  const out: Account[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const a = normalizeAccount(item)
    if (!a || seen.has(a.id)) continue
    seen.add(a.id)
    out.push(a)
  }
  return out
}

export function normalizeProfessionalProfile(raw: unknown): ProfessionalProfile | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const accountId = typeof raw.accountId === 'string' ? raw.accountId.trim() : ''
  const displayName = typeof raw.displayName === 'string' ? raw.displayName.trim() : ''
  const typeRaw = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!id || !accountId || !displayName || !typeRaw || !isProfessionalType(typeRaw)) return null

  let verificationStatus: ProfessionalVerificationStatus = 'unverified'
  if (
    typeof raw.verificationStatus === 'string' &&
    VERIFICATION_STATUS_SET.has(raw.verificationStatus)
  ) {
    verificationStatus = raw.verificationStatus as ProfessionalVerificationStatus
  }

  const profile: ProfessionalProfile = {
    id,
    accountId,
    type: typeRaw as ProfessionalType,
    displayName,
    verificationStatus,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt.trim()
        ? raw.createdAt.trim()
        : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt.trim()
        : new Date(0).toISOString(),
  }

  if (typeof raw.organizationName === 'string' && raw.organizationName.trim()) {
    profile.organizationName = raw.organizationName.trim()
  }
  if (typeof raw.description === 'string' && raw.description.trim()) {
    profile.description = raw.description.trim()
  }
  if (typeof raw.phone === 'string' && raw.phone.trim()) profile.phone = raw.phone.trim()
  if (typeof raw.email === 'string' && raw.email.trim()) profile.email = raw.email.trim()
  if (typeof raw.address === 'string' && raw.address.trim()) profile.address = raw.address.trim()
  if (typeof raw.website === 'string' && raw.website.trim()) profile.website = raw.website.trim()
  if (typeof raw.city === 'string' && raw.city.trim()) profile.city = raw.city.trim()
  if (typeof raw.hoursSummary === 'string' && raw.hoursSummary.trim()) {
    profile.hoursSummary = raw.hoursSummary.trim()
  }
  if (Array.isArray(raw.specializations)) {
    profile.specializations = raw.specializations
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim())
  }
  if (Array.isArray(raw.services)) {
    profile.services = raw.services
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim())
  }
  if (typeof raw.profilePhotoUrl === 'string' && raw.profilePhotoUrl.trim()) {
    profile.profilePhotoUrl = raw.profilePhotoUrl.trim()
  }
  if (typeof raw.logoUrl === 'string' && raw.logoUrl.trim()) {
    profile.logoUrl = raw.logoUrl.trim()
  }
  if (
    typeof raw.publicVisibility === 'string' &&
    VISIBILITY_SET.has(raw.publicVisibility)
  ) {
    profile.publicVisibility = raw.publicVisibility as ProfessionalPublicVisibility
  } else {
    profile.publicVisibility = 'private'
  }
  if (typeof raw.organizationId === 'string' && raw.organizationId.trim()) {
    profile.organizationId = raw.organizationId.trim()
  }
  if (isRecord(raw.professionalCredentials)) {
    const creds: NonNullable<ProfessionalProfile['professionalCredentials']> = {}
    if (typeof raw.professionalCredentials.licenseNumber === 'string') {
      creds.licenseNumber = raw.professionalCredentials.licenseNumber
    }
    if (typeof raw.professionalCredentials.registrationId === 'string') {
      creds.registrationId = raw.professionalCredentials.registrationId
    }
    if (Array.isArray(raw.professionalCredentials.specialties)) {
      creds.specialties = raw.professionalCredentials.specialties.filter(
        (s): s is string => typeof s === 'string',
      )
    }
    if (Object.keys(creds).length > 0) profile.professionalCredentials = creds
  }

  return profile
}

export function normalizeOrganization(raw: unknown): Organization | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const typeRaw = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!id || !name || !typeRaw || !isProfessionalType(typeRaw)) return null

  const membersRaw = Array.isArray(raw.memberAccountIds) ? raw.memberAccountIds : []
  const memberAccountIds: string[] = []
  for (const m of membersRaw) {
    if (typeof m !== 'string' || !m.trim()) continue
    const mid = m.trim()
    if (!memberAccountIds.includes(mid)) memberAccountIds.push(mid)
  }

  return {
    id,
    type: typeRaw as ProfessionalType,
    name,
    memberAccountIds,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt.trim()
        ? raw.createdAt.trim()
        : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt.trim()
        : new Date(0).toISOString(),
  }
}

export function normalizeOrganizations(raw: unknown): Organization[] {
  if (!Array.isArray(raw)) return []
  const out: Organization[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const o = normalizeOrganization(item)
    if (!o || seen.has(o.id)) continue
    seen.add(o.id)
    out.push(o)
  }
  return out
}

export function normalizeProfessionalProfiles(raw: unknown): ProfessionalProfile[] {
  if (!Array.isArray(raw)) return []
  const out: ProfessionalProfile[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const p = normalizeProfessionalProfile(item)
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

export function normalizePetProfessionalAccess(raw: unknown): PetProfessionalAccess | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const petId = typeof raw.petId === 'string' ? raw.petId.trim() : ''
  const professionalId = typeof raw.professionalId === 'string' ? raw.professionalId.trim() : ''
  const grantedByAccountId =
    typeof raw.grantedByAccountId === 'string' ? raw.grantedByAccountId.trim() : ''
  const status = raw.status
  if (!id || !petId || !professionalId || !grantedByAccountId) return null
  if (typeof status !== 'string' || !STATUS_SET.has(status)) return null

  const access: PetProfessionalAccess = {
    id,
    petId,
    professionalId,
    permissions: normalizePermissions(raw.permissions),
    status: status as ProfessionalAccessStatus,
    grantedAt:
      typeof raw.grantedAt === 'string' && raw.grantedAt.trim()
        ? raw.grantedAt.trim()
        : new Date(0).toISOString(),
    grantedByAccountId,
  }
  if (typeof raw.expiresAt === 'string' && raw.expiresAt.trim()) {
    access.expiresAt = raw.expiresAt.trim()
  }
  if (typeof raw.revokedAt === 'string' && raw.revokedAt.trim()) {
    access.revokedAt = raw.revokedAt.trim()
  }
  if (typeof raw.requestedAt === 'string' && raw.requestedAt.trim()) {
    access.requestedAt = raw.requestedAt.trim()
  }
  return access
}

export function normalizePetProfessionalAccessList(raw: unknown): PetProfessionalAccess[] {
  if (!Array.isArray(raw)) return []
  const out: PetProfessionalAccess[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const a = normalizePetProfessionalAccess(item)
    if (!a || seen.has(a.id)) continue
    seen.add(a.id)
    out.push(a)
  }
  return out
}

export function normalizeAccessLog(raw: unknown): ProfessionalAccessLog | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const petId = typeof raw.petId === 'string' ? raw.petId.trim() : ''
  const professionalId = typeof raw.professionalId === 'string' ? raw.professionalId.trim() : ''
  const action = typeof raw.action === 'string' ? raw.action.trim() : ''
  const timestamp =
    typeof raw.timestamp === 'string' && raw.timestamp.trim()
      ? raw.timestamp.trim()
      : ''
  if (!id || !petId || !professionalId || !action || !timestamp) return null
  const entry: ProfessionalAccessLog = {
    id,
    petId,
    professionalId,
    action: action as ProfessionalAccessLogAction,
    timestamp,
  }
  if (isRecord(raw.metadata)) entry.metadata = { ...raw.metadata }
  return entry
}

export function normalizeAccessLogs(raw: unknown): ProfessionalAccessLog[] {
  if (!Array.isArray(raw)) return []
  const out: ProfessionalAccessLog[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const e = normalizeAccessLog(item)
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

export function loadAccounts(): Account[] {
  return normalizeAccounts(loadJson(ACCOUNTS_STORAGE_KEY))
}

export function saveAccounts(list: Account[]): void {
  saveJson(ACCOUNTS_STORAGE_KEY, normalizeAccounts(list))
}

export function loadProfessionalProfiles(): ProfessionalProfile[] {
  return normalizeProfessionalProfiles(loadJson(PROFESSIONAL_PROFILES_STORAGE_KEY))
}

export function saveProfessionalProfiles(list: ProfessionalProfile[]): void {
  saveJson(PROFESSIONAL_PROFILES_STORAGE_KEY, normalizeProfessionalProfiles(list))
}

export function loadPetProfessionalAccess(): PetProfessionalAccess[] {
  return normalizePetProfessionalAccessList(loadJson(PET_PROFESSIONAL_ACCESS_STORAGE_KEY))
}

export function savePetProfessionalAccess(list: PetProfessionalAccess[]): void {
  saveJson(PET_PROFESSIONAL_ACCESS_STORAGE_KEY, normalizePetProfessionalAccessList(list))
}

export function loadProfessionalAccessLogs(): ProfessionalAccessLog[] {
  return normalizeAccessLogs(loadJson(PROFESSIONAL_ACCESS_LOGS_STORAGE_KEY))
}

export function saveProfessionalAccessLogs(list: ProfessionalAccessLog[]): void {
  saveJson(PROFESSIONAL_ACCESS_LOGS_STORAGE_KEY, normalizeAccessLogs(list))
}

export function loadOrganizations(): Organization[] {
  return normalizeOrganizations(loadJson(ORGANIZATIONS_STORAGE_KEY))
}

export function saveOrganizations(list: Organization[]): void {
  saveJson(ORGANIZATIONS_STORAGE_KEY, normalizeOrganizations(list))
}
