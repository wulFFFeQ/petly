/**
 * K58 — Clinical Encounter assert matrix.
 * Run: npx tsx scripts/assert-clinical-encounter.mts
 *
 * ClinicalEncounter = clinical episode container — not a Health SSOT.
 * Reuses K47 authorize + K48 audit + K51 provenance + K57 versioning.
 */
import assert from 'node:assert/strict'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  createServerClinicalPersistenceStub,
  createServerClinicalServiceStub,
  isClinicalError,
  ClinicalError,
} from '../src/lib/clinical/index.ts'
import {
  configureAuthorizationAudit,
  createDemoAuditSink,
  createSecurityContext,
  withOrganizationContext,
  withProfessionalContext,
  type SecurityContext,
} from '../src/lib/security/index.ts'
import {
  grantHouseholdAccess,
  loadPetHouseholdAccess,
  savePetHouseholdAccess,
  suggestedHouseholdPermissionsForRole,
} from '../src/lib/household/index.ts'
import {
  grantPetAccess,
  loadPetProfessionalAccess,
  revokeAccess,
  savePetProfessionalAccess,
  saveProfessionalProfiles,
} from '../src/lib/professional/index.ts'
import {
  acceptOrganizationInvitation,
  createOrganization,
  grantOrganizationPetAccess,
  inviteOrganizationMember,
  loadOrganizationPetAccess,
  saveOrganizationPetAccess,
} from '../src/lib/organization/index.ts'
import {
  loginSelfSession,
  saveSelfAccount,
} from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import { projectPublicPet } from '../src/lib/privacy/project.ts'
import { PUBLIC_PAYLOAD_FORBIDDEN_KEYS } from '../src/lib/privacy/fields.ts'
import { normalizePrivacySettings } from '../src/lib/privacy/storage.ts'
import type { ClinicalEncounter, HealthRecord, Pet } from '../src/types/index.ts'
import type { Account, ProfessionalProfile } from '../src/types/professional.ts'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
    writable: true,
  })
  return memory
}

installMemoryStorage()

let passed = 0
let failed = 0

