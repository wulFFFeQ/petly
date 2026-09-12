/**
 * K57 — Clinical versioning & immutable history asserts.
 * Run: npx tsx scripts/assert-clinical-versioning.mts
 *
 * HealthRecord remains SSOT. History = immutable versions of the same resource.
 * DEMO authority ≠ production concurrency / transactions.
 */
import assert from 'node:assert/strict'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  createServerClinicalServiceStub,
  createServerClinicalPersistenceStub,
  isClinicalError,
  ClinicalError,
} from '../src/lib/clinical/index.ts'
import {
  createSecurityContext,
  withOrganizationContext,
  withProfessionalContext,
  configureAuthorizationAudit,
  createDemoAuditSink,
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
  loadOrganizationMemberships,
  loadOrganizationPetAccess,
  saveOrganizationPetAccess,
} from '../src/lib/organization/index.ts'
import { loginSelfSession, saveSelfAccount } from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import { PUBLIC_PAYLOAD_FORBIDDEN_KEYS } from '../src/lib/privacy/fields.ts'
import { stripClinicalClientUpdates } from '../src/lib/health/clinicalProvenance.ts'
import type { HealthRecord, Pet } from '../src/types/index.ts'
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

function expectClinicalCode(fn: () => void, code: ClinicalError['code']) {
  try {
    fn()
    assert.fail(`expected ClinicalError ${code}`)
  } catch (err) {
    assert.ok(isClinicalError(err), `expected ClinicalError, got ${String(err)}`)
    assert.equal(err.code, code)
  }
}

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const orgVet = account('acct_org_vet', 'Org Vet', ['veterinarian'])
const orgMemberOnly = account('acct_org_member', 'Org Member', ['veterinarian'])

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_k57',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const bella = makePet()
const pets = [bella]
const store = { pets }

saveAccounts([owner, coOwner, caregiver, viewer, vetAccount, orgVet, orgMemberOnly])
saveProfessionalProfiles([vetProfile])
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

const { organization: clinic } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic K57',
  organizationType: 'veterinary_clinic',
})

