/**
 * K50 — Thin clinical authorization glue over existing authorize().
 * Not a new permission / access / health system.
 *
 * Flow: SecurityContext → authorize() → (optional) projection / mutation.
 */

import type { HealthRecord, HealthRecordType, Pet, PetDocument } from '../../types'
import { actorAccountId } from './context'
import { loadPetHouseholdAccess } from '../household/storage'
import { loadOrganizationPetAccess } from '../organization/petAccessStorage'
import { loadOrganizationMemberships } from '../organization/storage'
import { loadPetProfessionalAccess } from '../professional/storage'
import {
  assertAuthorized,
  authorize,
  type AuthorizeDeps,
} from './authorize'
import {
  createDemoSecurityContext,
  type DemoSessionAdapterInput,
} from './demoSessionAdapter'
import { AuthorizationError, isAuthorizationError } from './errors'
import { projectAfterAuthorize } from './adapters/project'
import type {
  ActiveMode,
  AuthorizationDecision,
  SecurityAction,
  SecurityContext,
} from './types'

export type ClinicalGateOptions = {
  /** Workspace mode hint — validated by createDemoSecurityContext. */
  activeMode?: ActiveMode
  claimedOrganizationId?: string
  /** Prefer in-memory pets (AppContext) over localStorage reload. */
  pets?: Pet[]
  deps?: AuthorizeDeps
  correlationId?: string
  requestId?: string
}

export type ClinicalProjectOptions = ClinicalGateOptions & {
  healthRecords?: HealthRecord[]
  documents?: PetDocument[]
  householdAccessId?: string
  professionalAccessId?: string
  organizationAccessId?: string
  actorAccountId?: string
}

/**
 * Infer DEMO workspace mode from the current route when callers omit activeMode.
 * Professional routes use professional facet; otherwise personal (owner/HH).
 */
export function resolveClinicalActiveMode(hint?: ActiveMode): ActiveMode {
  if (hint) return hint
  if (typeof window !== 'undefined') {
    const path = window.location.pathname
    if (path.startsWith('/professional')) return 'professional'
  }
  return 'personal'
}

/** Standard DEMO authorize deps — uses existing grant loaders. */
export function buildDemoClinicalAuthorizeDeps(options?: {
  pets?: Pet[]
  deps?: AuthorizeDeps
}): AuthorizeDeps {
  const base = options?.deps ?? {}
  return {
    ...base,
    store: {
      ...(base.store ?? {}),
      ...(options?.pets ? { pets: options.pets } : {}),
    },
    household: {
      loadAccess: loadPetHouseholdAccess,
      ...(base.household ?? {}),
    },
    professional: {
      loadAccess: loadPetProfessionalAccess,
      ...(base.professional ?? {}),
    },
    organizationPet: {
      loadAccess: loadOrganizationPetAccess,
      loadMemberships: loadOrganizationMemberships,
      ...(base.organizationPet ?? {}),
    },
  }
}

function buildSessionInput(options?: ClinicalGateOptions): DemoSessionAdapterInput {
  const activeMode = resolveClinicalActiveMode(options?.activeMode)
  return {
    activeMode,
    claimedOrganizationId: options?.claimedOrganizationId,
    correlationId: options?.correlationId,
    requestId: options?.requestId,
  }
}

/**
 * Map HealthRecord type → write SecurityAction (existing vocabulary only).
 */
export function writeActionForHealthRecordType(type: HealthRecordType): SecurityAction {
  switch (type) {
    case 'vaccination':
      return 'vaccination.write'
    case 'medication':
      return 'medication.write'
    case 'examination':
      return 'labs.write'
    case 'vet':
    case 'assessment':
    default:
      return 'health.write'
  }
}

/**
 * Authorize a clinical pet action via central authorize().
 * Always audits through K48 (inside authorize finish()).
 */
export function authorizePetClinical(
  action: SecurityAction,
  petId: string,
  options?: ClinicalGateOptions,
): AuthorizationDecision {
  const session = createDemoSecurityContext(buildSessionInput(options))
  const deps = buildDemoClinicalAuthorizeDeps({
    pets: options?.pets,
    deps: options?.deps,
  })
  return authorize(
    session.context,
    {
      action,
      resource: { type: 'pet', id: petId },
      claimedOrganizationId: options?.claimedOrganizationId,
    },
    deps,
  )
}

/**
 * Throws AuthorizationError on deny. Use before clinical mutations.
 */
