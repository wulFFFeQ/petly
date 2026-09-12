import { SELF_OWNER_ID, getUserDisplayName } from '../discover/owner'
import {
  isOrganizationProfessionalType,
  professionalTypeFromRole,
  type OnboardingChoiceId,
  rolesForOnboardingChoice,
} from '../professional/catalog'
import { addAccountRole, isProfessionalAccount, isProfessionalType } from '../professional/roles'
import {
  createProfessionalId,
  loadAccounts,
  loadOrganizations,
  loadProfessionalProfiles,
  normalizeAccount,
  saveAccounts,
  saveOrganizations,
  saveProfessionalProfiles,
} from '../professional/storage'
import {
  ensureFounderOrganizationMembership,
  createOrganizationId,
} from '../organization'
import type {
  Account,
  AccountRole,
  Organization,
  ProfessionalProfile,
  ProfessionalType,
} from '../professional/types'
import { clearUiWorkspace } from './workspace'
import {
  getCachedAuthenticatedAccountId,
  isRealAuthAvailable,
  signOutAuth,
} from '../auth'
import { isDemoLoginAllowed, isRealBackendMode } from '../backend'
import { remoteUpdateMyAccount } from '../api/accountsRemote'

export const ONBOARDING_COMPLETED_KEY = 'lovedandknown.onboardingCompleted'

/** DEMO session flag in the same account/session layer (not a parallel auth system). */
export const SESSION_ACTIVE_KEY = 'lovedandknown.sessionActive'

function nowIso(): string {
  return new Date().toISOString()
}

function onboardingKeyForAccount(accountId: string): string {
  return `${ONBOARDING_COMPLETED_KEY}.${accountId}`
}

function readOnboardingFlag(accountId?: string): boolean {
  if (typeof localStorage === 'undefined') return true
  if (accountId && isRealBackendMode()) {
    return localStorage.getItem(onboardingKeyForAccount(accountId)) === 'true'
  }
  return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true'
}

function writeOnboardingFlag(value: boolean, accountId?: string): void {
  if (typeof localStorage === 'undefined') return
  if (accountId && isRealBackendMode()) {
    const key = onboardingKeyForAccount(accountId)
    if (value) localStorage.setItem(key, 'true')
    else localStorage.removeItem(key)
    return
  }
  if (value) localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
  else localStorage.removeItem(ONBOARDING_COMPLETED_KEY)
}

export function isOnboardingCompleted(): boolean {
  if (isRealBackendMode()) {
    const id = getCachedAuthenticatedAccountId()
    if (!id) return true
    return readOnboardingFlag(id)
  }
  return readOnboardingFlag()
}

export function markOnboardingCompleted(): void {
  if (isRealBackendMode()) {
    const id = getCachedAuthenticatedAccountId()
    if (id) writeOnboardingFlag(true, id)
    return
  }
  writeOnboardingFlag(true)
}

/** DEMO / E2E — clear completion so the wizard shows again. */
export function resetOnboardingDemo(): void {
  writeOnboardingFlag(false)
}

/**
 * Session activity.
 * REAL: authenticated account id from session cache.
 * DEMO: localStorage flag (missing key = active for legacy/e2e).
 */
export function isSessionActive(): boolean {
  if (isRealBackendMode()) {
    return Boolean(getCachedAuthenticatedAccountId())
  }
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(SESSION_ACTIVE_KEY) !== 'false'
}

function writeSessionActive(active: boolean): void {
  if (typeof localStorage === 'undefined') return
  if (active) localStorage.setItem(SESSION_ACTIVE_KEY, 'true')
  else localStorage.setItem(SESSION_ACTIVE_KEY, 'false')
}

/**
 * Activate DEMO session for the existing self account.
 * Throws if REAL backend is configured (DEMO login forbidden).
 */
