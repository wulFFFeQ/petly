import { isOrganizationRole, isOrganizationType } from './permissions'
import {
  ORGANIZATION_MEMBERSHIP_STATUSES,
  ORGANIZATION_PUBLIC_VISIBILITIES,
  ORGANIZATION_STATUSES,
  type Organization,
  type OrganizationMembership,
  type OrganizationMembershipStatus,
  type OrganizationPublicVisibility,
  type OrganizationStatus,
  type OrganizationType,
} from './types'

export const ORGANIZATIONS_STORAGE_KEY = 'lovedandknown.organizations'
export const ORGANIZATION_MEMBERSHIPS_STORAGE_KEY = 'lovedandknown.organizationMemberships'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const STATUS_SET = new Set<string>(ORGANIZATION_STATUSES)
const VISIBILITY_SET = new Set<string>(ORGANIZATION_PUBLIC_VISIBILITIES)
const MEMBERSHIP_STATUS_SET = new Set<string>(ORGANIZATION_MEMBERSHIP_STATUSES)

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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}

export function createOrganizationId(prefix = 'org'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function createOrganizationMembershipId(prefix = 'om'): string {
  return createOrganizationId(prefix)
}

function resolveOrganizationType(raw: Record<string, unknown>): OrganizationType | null {
  const fromNew =
    typeof raw.organizationType === 'string' ? raw.organizationType.trim() : ''
  const fromLegacy = typeof raw.type === 'string' ? raw.type.trim() : ''
  const candidate = fromNew || fromLegacy
  if (!candidate) return null
  if (isOrganizationType(candidate)) return candidate
  // Legacy org stubs used ProfessionalType strings that are also OrganizationTypes
  // (veterinary_clinic, shelter, …). Accept known list only via isOrganizationType.
  // Allow extensibility for future string & {} by accepting non-empty trimmed strings
  // that are not consumer-only roles — keep strict for K42: known types only.
  return null
}

function resolveDisplayName(raw: Record<string, unknown>): string {
  const fromNew = typeof raw.displayName === 'string' ? raw.displayName.trim() : ''
  const fromLegacy = typeof raw.name === 'string' ? raw.name.trim() : ''
  return fromNew || fromLegacy
}

function resolveStatus(raw: Record<string, unknown>): OrganizationStatus {
  if (typeof raw.status === 'string' && STATUS_SET.has(raw.status)) {
    return raw.status as OrganizationStatus
  }
  return 'active'
}

function resolveVisibility(raw: Record<string, unknown>): OrganizationPublicVisibility {
  if (typeof raw.publicVisibility === 'string' && VISIBILITY_SET.has(raw.publicVisibility)) {
    return raw.publicVisibility as OrganizationPublicVisibility
  }
  return 'private'
}

function normalizeMemberAccountIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const m of raw) {
    if (typeof m !== 'string' || !m.trim()) continue
    const mid = m.trim()
    if (!out.includes(mid)) out.push(mid)
  }
  return out
}

/**
 * Normalize Organization with legacy stub compat (name/type/memberAccountIds).
 */
export function normalizeOrganization(raw: unknown): Organization | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const displayName = resolveDisplayName(raw)
  const organizationType = resolveOrganizationType(raw)
  if (!id || !displayName || !organizationType) return null

  const org: Organization = {
    id,
    displayName,
    organizationType,
    status: resolveStatus(raw),
    publicVisibility: resolveVisibility(raw),
    name: displayName,
    type: organizationType,
    memberAccountIds: normalizeMemberAccountIds(raw.memberAccountIds),
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt.trim()
        ? raw.createdAt.trim()
        : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
        ? raw.updatedAt.trim()
        : new Date(0).toISOString(),
  }
  if (typeof raw.legalName === 'string' && raw.legalName.trim()) {
    org.legalName = raw.legalName.trim()
  }
  return org
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

export function normalizeOrganizationMembership(raw: unknown): OrganizationMembership | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const organizationId = typeof raw.organizationId === 'string' ? raw.organizationId.trim() : ''
  const accountId = typeof raw.accountId === 'string' ? raw.accountId.trim() : ''
  const status = raw.status
  if (!id || !organizationId || !accountId) return null
  if (typeof status !== 'string' || !MEMBERSHIP_STATUS_SET.has(status)) return null
  if (!isOrganizationRole(raw.role)) return null

  const nowFallback = new Date(0).toISOString()
  const createdAt =
    typeof raw.createdAt === 'string' && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : nowFallback
  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
      ? raw.updatedAt.trim()
      : createdAt

  const membership: OrganizationMembership = {
    id,
    organizationId,
    accountId,
    role: raw.role,
    status: status as OrganizationMembershipStatus,
    createdAt,
    updatedAt,
  }
  if (typeof raw.invitedByAccountId === 'string' && raw.invitedByAccountId.trim()) {
    membership.invitedByAccountId = raw.invitedByAccountId.trim()
  }
  if (typeof raw.joinedAt === 'string' && raw.joinedAt.trim()) {
    membership.joinedAt = raw.joinedAt.trim()
  }
  if (typeof raw.leftAt === 'string' && raw.leftAt.trim()) {
    membership.leftAt = raw.leftAt.trim()
  }
  return membership
}

export function normalizeOrganizationMemberships(raw: unknown): OrganizationMembership[] {
  if (!Array.isArray(raw)) return []
  const out: OrganizationMembership[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const m = normalizeOrganizationMembership(item)
    if (!m || seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out
}

export function loadOrganizations(): Organization[] {
  return normalizeOrganizations(loadJson(ORGANIZATIONS_STORAGE_KEY))
}

export function saveOrganizations(list: Organization[]): void {
  saveJson(ORGANIZATIONS_STORAGE_KEY, normalizeOrganizations(list))
}

export function loadOrganizationMemberships(): OrganizationMembership[] {
  return normalizeOrganizationMemberships(loadJson(ORGANIZATION_MEMBERSHIPS_STORAGE_KEY))
}

export function saveOrganizationMemberships(list: OrganizationMembership[]): void {
  saveJson(ORGANIZATION_MEMBERSHIPS_STORAGE_KEY, normalizeOrganizationMemberships(list))
}

/** Sync deprecated memberAccountIds from active memberships. */
export function syncOrganizationMemberAccountIds(
  org: Organization,
  memberships: OrganizationMembership[],
): Organization {
  const activeIds = memberships
    .filter((m) => m.organizationId === org.id && m.status === 'active')
    .map((m) => m.accountId)
  const unique: string[] = []
  for (const id of activeIds) {
    if (!unique.includes(id)) unique.push(id)
  }
  return {
    ...org,
    memberAccountIds: unique,
    name: org.displayName,
    type: org.organizationType,
  }
}