export function assertPetClinical(
  action: SecurityAction,
  petId: string,
  options?: ClinicalGateOptions,
): void {
  const session = createDemoSecurityContext(buildSessionInput(options))
  const deps = buildDemoClinicalAuthorizeDeps({
    pets: options?.pets,
    deps: options?.deps,
  })
  if (!session.ok && session.reason === 'unauthenticated') {
    throw new AuthorizationError('unauthenticated', session.message, 'unauthenticated')
  }
  assertAuthorized(
    session.context,
    {
      action,
      resource: { type: 'pet', id: petId },
      claimedOrganizationId: options?.claimedOrganizationId,
    },
    deps,
  )
}

/** Non-throwing allow check for UI enablement (not a security boundary). */
export function canPetClinical(
  action: SecurityAction,
  petId: string,
  options?: ClinicalGateOptions,
): boolean {
  return authorizePetClinical(action, petId, options).allowed
}

/**
 * Filter pets the current actor may clinically read/write.
 * Deny-by-default — never falls back to mock seed.
 */
export function filterPetsWithClinicalAccess(
  pets: Pet[],
  action: SecurityAction,
  options?: ClinicalGateOptions,
): Pet[] {
  return pets.filter((pet) =>
    canPetClinical(action, pet.id, { ...options, pets }),
  )
}

/**
 * Filter HealthRecords to those whose petId is ALLOW for the action.
 */
export function filterHealthRecordsForClinicalAccess(
  records: HealthRecord[],
  pets: Pet[],
  action: SecurityAction = 'health.read',
  options?: ClinicalGateOptions,
): HealthRecord[] {
  const allowedIds = new Set(
    filterPetsWithClinicalAccess(pets, action, options).map((p) => p.id),
  )
  return records.filter((r) => allowedIds.has(r.petId))
}

/**
 * Authorize then project via existing domain projectors.
 * Returns null on deny — never mock fallback.
 */
export function projectPetAfterClinicalAuthorize(
  pet: Pet,
  action: SecurityAction,
  options?: ClinicalProjectOptions,
): unknown | null {
  const decision = authorizePetClinical(action, pet.id, options)
  if (!decision.allowed) return null

  const path =
    decision.path === 'owner'
      ? 'owner'
      : decision.path === 'household'
        ? 'household'
        : decision.path === 'professional'
          ? 'professional'
          : decision.path === 'organization'
            ? 'organization'
            : 'public'

  const session = createDemoSecurityContext(buildSessionInput(options))
  const actorId = options?.actorAccountId ?? actorAccountId(session.context) ?? undefined

  const hhList = loadPetHouseholdAccess()
  const proList = loadPetProfessionalAccess()
  const orgList = loadOrganizationPetAccess()
  const memberships = loadOrganizationMemberships()

  const orgId =
    options?.claimedOrganizationId ?? session.context.organization?.organizationId

  return projectAfterAuthorize(decision, pet, {
    path,
    actorAccountId: actorId,
    healthRecords: options?.healthRecords,
    documents: options?.documents,
    householdAccess:
      hhList.find(
        (a) =>
          a.petId === pet.id &&
          (!actorId || a.accountId === actorId) &&
          (!options?.householdAccessId || a.id === options.householdAccessId),
      ) ?? null,
    professionalAccess:
      proList.find(
        (a) =>
          a.petId === pet.id &&
          (!options?.professionalAccessId || a.id === options.professionalAccessId) &&
          (path !== 'professional' ||
            !session.context.professional ||
            a.professionalId === session.context.professional.professionalProfileId),
      ) ?? null,
    organizationAccess:
      orgList.find(
        (a) =>
          a.petId === pet.id &&
          (!orgId || a.organizationId === orgId) &&
          (!options?.organizationAccessId || a.id === options.organizationAccessId),
      ) ?? null,
    membership:
      memberships.find(
        (m) =>
          m.accountId === actorId &&
          (!orgId || m.organizationId === orgId),
      ) ?? null,
  })
}

/** Swallow AuthorizationError into a boolean for UI handlers. */
export function tryAssertPetClinical(
  action: SecurityAction,
  petId: string,
  options?: ClinicalGateOptions,
): { ok: true } | { ok: false; error: AuthorizationError } {
  try {
    assertPetClinical(action, petId, options)
    return { ok: true }
  } catch (err) {
    if (isAuthorizationError(err)) return { ok: false, error: err }
    throw err
  }
}

export type { SecurityContext }