export function loginSelfSession(): Account {
  if (!isDemoLoginAllowed()) {
    throw new Error('DEMO login is not available in production mode')
  }
  writeSessionActive(true)
  return ensureDefaultSelfAccount({ preferOnboardingWhenEmpty: true })
}

/**
 * Deactivate session and clear session-scoped UI workspace only.
 * When production auth is configured, also signs out the Node API session.
 */
export function logoutSelfSession(): void {
  writeSessionActive(false)
  clearUiWorkspace()
  if (isRealAuthAvailable()) {
    void signOutAuth().catch(() => {
      /* ignore — logout must not fail on auth errors */
    })
  }
}

/** Route for account menu "Můj profil" — no dedicated /profile page. */
export function getMyProfilePath(account?: Account | null): string {
  const self = account ?? getSelfAccount()
  if (isProfessionalAccount(self)) return '/professional/profile'
  return '/settings'
}

export function getSelfAccount(): Account | null {
  if (isRealBackendMode()) {
    const id = getCachedAuthenticatedAccountId()
    if (!id) return null
    const accounts = loadAccounts()
    const found = accounts.find((a) => a.id === id)
    if (found) return found
    return {
      id,
      kind: 'consumer',
      roles: ['owner'],
      displayName: getUserDisplayName(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
  }
  const accounts = loadAccounts()
  return accounts.find((a) => a.id === SELF_OWNER_ID) ?? null
}

export function saveSelfAccount(account: Account): Account {
  const normalized = normalizeAccount(account)
  if (!normalized) {
    throw new Error('Invalid account')
  }
  if (isRealBackendMode() && normalized.id === SELF_OWNER_ID) {
    throw new Error('owner_self is not a production account id')
  }
  const others = loadAccounts().filter((a) => a.id !== normalized.id)
  saveAccounts([...others, normalized])
  return normalized
}

function hasPriorAppData(): boolean {
  if (typeof localStorage === 'undefined') return false
  return (
    Boolean(localStorage.getItem('lovedandknown.pets')) ||
    Boolean(localStorage.getItem('lovedandknown.privacySettings')) ||
    Boolean(localStorage.getItem('lovedandknown.subscription')) ||
    Boolean(localStorage.getItem('lovedandknown.verifications')) ||
    Boolean(localStorage.getItem('lovedandknown.userCity')) ||
    Boolean(localStorage.getItem('lovedandknown.userDisplayName')) ||
    Boolean(localStorage.getItem('lovedandknown.posts'))
  )
}

/**
 * Safe default for existing DEMO users: consumer + owner.
 * REAL mode: never creates owner_self — identity comes from Auth.
 */
export function ensureDefaultSelfAccount(options?: {
  preferOnboardingWhenEmpty?: boolean
}): Account {
  if (isRealBackendMode()) {
    const existing = getSelfAccount()
    if (existing) return existing
    throw new Error('Unauthenticated — no application account')
  }

  const existing = getSelfAccount()
  if (existing) return existing

  const createdAt = nowIso()
  const account: Account = {
    id: SELF_OWNER_ID,
    kind: 'consumer',
    roles: ['owner'],
    displayName: getUserDisplayName(),
    createdAt,
    updatedAt: createdAt,
  }

  saveSelfAccount(account)

  const preferOnboarding = options?.preferOnboardingWhenEmpty === true
  if (preferOnboarding && !hasPriorAppData() && !isOnboardingCompleted()) {
    return account
  }

  markOnboardingCompleted()
  return account
}

/**
 * Whether the self user should see the onboarding wizard.
 */
export function accountNeedsOnboarding(): boolean {
  if (isRealBackendMode()) {
    return Boolean(getCachedAuthenticatedAccountId()) && !isOnboardingCompleted()
  }
  ensureDefaultSelfAccount({ preferOnboardingWhenEmpty: true })
  return !isOnboardingCompleted()
}

export type ProfessionalProfileDraft = {
  displayName: string
  organizationName?: string
  description?: string
  city?: string
  website?: string
  services?: string[]
  publicVisibility?: 'public' | 'private'
}

/**
 * Add a role to the self account. Never grants verification, entitlements, or pet access.
 */
export function addSelfAccountRole(
  role: AccountRole,
  profileDraft?: ProfessionalProfileDraft,
): {
  account: Account
  profile: ProfessionalProfile | null
  organization: Organization | null
} {
  let account = getSelfAccount() ?? ensureDefaultSelfAccount()
  account = addAccountRole(account, role)
  account = saveSelfAccount({ ...account, updatedAt: nowIso() })

  const proType = professionalTypeFromRole(role)
  if (!proType) {
    return { account, profile: null, organization: null }
  }

  const { profile, organization } = upsertProfessionalIdentity(
    account,
    proType,
    profileDraft,
  )
  return { account, profile, organization }
}

export function upsertProfessionalIdentity(
  account: Account,
  type: ProfessionalType,
  draft?: ProfessionalProfileDraft,
): { profile: ProfessionalProfile; organization: Organization | null } {
  const profiles = loadProfessionalProfiles()
  const existing = profiles.find((p) => p.accountId === account.id && p.type === type)
  const ts = nowIso()
  const displayName =
    draft?.displayName?.trim() ||
    account.displayName?.trim() ||
    getUserDisplayName() ||
    getRoleFallbackName(type)

  let organization: Organization | null = null
  let organizationId = existing?.organizationId

  if (isOrganizationProfessionalType(type)) {
    const orgs = loadOrganizations()
    const orgName =
      draft?.organizationName?.trim() ||
      existing?.organizationName?.trim() ||
      displayName
    const existingOrg =
      (organizationId && orgs.find((o) => o.id === organizationId)) ||
      orgs.find(
        (o) =>
          (o.organizationType === type || o.type === type) &&
          o.memberAccountIds.includes(account.id),
      )

    if (existingOrg) {
      organization = {
        ...existingOrg,
        displayName: orgName,
        name: orgName,
        organizationType: existingOrg.organizationType || type,
        type: existingOrg.organizationType || type,
        updatedAt: ts,
      }
      const nextOrgs = orgs.map((o) => (o.id === organization!.id ? organization! : o))
      saveOrganizations(nextOrgs)
      organizationId = organization.id
      ensureFounderOrganizationMembership(organization.id, account.id)
      organization = loadOrganizations().find((o) => o.id === organizationId!) ?? organization
    } else {
      organization = {
        id: createOrganizationId('org'),
        displayName: orgName,
        name: orgName,
        organizationType: type,
        type,
        status: 'active',
        publicVisibility: 'private',
        memberAccountIds: [account.id],
        createdAt: ts,
        updatedAt: ts,
      }
      saveOrganizations([...orgs, organization])
      organizationId = organization.id
      ensureFounderOrganizationMembership(organization.id, account.id)
      organization = loadOrganizations().find((o) => o.id === organizationId!) ?? organization
    }
  }

  const profile: ProfessionalProfile = {
    id: existing?.id ?? createProfessionalId('pro'),
    accountId: account.id,
    type,
    displayName,
    verificationStatus: existing?.verificationStatus ?? 'unverified',
    publicVisibility: draft?.publicVisibility ?? existing?.publicVisibility ?? 'private',
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  }

  if (draft?.organizationName?.trim() || existing?.organizationName) {
    profile.organizationName =
      draft?.organizationName?.trim() || existing?.organizationName
  }
  if (draft?.description?.trim() || existing?.description) {
    profile.description = draft?.description?.trim() || existing?.description
  }
  if (draft?.city?.trim() || existing?.city) {
    profile.city = draft?.city?.trim() || existing?.city
  }
  if (draft?.website?.trim() || existing?.website) {
    profile.website = draft?.website?.trim() || existing?.website
  }
  if (draft?.services?.length || existing?.services?.length) {
    profile.services = draft?.services?.length ? draft.services : existing?.services
  }
  if (organizationId) profile.organizationId = organizationId
  if (existing?.profilePhotoUrl) profile.profilePhotoUrl = existing.profilePhotoUrl
  if (existing?.logoUrl) profile.logoUrl = existing.logoUrl
  if (existing?.phone) profile.phone = existing.phone
  if (existing?.email) profile.email = existing.email
  if (existing?.address) profile.address = existing.address
  if (existing?.specializations) profile.specializations = existing.specializations
  if (existing?.hoursSummary) profile.hoursSummary = existing.hoursSummary
  if (existing?.professionalCredentials) {
    profile.professionalCredentials = existing.professionalCredentials
  }

  const nextProfiles = existing
    ? profiles.map((p) => (p.id === profile.id ? profile : p))
    : [...profiles, profile]
  saveProfessionalProfiles(nextProfiles)

  return { profile, organization }
}

function getRoleFallbackName(type: ProfessionalType): string {
  return type.replace(/_/g, ' ')
}

export type CompleteOnboardingInput = {
  choiceId: OnboardingChoiceId
  serviceRole?: AccountRole
  profileDraft?: ProfessionalProfileDraft
  displayName?: string
}

/**
 * Persist onboarding selection. Role alone never verifies or grants pet access.
 * REAL: account id from Auth session; server updateMyAccount for roles/displayName.
 */
export function completeOnboarding(input: CompleteOnboardingInput): {
  account: Account
  profiles: ProfessionalProfile[]
} {
  const roles = rolesForOnboardingChoice(input.choiceId, input.serviceRole)
  const ts = nowIso()
  const orgOnly =
    roles.length === 1 &&
    isProfessionalType(roles[0]) &&
    isOrganizationProfessionalType(roles[0])

  const accountId = isRealBackendMode()
    ? getCachedAuthenticatedAccountId()
    : SELF_OWNER_ID
  if (!accountId) {
    throw new Error('Unauthenticated onboarding')
  }

  let account: Account = {
    id: accountId,
    kind: orgOnly ? 'professional' : 'consumer',
    roles: [],
    displayName: input.displayName?.trim() || getUserDisplayName(),
    createdAt: getSelfAccount()?.createdAt ?? ts,
    updatedAt: ts,
  }

  for (const role of roles) {
    account = addAccountRole(account, role)
  }
  account = saveSelfAccount(account)

  if (isRealBackendMode()) {
    void remoteUpdateMyAccount({
      displayName: account.displayName,
      roles: account.roles,
      kind: account.kind,
    })
  }

  for (const role of roles) {
    const proType = professionalTypeFromRole(role)
    if (proType) {
      upsertProfessionalIdentity(account, proType, input.profileDraft)
    }
  }

  markOnboardingCompleted()
  return {
    account,
    profiles: loadProfessionalProfiles().filter((p) => p.accountId === account.id),
  }
}

export function listSelfProfessionalProfiles(): ProfessionalProfile[] {
  const account = getSelfAccount()
  if (!account) return []
  return loadProfessionalProfiles().filter((p) => p.accountId === account.id)
}

export function findProfessionalProfileById(id: string): ProfessionalProfile | null {
  return loadProfessionalProfiles().find((p) => p.id === id) ?? null
}

/**
 * Toggle publicVisibility only.
 * Does NOT change verification, entitlements, privacy, or pet professional access.
 */
export function setProfessionalPublicVisibility(
  profileId: string,
  visibility: 'public' | 'private',
): ProfessionalProfile | null {
  const profiles = loadProfessionalProfiles()
  const idx = profiles.findIndex((p) => p.id === profileId)
  if (idx < 0) return null

  const updated: ProfessionalProfile = {
    ...profiles[idx],
    publicVisibility: visibility,
    updatedAt: nowIso(),
  }
  const next = [...profiles]
  next[idx] = updated
  saveProfessionalProfiles(next)
  return updated
}