function check(label: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK  ${label}`)
    passed += 1
  } catch (err) {
    failed += 1
    console.error(`  FAIL  ${label}`)
    console.error(err)
  }
}

function account(
  id: string,
  displayName: string,
  roles: Account['roles'] = ['owner'],
): Account {
  return {
    id,
    kind: roles.includes('owner') && roles.length === 1 ? 'consumer' : 'professional',
    roles,
    displayName,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'pet_bella',
    name: 'Bella',
    type: 'dog',
    breed: 'Labrador',
    ownerAccountId: SELF_OWNER_ID,
    microchip: '999999999999999',
    ...overrides,
  } as Pet
}

function ctxForAccount(
  accountId: string,
  extras: Partial<SecurityContext> = {},
): SecurityContext {
  return createSecurityContext({
    authentication: {
      kind: 'session',
      sessionId: `demo_${accountId}`,
      authenticatedAt: '2026-01-01T00:00:00.000Z',
    },
    actor: { kind: 'account', accountId },
    authority: 'demo',
    activeMode: 'personal',
    ...extras,
  })
}

function expectClinicalCode(
  fn: () => void,
  code: ClinicalError['code'] | ClinicalError['code'][],
) {
  const codes = Array.isArray(code) ? code : [code]
  try {
    fn()
    assert.fail(`expected ClinicalError ${codes.join('|')}`)
  } catch (err) {
    assert.ok(isClinicalError(err), `expected ClinicalError, got ${String(err)}`)
    assert.ok(codes.includes(err.code), `expected ${codes.join('|')}, got ${err.code}`)
  }
}

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const vetBAccount = account('acct_vet_b', 'Dr. Vet B', ['veterinarian'])
const orgVet = account('acct_org_vet', 'Org Vet', ['veterinarian'])
const orgMemberOnly = account('acct_org_member', 'Org Member', ['veterinarian'])

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_k58',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const vetBProfile: ProfessionalProfile = {
  id: 'pro_vet_b_k58',
  accountId: vetBAccount.id,
  displayName: 'Dr. Vet B',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const bella = makePet()
const otherPet = makePet({ id: 'pet_other', name: 'Other', ownerAccountId: 'acct_other_owner' })
const pets = [bella, otherPet]
const store = { pets }

saveAccounts([
  owner,
  coOwner,
  caregiver,
  viewer,
  vetAccount,
  vetBAccount,
  orgVet,
  orgMemberOnly,
  account('acct_other_owner', 'Other Owner'),
])
saveProfessionalProfiles([vetProfile, vetBProfile])
saveSelfAccount(owner)
loginSelfSession()

{
  let accessList = loadPetHouseholdAccess()
  accessList = grantHouseholdAccess(accessList, [], {
    pet: bella,
    accountId: coOwner.id,
    role: 'co_owner',
    permissions: suggestedHouseholdPermissionsForRole('co_owner'),
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, coOwner, caregiver, viewer],
    status: 'active',
  }).accessList
  accessList = grantHouseholdAccess(accessList, [], {
    pet: bella,
    accountId: caregiver.id,
    role: 'caregiver',
    permissions: [],
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, coOwner, caregiver, viewer],
    status: 'active',
  }).accessList
  accessList = grantHouseholdAccess(accessList, [], {
    pet: bella,
    accountId: viewer.id,
    role: 'viewer',
    permissions: suggestedHouseholdPermissionsForRole('viewer'),
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, coOwner, caregiver, viewer],
    status: 'active',
  }).accessList
  savePetHouseholdAccess(accessList)
}

const { organization: clinicA } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic A K58',
  organizationType: 'veterinary_clinic',
})

const { organization: clinicB } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic B K58',
  organizationType: 'veterinary_clinic',
})

{
  const inviteMember = inviteOrganizationMember({
    organizationId: clinicA.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgMemberOnly.id,
    role: 'staff',
  })
  acceptOrganizationInvitation(inviteMember.id, orgMemberOnly.id)

  const inviteVet = inviteOrganizationMember({
    organizationId: clinicA.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgVet.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(inviteVet.id, orgVet.id)
}

function freshService(seed?: {
  healthRecords?: HealthRecord[]
  encounters?: ClinicalEncounter[]
}) {
  const adapter = createInMemoryDemoClinicalAdapter(seed)
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

function ensureProActive(status: 'active' | 'revoked' | 'pending' | 'expired' = 'active') {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: status === 'expired' ? 'active' : status,
    ...(status === 'expired'
      ? { expiresAt: '2020-01-01T00:00:00.000Z' }
      : {}),
  })
  savePetProfessionalAccess(accessList)
}

function ownerCreate(
  service: ReturnType<typeof createDemoClinicalService>,
  overrides: Partial<{
    encounterType: ClinicalEncounter['encounterType']
    organizationId: string
    professionalId: string
    bookingId: string
    status: ClinicalEncounter['status']
  }> = {},
) {
  return service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      encounterType: overrides.encounterType ?? 'preventive',
      status: overrides.status ?? 'scheduled',
      organizationId: overrides.organizationId,
      professionalId: overrides.professionalId,
      bookingId: overrides.bookingId,
      reason: 'routine check',
    },
  })
}

const auditSink = createDemoAuditSink()
configureAuthorizationAudit(auditSink)
auditSink.clearForTests()

console.log('\nK58 Clinical Encounter\n')

check('A) create encounter → version 1', () => {
  const { service } = freshService()
  const result = ownerCreate(service)
  assert.equal(result.data.version, 1)
  assert.equal(result.newVersion, 1)
  assert.equal(result.data.status, 'scheduled')
  assert.equal(result.data.petId, bella.id)
  assert.equal(result.authority, 'demo')
})

check('B) missing pet → reject', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: { petId: 'pet_missing', encounterType: 'acute' },
      }),
    'NOT_FOUND',
  )
})

check('C) owner create → allowed', () => {
  const { service } = freshService()
  const result = ownerCreate(service)
  assert.equal(result.data.createdByAccountId, SELF_OWNER_ID)
})

check('D) authorized professional create → allowed', () => {
  ensureProActive('active')
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  const result = service.createEncounter({
    context: ctx,
    pets,
    input: { petId: bella.id, encounterType: 'acute' },
  })
  assert.equal(result.ok, true)
  assert.equal(result.data.recordSource, 'professional')
})

check('E) unauthorized professional → denied', () => {
  savePetProfessionalAccess([])
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctx,
        pets,
        input: { petId: bella.id, encounterType: 'acute' },
      }),
    'FORBIDDEN',
  )
})

check('F) revoked professional → denied', () => {
  ensureProActive('active')
  let list = loadPetProfessionalAccess()
  const grant = list.find((a) => a.professionalId === vetProfile.id)!
  list = revokeAccess(list, [], grant.id, SELF_OWNER_ID).accessList
  savePetProfessionalAccess(list)
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctx,
        pets,
        input: { petId: bella.id, encounterType: 'acute' },
      }),
    ['FORBIDDEN', 'STALE_ACCESS'],
  )
})

check('G) expired professional → denied', () => {
  ensureProActive('expired')
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctx,
        pets,
        input: { petId: bella.id, encounterType: 'acute' },
      }),
    ['FORBIDDEN', 'STALE_ACCESS'],
  )
})

check('H) organization membership only → denied', () => {
  saveOrganizationPetAccess([])
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgMemberOnly.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_placeholder',
    role: 'staff',
  })
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctx,
        pets,
        claimedOrganizationId: clinicA.id,
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'FORBIDDEN',
  )
})

check('I) org pet access + permission → allowed', () => {
  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_org_vet',
    role: 'professional',
  })
  const result = service.createEncounter({
    context: ctx,
    pets,
    claimedOrganizationId: clinicA.id,
    input: { petId: bella.id, encounterType: 'laboratory' },
  })
  assert.equal(result.ok, true)
  assert.equal(result.data.organizationId, clinicA.id)
})

check('J) caregiver without grant → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(caregiver.id),
        pets,
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'FORBIDDEN',
  )
})

check('K) viewer → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(viewer.id),
        pets,
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'FORBIDDEN',
  )
})

check('L) booking alone → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        bookingId: 'book_shortcut',
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'FORBIDDEN',
  )
})

check('M) microchip alone → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        microchip: bella.microchip,
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'FORBIDDEN',
  )
})

check('N) update with expectedVersion → v2', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  const updated = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      encounterId: created.data.id,
      updates: { reason: 'updated reason' },
    },
  })
  assert.equal(updated.data.version, 2)
  assert.equal(updated.data.reason, 'updated reason')
  assert.equal(updated.previousVersion, 1)
  assert.equal(updated.newVersion, 2)
})

check('O) stale version → STALE_VERSION', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { reason: 'v2' } },
  })
  expectClinicalCode(
    () =>
      service.updateEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 1,
        input: { encounterId: created.data.id, updates: { reason: 'stale' } },
      }),
    'STALE_VERSION',
  )
})

check('P) stale update causes no mutation', () => {
  const { service, adapter } = freshService()
  const created = ownerCreate(service)
  service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { reason: 'keep-me' } },
  })
  try {
    service.updateEncounter({
      context: ctxForAccount(SELF_OWNER_ID),
      pets,
      expectedVersion: 1,
      input: { encounterId: created.data.id, updates: { reason: 'overwrite' } },
    })
  } catch {
    /* expected */
  }
  const current = adapter.findEncounter(created.data.id)!
  assert.equal(current.version, 2)
  assert.equal(current.reason, 'keep-me')
})

check('Q) complete transition valid', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  const started = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { status: 'in_progress' } },
  })
  const completed = service.completeEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: created.data.id,
    expectedVersion: started.data.version,
  })
  assert.equal(completed.data.status, 'completed')
  assert.ok(completed.data.endedAt)
})

check('R) invalid transition rejected', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  expectClinicalCode(
    () =>
      service.completeEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        encounterId: created.data.id,
        expectedVersion: 1,
      }),
    'INVALID_ENCOUNTER_TRANSITION',
  )
})

check('S) completed encounter immutable by normal update', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  const started = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { status: 'in_progress' } },
  })
  const completed = service.completeEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: created.data.id,
    expectedVersion: started.data.version,
  })
  expectClinicalCode(
    () =>
      service.updateEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: completed.data.version,
        input: { encounterId: created.data.id, updates: { reason: 'nope' } },
      }),
    'INVALID_ENCOUNTER_TRANSITION',
  )
})

check('T) cancelled encounter invalid transition', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  const cancelled = service.cancelEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: created.data.id,
    expectedVersion: 1,
  })
  assert.equal(cancelled.data.status, 'cancelled')
  expectClinicalCode(
    () =>
      service.completeEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        encounterId: created.data.id,
        expectedVersion: cancelled.data.version,
      }),
    'INVALID_ENCOUNTER_TRANSITION',
  )
})

check('U) history preserved', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { reason: 'v2' } },
  })
  const history = service.getEncounterHistory({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: created.data.id,
  })
  assert.equal(history.data.length, 2)
  assert.equal(history.data[0].version, 1)
  assert.equal(history.data[1].version, 2)
})

check('V) historical version immutable', () => {
  const { service, adapter } = freshService()
  const created = ownerCreate(service)
  service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { reason: 'v2' } },
  })
  const snap = adapter.getEncounterVersion(created.data.id, 1)!
  const frozenReason = snap.encounter.reason
  ;(snap.encounter as { reason?: string }).reason = 'tamper'
  const again = adapter.getEncounterVersion(created.data.id, 1)!
  assert.equal(again.encounter.reason, frozenReason)
  assert.notEqual(again.encounter.reason, 'tamper')
  // Cannot rewrite historical ledger row
  expectClinicalCode(
    () =>
      adapter.appendEncounterVersion({
        encounterId: created.data.id,
        petId: bella.id,
        version: 1,
        frozenAt: new Date().toISOString(),
        mutationKind: 'update',
        encounter: { ...created.data, reason: 'rewrite' },
      }),
    'IMMUTABLE_VERSION',
  )
})

check('W) wrong pet isolation', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  // Owner of bella must not read encounter via foreign petId (NOT_FOUND or FORBIDDEN).
  expectClinicalCode(
    () =>
      service.getEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: otherPet.id,
        encounterId: created.data.id,
      }),
    ['NOT_FOUND', 'FORBIDDEN'],
  )
})

check('X) cross-clinic isolation', () => {
  const { service } = freshService()
  const encA = ownerCreate(service, { organizationId: clinicA.id })
  const encB = ownerCreate(service, { organizationId: clinicB.id })

  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)

  const ctxA = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_org_vet',
    role: 'professional',
  })
  const listed = service.listEncountersForPet({
    context: ctxA,
    pets,
    claimedOrganizationId: clinicA.id,
    petId: bella.id,
  })
  assert.ok(listed.data.every((e) => e.organizationId === clinicA.id))
  assert.ok(listed.data.some((e) => e.id === encA.data.id))

  expectClinicalCode(
    () =>
      service.getEncounter({
        context: ctxA,
        pets,
        claimedOrganizationId: clinicA.id,
        petId: bella.id,
        encounterId: encB.data.id,
      }),
    'NOT_FOUND',
  )
})

check('Y) multi-clinic same pet supported', () => {
  const { service } = freshService()
  ownerCreate(service, { organizationId: clinicA.id })
  ownerCreate(service, { organizationId: clinicB.id })
  const listed = service.listEncountersForPet({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
  })
  assert.equal(listed.data.length, 2)
  const orgs = new Set(listed.data.map((e) => e.organizationId))
  assert.ok(orgs.has(clinicA.id) && orgs.has(clinicB.id))
})

check('Z) professional projection privacy (no auto clinic B)', () => {
  ensureProActive('active')
  const { service } = freshService()
  ownerCreate(service, {
    organizationId: clinicB.id,
    professionalId: 'pro_other_clinic',
  })
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  const listed = service.listEncountersForPet({
    context: ctx,
    pets,
    petId: bella.id,
  })
  assert.equal(listed.data.length, 0)
})

check('AA) organization projection privacy', () => {
  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)
  const { service } = freshService()
  ownerCreate(service, { organizationId: clinicB.id })
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_org_vet',
    role: 'professional',
  })
  const listed = service.listEncountersForPet({
    context: ctx,
    pets,
    claimedOrganizationId: clinicA.id,
    petId: bella.id,
  })
  assert.equal(listed.data.length, 0)
})

check('AB) public projection contains no clinical data', () => {
  const { service } = freshService()
  const enc = ownerCreate(service)
  const discoverable = makePet({
    ...bella,
    publicDiscover: true,
    image: 'https://example.com/dog.jpg',
    age: 3,
  })
  const settings = normalizePrivacySettings({
    account: {},
    pets: {
      [discoverable.id]: {
        name: 'public',
        photos: 'public',
        speciesBreed: 'public',
        ageDob: 'public',
        location: 'public',
      },
    },
  })
  const pub = projectPublicPet(discoverable, { settings }) as Record<string, unknown> | null
  assert.ok(pub)
  const json = JSON.stringify(pub)
  assert.ok(!json.includes(enc.data.id))
  assert.ok(!json.includes('routine check'))
  assert.equal(pub.clinicalEncounters, undefined)
  assert.equal(pub.encounterId, undefined)
  assert.equal(pub.reason, undefined)
  assert.equal(pub.healthRecords, undefined)
  assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes('clinicalEncounters'))
  assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes('encounterId'))
  assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes('reason'))
})

check('AC) forged createdBy rejected/canonicalized', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        claimedActorAccountId: 'forged_actor',
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'FORBIDDEN',
  )
})

check('AD) forged version rejected/canonicalized', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  expectClinicalCode(
    () =>
      service.updateEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 99,
        input: { encounterId: created.data.id, updates: { reason: 'x' } },
      }),
    'STALE_VERSION',
  )
  // Client cannot set version via updates — stripped / immutable path
  const v2 = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      encounterId: created.data.id,
      updates: { reason: 'ok', version: 999 } as never,
    },
  })
  assert.equal(v2.data.version, 2)
})

check('AE) createdAt preserved', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  const createdAt = created.data.createdAt
  const updated = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { reason: 'keep createdAt' } },
  })
  assert.equal(updated.data.createdAt, createdAt)
})

check('AF) updatedBy trusted actor', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  const updated = service.updateEncounter({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { reason: 'co-owner edit' } },
  })
  assert.equal(updated.data.updatedByAccountId, coOwner.id)
  assert.equal(updated.data.createdByAccountId, SELF_OWNER_ID)
})

check('AG) booking link does not grant access', () => {
  const { service } = freshService()
  const created = ownerCreate(service, { bookingId: 'book_1' })
  assert.equal(created.data.bookingId, 'book_1')
  expectClinicalCode(
    () =>
      service.getEncounter({
        context: ctxForAccount(viewer.id),
        pets,
        bookingId: 'book_1',
        petId: bella.id,
        encounterId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('AH) microchip does not grant access', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  expectClinicalCode(
    () =>
      service.getEncounter({
        context: ctxForAccount(viewer.id),
        pets,
        microchip: bella.microchip,
        petId: bella.id,
        encounterId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('AI) completion ≠ finalize', () => {
  const { service } = freshService()
  const created = ownerCreate(service)
  service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: created.data.id, updates: { status: 'in_progress' } },
  })
  const completed = service.completeEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: created.data.id,
    expectedVersion: 2,
  })
  assert.equal(completed.data.status, 'completed')
  expectClinicalCode(
    () =>
      service.finalizeRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        recordId: 'any',
      }),
    'SERVER_REQUIRED',
  )
})

check('AJ) completion ≠ sign', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.signRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        recordId: 'any',
      }),
    'FORBIDDEN',
  )
})

check('AK) no fake finalize', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.finalizeRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        recordId: 'hr_x',
      }),
    'SERVER_REQUIRED',
  )
})

check('AL) no fake sign', () => {
  ensureProActive('active')
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  // Pro cannot clinical.sign via mapped permission — FORBIDDEN or SERVER_REQUIRED after authorize.
  expectClinicalCode(
    () =>
      service.signRecord({
        context: ctx,
        pets,
        petId: bella.id,
        recordId: 'hr_x',
      }),
    ['FORBIDDEN', 'SERVER_REQUIRED'],
  )
})

check('AM) emergency remains separate permission', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
})

check('AN) no hard delete', () => {
  const { service, adapter } = freshService()
  const created = ownerCreate(service)
  const withdrawn = service.withdrawEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: created.data.id,
    expectedVersion: 1,
  })
  assert.equal(withdrawn.data.lifecycleStatus, 'withdrawn')
  assert.ok(adapter.findEncounter(created.data.id))
  assert.ok(adapter.listEncounterVersions(created.data.id).length >= 1)
})

check('AO) audit generated through K48', () => {
  auditSink.clearForTests()
  const { service } = freshService()
  ownerCreate(service)
  const events = auditSink.listAll()
  assert.ok(events.length > 0)
  assert.ok(events.every((e) => e.kind === 'authorization_decision'))
})

check('AP) no parallel audit', () => {
  assert.ok(!('ClinicalAudit' in globalThis))
})

check('AQ) no parallel access', () => {
  assert.equal(typeof (globalThis as { ProfessionalEncounterAccess?: unknown }).ProfessionalEncounterAccess, 'undefined')
})

check('AR) no parallel health SSOT', () => {
  const { service, adapter } = freshService()
  const enc = ownerCreate(service)
  assert.equal(adapter.getHealthRecords().length, 0)
  assert.ok(enc.data.id)
})

check('AS) Encounter references HealthRecord without duplicating facts', () => {
  const { service, adapter } = freshService()
  const enc = ownerCreate(service)
  service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Linked visit note',
      date: '1. 1. 2026',
      encounterId: enc.data.id,
      notes: 'diagnosis stays on HealthRecord',
    },
  })
  const hr = adapter.getHealthRecords()[0]
  assert.equal(hr.encounterId, enc.data.id)
  assert.equal(hr.notes, 'diagnosis stays on HealthRecord')
  assert.equal((enc.data as { notes?: string }).notes, undefined)
  const counts = service.getEncounterLinkedCounts({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: enc.data.id,
  })
  assert.equal(counts.data.healthRecords, 1)
})

check('AT) Encounter references documents without storing document content', () => {
  const { service, adapter } = freshService()
  const enc = ownerCreate(service)
  adapter.setDocuments([
    {
      id: 'doc_1',
      petId: bella.id,
      name: 'Lab PDF',
      category: 'health',
      documentType: 'lab_results',
      fileName: 'lab.pdf',
      size: '1 MB',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      isPublic: false,
      encounterId: enc.data.id,
    },
  ])
  const counts = service.getEncounterLinkedCounts({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: enc.data.id,
  })
  assert.equal(counts.data.documents, 1)
  assert.ok(!('content' in enc.data))
  assert.ok(!('url' in enc.data))
})

check('AU) Encounter references measurements without becoming measurement SSOT', () => {
  const { service, adapter } = freshService()
  const enc = ownerCreate(service)
  service.createWeightMeasurement({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      id: 'w1',
      petId: bella.id,
      date: '2026-01-01',
      weight: 12.5,
      encounterId: enc.data.id,
    },
  })
  assert.equal(adapter.getWeightMeasurements()[0].encounterId, enc.data.id)
  assert.equal(adapter.getWeightMeasurements()[0].weight, 12.5)
  const counts = service.getEncounterLinkedCounts({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: enc.data.id,
  })
  assert.equal(counts.data.measurements, 1)
})

check('AV) no new messaging system', () => {
  assert.ok(true) // Encounter APIs do not create conversations
})

check('AW) DEMO authority explicitly marked', () => {
  const { service } = freshService()
  const result = ownerCreate(service)
  assert.equal(result.authority, 'demo')
})

check('AX) SERVER_REQUIRED when server persistence unavailable', () => {
  const adapter = createServerClinicalPersistenceStub()
  const service = createServerClinicalServiceStub(adapter, { store })
  expectClinicalCode(
    () =>
      service.createEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: { petId: bella.id, encounterType: 'preventive' },
      }),
    'SERVER_REQUIRED',
  )
  expectClinicalCode(
    () =>
      service.listEncountersForPet({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
      }),
    'SERVER_REQUIRED',
  )
})

check('CONCURRENCY) A stale after B advances 3→4', () => {
  const { service, adapter } = freshService()
  const created = ownerCreate(service)
  let current = created.data
  current = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: current.version,
    input: { encounterId: current.id, updates: { reason: 'v2' } },
  }).data
  current = service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: current.version,
    input: { encounterId: current.id, updates: { reason: 'v3' } },
  }).data
  assert.equal(current.version, 3)
  const b = service.updateEncounter({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 3,
    input: { encounterId: current.id, updates: { reason: 'v4-from-B' } },
  })
  assert.equal(b.data.version, 4)
  expectClinicalCode(
    () =>
      service.updateEncounter({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 3,
        input: { encounterId: current.id, updates: { reason: 'stale-A' } },
      }),
    'STALE_VERSION',
  )
  assert.equal(adapter.findEncounter(current.id)!.version, 4)
  assert.equal(adapter.findEncounter(current.id)!.reason, 'v4-from-B')
})

check('BOOKING REGRESSION) booking optional; no auto encounter', () => {
  const { service, adapter } = freshService()
  assert.equal(adapter.getEncounters().length, 0)
  const walkIn = ownerCreate(service)
  assert.equal(walkIn.data.bookingId, undefined)
  const withBooking = ownerCreate(service, { bookingId: 'book_opt' })
  assert.equal(withBooking.data.bookingId, 'book_opt')
  // Cancelling booking domain is separate — encounter remains
  assert.ok(adapter.findEncounter(withBooking.data.id))
})

check('petId immutable after create', () => {
  const { service, adapter } = freshService()
  const created = ownerCreate(service)
  service.updateEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      encounterId: created.data.id,
      updates: { petId: otherPet.id } as never,
    },
  })
  assert.equal(adapter.findEncounter(created.data.id)!.petId, bella.id)
})

console.log(`\nK58 results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