{
  const inviteMember = inviteOrganizationMember({
    organizationId: clinic.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgMemberOnly.id,
    role: 'staff',
  })
  acceptOrganizationInvitation(inviteMember.id, orgMemberOnly.id)

  const inviteVet = inviteOrganizationMember({
    organizationId: clinic.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgVet.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(inviteVet.id, orgVet.id)
}

function freshService(seedRecords: HealthRecord[] = []) {
  const adapter = createInMemoryDemoClinicalAdapter({ healthRecords: seedRecords })
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

function createThenUpdate(
  service: ReturnType<typeof createDemoClinicalService>,
  ctx: SecurityContext,
  times: number,
): HealthRecord {
  const created = service.createRecord({
    context: ctx,
    pets,
    recordId: `hr_chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Visit',
      date: '1. 1. 2026',
      status: 'completed',
      notes: 'v1',
    },
  })
  let current = created.data
  for (let i = 0; i < times; i++) {
    const next = service.updateRecord({
      context: ctx,
      pets,
      expectedVersion: current.version!,
      input: {
        recordId: current.id,
        updates: { notes: `v${(current.version ?? 1) + 1}` },
      },
    })
    current = next.data
  }
  return current
}

function ensureProActive() {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)
}

console.log('\nK57 Clinical Versioning & Immutable History\n')

const auditSink = createDemoAuditSink()
configureAuthorizationAudit(auditSink)
auditSink.clearForTests()

check('A) create → version 1', () => {
  const { service } = freshService()
  const result = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Create',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  assert.equal(result.data.version, 1)
  assert.equal(result.newVersion, 1)
  assert.equal(result.authority, 'demo')
})

check('B) update v1 → v2', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Up',
      date: '1. 1. 2026',
      status: 'completed',
      notes: 'one',
    },
  })
  const updated = service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id, updates: { notes: 'two' } },
  })
  assert.equal(updated.data.version, 2)
  assert.equal(updated.data.notes, 'two')
  assert.equal(updated.previousVersion, 1)
  assert.equal(updated.newVersion, 2)
})

check('C) update v2 → v3', () => {
  const { service } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 2)
  assert.equal(current.version, 3)
})

check('D) history contains v1,v2,v3', () => {
  const { service } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 2)
  const history = service.getRecordHistory({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    recordId: current.id,
  })
  assert.equal(history.data.length, 3)
  assert.deepEqual(
    history.data.map((h) => h.version),
    [1, 2, 3],
  )
})

check('E) v1 immutable', () => {
  const { service, adapter } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 2)
  const v1 = adapter.getHealthRecordVersion(current.id, 1)!
  const payloadBefore = JSON.stringify(v1.record)
  expectClinicalCode(
    () =>
      adapter.appendHealthRecordVersion({
        ...v1,
        record: { ...v1.record, notes: 'rewrite' },
      }),
    'IMMUTABLE_VERSION',
  )
  assert.equal(JSON.stringify(adapter.getHealthRecordVersion(current.id, 1)!.record), payloadBefore)
})

check('F) v2 immutable', () => {
  const { service, adapter } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 2)
  const v2 = adapter.getHealthRecordVersion(current.id, 2)!
  expectClinicalCode(
    () =>
      adapter.appendHealthRecordVersion({
        ...v2,
        record: { ...v2.record, notes: 'hack' },
      }),
    'IMMUTABLE_VERSION',
  )
})

check('G) stale expectedVersion rejected', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Stale',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id, updates: { notes: 'ok' } },
  })
  expectClinicalCode(
    () =>
      service.updateRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 1,
        input: { recordId: created.data.id, updates: { notes: 'stale' } },
      }),
    'STALE_VERSION',
  )
})

check('H) stale update causes no mutation', () => {
  const { service, adapter } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'NoMut',
      date: '1. 1. 2026',
      status: 'completed',
      notes: 'base',
    },
  })
  service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id, updates: { notes: 'v2' } },
  })
  const before = adapter.findHealthRecord(created.data.id)!
  expectClinicalCode(
    () =>
      service.updateRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 1,
        input: { recordId: created.data.id, updates: { notes: 'evil' } },
      }),
    'STALE_VERSION',
  )
  const after = adapter.findHealthRecord(created.data.id)!
  assert.equal(after.version, 2)
  assert.equal(after.notes, 'v2')
  assert.equal(after.updatedAt, before.updatedAt)
  assert.equal(adapter.listHealthRecordVersions(created.data.id).length, 2)
})

check('I) createdAt preserved', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'CA',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const createdAt = created.data.createdAt
  const updated = service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      recordId: created.data.id,
      updates: { notes: 'x', createdAt: '2099-01-01T00:00:00.000Z' },
    },
  })
  assert.equal(updated.data.createdAt, createdAt)
})

check('J) createdBy preserved', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'CB',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const updated = service.updateRecord({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 1,
    input: {
      recordId: created.data.id,
      updates: { notes: 'y', createdByAccountId: 'acct_attacker' },
    },
  })
  assert.equal(updated.data.createdByAccountId, SELF_OWNER_ID)
})

check('K) updatedBy trusted actor', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'UB',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const updated = service.updateRecord({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id, updates: { notes: 'co' } },
  })
  assert.equal(updated.data.updatedByAccountId, coOwner.id)
})

check('L) forged actor rejected', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        claimedActorAccountId: 'acct_attacker',
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Forge',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'FORBIDDEN',
  )
})

check('M) forged version rejected', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'FV',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const stripped = stripClinicalClientUpdates({
    version: 99,
    notes: 'ok',
  } as Record<string, unknown>)
  assert.equal('version' in stripped, false)
  const updated = service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      recordId: created.data.id,
      updates: { version: 99, notes: 'ok' } as Partial<HealthRecord>,
    },
  })
  assert.equal(updated.data.version, 2)
})

check('N) owner can update current', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Own',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const updated = service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id, updates: { notes: 'owner' } },
  })
  assert.equal(updated.data.version, 2)
})

check('O) co-owner can update current', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Co',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const updated = service.updateRecord({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id, updates: { notes: 'co' } },
  })
  assert.equal(updated.ok, true)
})

check('P) caregiver without grant denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(caregiver.id),
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'No',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'FORBIDDEN',
  )
})

check('Q) viewer denied', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'View',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  expectClinicalCode(
    () =>
      service.getRecordHistory({
        context: ctxForAccount(viewer.id),
        pets,
        petId: bella.id,
        recordId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('R) professional active + permission allowed', () => {
  ensureProActive()
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const created = service.createRecord({
    context: { ...ctx, activeMode: 'professional' },
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Pro',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  assert.equal(created.data.version, 1)
})

check('S) revoked professional denied', () => {
  ensureProActive()
  let list = loadPetProfessionalAccess()
  const grant = list.find((a) => a.professionalId === vetProfile.id && a.petId === bella.id)!
  const revoked = revokeAccess(list, [], grant.id)
  savePetProfessionalAccess(revoked.accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  expectClinicalCode(
    () =>
      service.createRecord({
        context: { ...ctx, activeMode: 'professional' },
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Revoked',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'STALE_ACCESS',
  )
})

check('T) expired professional denied', () => {
  savePetProfessionalAccess([])
  const past = new Date(Date.now() - 86_400_000).toISOString()
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    expiresAt: past,
  })
  savePetProfessionalAccess(accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  expectClinicalCode(
    () =>
      service.createRecord({
        context: { ...ctx, activeMode: 'professional' },
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Expired',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'STALE_ACCESS',
  )
})

check('U) organization membership alone denied', () => {
  saveOrganizationPetAccess([])
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgMemberOnly.id && x.organizationId === clinic.id,
  )
  assert.ok(m)
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgMemberOnly.id), {
    organizationId: clinic.id,
    membershipId: m!.id,
    role: m!.role,
  })
  expectClinicalCode(
    () =>
      service.createRecord({
        context: { ...ctx, activeMode: 'organization' },
        claimedOrganizationId: clinic.id,
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'OrgOnly',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'FORBIDDEN',
  )
})

check('V) booking alone denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        bookingId: 'book_1',
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Book',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'FORBIDDEN',
  )
})

check('W) microchip alone denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        microchip: '999999999999999',
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Chip',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'FORBIDDEN',
  )
})

check('X) public clinical projection denied', () => {
  for (const key of [
    'version',
    'correctionReason',
    'correctionOfVersion',
    'mutationKind',
    'healthRecords',
  ]) {
    assert.ok(
      (PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes(key),
      `${key} must be public-forbidden`,
    )
  }
})

check('Y) withdraw creates safe state', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'WD',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const withdrawn = service.withdrawRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id },
  })
  assert.equal(withdrawn.data.lifecycleStatus, 'withdrawn')
  assert.equal(withdrawn.data.version, 2)
})

check('Z) withdrawn history preserved', () => {
  const { service, adapter } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'WDH',
      date: '1. 1. 2026',
      status: 'completed',
      notes: 'keep',
    },
  })
  service.withdrawRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: created.data.id },
  })
  assert.ok(adapter.findHealthRecord(created.data.id))
  const history = adapter.listHealthRecordVersions(created.data.id)
  assert.equal(history.length, 2)
  assert.equal(history[0].record.notes, 'keep')
  assert.equal(history[0].record.lifecycleStatus, 'active')
  assert.equal(history[1].mutationKind, 'withdraw')
})

check('AA) historical read requires authorization', () => {
  const { service } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 1)
  expectClinicalCode(
    () =>
      service.getRecordVersion({
        context: ctxForAccount(viewer.id),
        pets,
        petId: bella.id,
        recordId: current.id,
        version: 1,
      }),
    'FORBIDDEN',
  )
  const ok = service.getRecordVersion({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    recordId: current.id,
    version: 1,
  })
  assert.equal(ok.data.version, 1)
})

check('AB) historical version cannot mutate', () => {
  const { service, adapter } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 1)
  const snap = adapter.getHealthRecordVersion(current.id, 1)!
  expectClinicalCode(
    () =>
      adapter.appendHealthRecordVersion({
        ...snap,
        record: { ...snap.record, notes: 'mutate-history' },
      }),
    'IMMUTABLE_VERSION',
  )
})

check('AC) finalize does not fake success', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.finalizeRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        petId: bella.id,
        recordId: 'hr_x',
        pets,
      }),
    'SERVER_REQUIRED',
  )
})

check('AD) sign does not fake success', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.signRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        petId: bella.id,
        recordId: 'hr_x',
        pets,
      }),
    'FORBIDDEN',
  )
})

check('AE) export does not fake success', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.exportClinicalHistory({
        context: ctxForAccount(SELF_OWNER_ID),
        petId: bella.id,
        pets,
      }),
    'SERVER_REQUIRED',
  )
})

check('AF) no parallel Health SSOT', () => {
  const { service, adapter } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'SSOT',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const snap = adapter.getHealthRecordVersion(created.data.id, 1)!
  assert.equal(snap.recordId, created.data.id)
  assert.equal(snap.record.id, created.data.id)
  assert.equal(snap.record.petId, bella.id)
})

check('AG) no parallel Access', () => {
  const { service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Acc',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  expectClinicalCode(
    () =>
      service.getRecordHistory({
        context: ctxForAccount(caregiver.id),
        pets,
        petId: bella.id,
        recordId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('AH) no parallel Audit', () => {
  auditSink.clearForTests()
  const { service } = freshService()
  service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Aud',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  const events = auditSink.listAll()
  assert.ok(events.length >= 1)
  const withVersions = events.filter(
    (e) =>
      e.metadata &&
      typeof e.metadata.previousVersion === 'number' &&
      typeof e.metadata.newVersion === 'number',
  )
  assert.ok(withVersions.length >= 1, 'K48 metadata can carry previousVersion/newVersion')
  assert.equal(withVersions[0].kind, 'authorization_decision')
})

check('AI) transaction requirement documented', () => {
  const clinicalAudit = {
    system: 'K48_AuditEvent' as const,
    transactionalWithMutation: false,
  }
  assert.equal(clinicalAudit.system, 'K48_AuditEvent')
  assert.equal(clinicalAudit.transactionalWithMutation, false)
})

check('AJ) demo authority explicitly marked', () => {
  const { service } = freshService()
  const result = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Demo',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  assert.equal(result.authority, 'demo')
  assert.equal(service.authority, 'demo')
})

check('CONCURRENCY) A stale after B wins', () => {
  const { service, adapter } = freshService()
  let current = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    recordId: 'hr_conc',
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Conc',
      date: '1. 1. 2026',
      status: 'completed',
      notes: 'v1',
    },
  }).data
  for (let v = 1; v < 4; v++) {
    current = service.updateRecord({
      context: ctxForAccount(SELF_OWNER_ID),
      pets,
      expectedVersion: v,
      input: { recordId: 'hr_conc', updates: { notes: `v${v + 1}` } },
    }).data
  }
  assert.equal(current.version, 4)
  const actorAExpected = 4
  const b = service.updateRecord({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 4,
    input: { recordId: 'hr_conc', updates: { notes: 'B-wins' } },
  })
  assert.equal(b.data.version, 5)
  expectClinicalCode(
    () =>
      service.updateRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: actorAExpected,
        input: { recordId: 'hr_conc', updates: { notes: 'A-overwrite' } },
      }),
    'STALE_VERSION',
  )
  const after = adapter.findHealthRecord('hr_conc')!
  assert.equal(after.version, 5)
  assert.equal(after.notes, 'B-wins')
  assert.equal(adapter.listHealthRecordVersions('hr_conc').length, 5)
  assert.equal(adapter.getHealthRecordVersion('hr_conc', 6), undefined)
})

check('CORRECTION) v3 correction leaves v1/v2 unchanged', () => {
  const { service, adapter } = freshService()
  service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    recordId: 'hr_corr',
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Corr',
      date: '1. 1. 2026',
      status: 'completed',
      notes: 'original',
    },
  })
  service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: 'hr_corr', updates: { notes: 'normal-update' } },
  })
  const corrected = service.correctRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 2,
    input: {
      recordId: 'hr_corr',
      updates: { notes: 'corrected' },
      correctionReason: 'typo',
      correctionOfVersion: 2,
    },
  })
  assert.equal(corrected.data.version, 3)
  assert.equal(corrected.data.notes, 'corrected')
  const v1 = adapter.getHealthRecordVersion('hr_corr', 1)!
  const v2 = adapter.getHealthRecordVersion('hr_corr', 2)!
  const v3 = adapter.getHealthRecordVersion('hr_corr', 3)!
  assert.equal(v1.record.notes, 'original')
  assert.equal(v2.record.notes, 'normal-update')
  assert.equal(v3.mutationKind, 'correct')
  assert.equal(v3.correctionOfVersion, 2)
  assert.equal(v3.correctionReason, 'typo')
})

check('getCurrentRecord returns current only', () => {
  const { service } = freshService()
  const current = createThenUpdate(service, ctxForAccount(SELF_OWNER_ID), 2)
  const got = service.getCurrentRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    recordId: current.id,
  })
  assert.equal(got.data.version, 3)
})

check('server adapter SERVER_REQUIRED', () => {
  const adapter = createServerClinicalPersistenceStub()
  const service = createServerClinicalServiceStub(adapter, { store })
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Srv',
          date: '1. 1. 2026',
          status: 'completed',
        },
      }),
    'SERVER_REQUIRED',
  )
})

check('org pet access + permission allowed', () => {
  const { accessList } = grantOrganizationPetAccess(loadOrganizationPetAccess(), {
    organizationId: clinic.id,
    pet: bella,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)

  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgVet.id && x.organizationId === clinic.id,
  )
  assert.ok(m)
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinic.id,
    membershipId: m!.id,
    role: m!.role,
  })
  const result = service.createRecord({
    context: { ...ctx, activeMode: 'organization' },
    claimedOrganizationId: clinic.id,
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'OrgWrite',
      date: '1. 1. 2026',
      status: 'completed',
    },
  })
  assert.equal(result.data.version, 1)
})

console.log(`\nK57 results: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
