/**
 * K56 — ClinicalService authority boundary asserts.
 * Run: npx tsx scripts/assert-clinical-service.mts
 *
 * Reuses K47 authorize() + HH/Pro/Org grants. No parallel ACL.
 * DEMO localStorage ≠ production authority.
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
  authorize,
  createDemoPublicSecurityContext,
  createSecurityContext,
  withOrganizationContext,
  withProfessionalContext,
  type SecurityContext,
  KNOWN_SECURITY_ACTIONS,
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
import {
  loginSelfSession,
  saveSelfAccount,
} from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import { projectPublicPet } from '../src/lib/privacy/project.ts'
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
  id: 'pro_vet_k56',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
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
    permissions: [], // no health — K56 E caregiver deny
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

function freshService(seedRecords: HealthRecord[] = []) {
  const adapter = createInMemoryDemoClinicalAdapter({ healthRecords: seedRecords })
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

console.log('\nK56 Clinical Service Boundary\n')

// A — owner read
check('A) owner read', () => {
  const seed: HealthRecord[] = [
    {
      id: 'hr_a',
      petId: bella.id,
      type: 'vet',
      title: 'Vet',
      subtitle: 'Check',
      date: '1. 1. 2026',
      lifecycleStatus: 'active',
    },
  ]
  const { service } = freshService(seed)
  const result = service.listRecordsForPet({
    context: ctxForAccount(SELF_OWNER_ID),
    petId: bella.id,
    pets,
  })
  assert.equal(result.ok, true)
  assert.equal(result.authority, 'demo')
  assert.equal(result.data.length, 1)
})

// B — owner write
check('B) owner write', () => {
  const { service, adapter } = freshService()
  const result = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Owner visit',
      date: '1. 2. 2026',
      status: 'completed',
    },
  })
  assert.equal(result.ok, true)
  assert.ok(result.data.createdByAccountId === SELF_OWNER_ID)
  assert.equal(adapter.getHealthRecords().length, 1)
})

// C — co-owner read
check('C) co-owner read', () => {
  const seed: HealthRecord[] = [
    {
      id: 'hr_c',
      petId: bella.id,
      type: 'vet',
      title: 'Vet',
      subtitle: 'Check',
      date: '1. 1. 2026',
      lifecycleStatus: 'active',
    },
  ]
  const { service } = freshService(seed)
  const result = service.listRecordsForPet({
    context: ctxForAccount(coOwner.id),
    petId: bella.id,
    pets,
  })
  assert.equal(result.ok, true)
  assert.equal(result.data.length, 1)
})

// D — co-owner write
check('D) co-owner write', () => {
  const { service } = freshService()
  const result = service.createRecord({
    context: ctxForAccount(coOwner.id),
    pets,
    input: {
      petId: bella.id,
      type: 'medication',
      title: 'Med',
      date: '1. 2. 2026',
      status: 'active',
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.data.createdByAccountId, coOwner.id)
})

// E — caregiver deny (no health grant)
check('E) caregiver deny', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listRecordsForPet({
        context: ctxForAccount(caregiver.id),
        petId: bella.id,
        pets,
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(caregiver.id),
        pets,
        input: {
          petId: bella.id,
          type: 'vet',
          title: 'Nope',
          date: '1. 2. 2026',
        },
      }),
    'FORBIDDEN',
  )
})

// F — viewer deny
check('F) viewer deny', () => {
  const { service } = freshService([
    {
      id: 'hr_f',
      petId: bella.id,
      type: 'vet',
      title: 'Vet',
      subtitle: 'x',
      date: '1. 1. 2026',
      lifecycleStatus: 'active',
    },
  ])
  expectClinicalCode(
    () =>
      service.readRecord({
        context: ctxForAccount(viewer.id),
        petId: bella.id,
        recordId: 'hr_f',
        pets,
      }),
    'FORBIDDEN',
  )
})

// G — professional + active access + permission allow
check('G) professional active + permission allow', () => {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const result = service.createRecord({
    context: { ...ctx, activeMode: 'professional' },
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Clinic note',
      date: '1. 3. 2026',
      status: 'completed',
    },
  })
  assert.equal(result.ok, true)
})

// H — professional revoked deny
check('H) professional revoked deny', () => {
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
          date: '1. 3. 2026',
        },
      }),
    'STALE_ACCESS',
  )
})

// I — professional expired deny
check('I) professional expired deny', () => {
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
      service.listRecordsForPet({
        context: { ...ctx, activeMode: 'professional' },
        petId: bella.id,
        pets,
      }),
    'STALE_ACCESS',
  )
})

const { organization: clinic } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic K56',
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

// J — organization membership without clinical access deny
check('J) org membership without clinical access deny', () => {
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
      service.listRecordsForPet({
        context: { ...ctx, activeMode: 'organization' },
        petId: bella.id,
        pets,
        claimedOrganizationId: clinic.id,
      }),
    'FORBIDDEN',
  )
})

// K — organization access + explicit permission allow
check('K) org access + explicit permission allow', () => {
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
  )!
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinic.id,
    membershipId: m.id,
    role: m.role,
  })
  const result = service.createRecord({
    context: { ...ctx, activeMode: 'organization' },
    pets,
    claimedOrganizationId: clinic.id,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Org clinical',
      date: '2. 3. 2026',
      status: 'completed',
    },
  })
  assert.equal(result.ok, true)
})

// L — forged actor deny
check('L) forged actor deny', () => {
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
          date: '1. 4. 2026',
        },
      }),
    'FORBIDDEN',
  )
})

// M — forged pet deny (wrong pet / no access)
check('M) forged pet deny', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          petId: otherPet.id,
          type: 'vet',
          title: 'Not mine',
          date: '1. 4. 2026',
        },
      }),
    'FORBIDDEN',
  )
})

// N — booking-only clinical access deny
check('N) booking-only clinical access deny', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listRecordsForPet({
        context: ctxForAccount(SELF_OWNER_ID),
        petId: bella.id,
        pets,
        bookingId: 'booking_fake_1',
      }),
    'FORBIDDEN',
  )
  // authorize isolation: health on booking resource
  const d = authorize(
    ctxForAccount(SELF_OWNER_ID),
    {
      action: 'health.read',
      resource: { type: 'booking', id: 'booking_x' },
    },
    { store },
  )
  assert.equal(d.allowed, false)
})

// O — microchip-only clinical access deny
check('O) microchip-only clinical access deny', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listRecordsForPet({
        context: ctxForAccount(viewer.id),
        petId: bella.id,
        pets,
        microchip: bella.microchip,
      }),
    'FORBIDDEN',
  )
})

// P — public clinical projection deny
check('P) public clinical projection deny', () => {
  const pub = createDemoPublicSecurityContext()
  const { service } = freshService([
    {
      id: 'hr_pub',
      petId: bella.id,
      type: 'medication',
      title: 'Med',
      subtitle: 'secret',
      date: '1. 1. 2026',
      lifecycleStatus: 'active',
    },
  ])
  expectClinicalCode(
    () =>
      service.listRecordsForPet({
        context: pub,
        petId: bella.id,
        pets,
      }),
    'UNAUTHENTICATED',
  )
  const projected = projectPublicPet(bella)
  const json = JSON.stringify(projected)
  assert.equal(json.includes('secret'), false)
  assert.equal(json.includes('medication'), false)
  assert.equal(json.includes(bella.microchip ?? '___'), false)
})

// Q — withdrawn record cannot hard-delete
check('Q) withdrawn record cannot hard-delete', () => {
  const seed: HealthRecord[] = [
    {
      id: 'hr_q',
      petId: bella.id,
      type: 'vet',
      title: 'Vet',
      subtitle: 'Keep',
      date: '1. 1. 2026',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByAccountId: SELF_OWNER_ID,
      lifecycleStatus: 'active',
    },
  ]
  const { service, adapter } = freshService(seed)
  const withdrawn = service.withdrawRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { recordId: 'hr_q' },
  })
  assert.equal(withdrawn.data.lifecycleStatus, 'withdrawn')
  assert.ok(adapter.findHealthRecord('hr_q'), 'row must remain')
  assert.equal(adapter.getHealthRecords().length, 1)
})

// R — createdAt preserved
check('R) createdAt preserved', () => {
  const createdAt = '2026-01-01T10:00:00.000Z'
  const seed: HealthRecord[] = [
    {
      id: 'hr_r',
      petId: bella.id,
      type: 'vet',
      title: 'Vet',
      subtitle: 'Orig',
      date: '1. 1. 2026',
      createdAt,
      createdByAccountId: SELF_OWNER_ID,
      lifecycleStatus: 'active',
    },
  ]
  const { service } = freshService(seed)
  const updated = service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      recordId: 'hr_r',
      updates: {
        subtitle: 'Changed',
        createdAt: '2099-01-01T00:00:00.000Z',
        createdByAccountId: 'acct_attacker',
      },
    },
  })
  assert.equal(updated.data.createdAt, createdAt)
  assert.equal(updated.data.createdByAccountId, SELF_OWNER_ID)
  assert.equal(updated.data.subtitle, 'Changed')
})

// S — updatedBy populated
check('S) updatedBy populated', () => {
  const seed: HealthRecord[] = [
    {
      id: 'hr_s',
      petId: bella.id,
      type: 'vet',
      title: 'Vet',
      subtitle: 'Orig',
      date: '1. 1. 2026',
      createdAt: '2026-01-01T10:00:00.000Z',
      createdByAccountId: SELF_OWNER_ID,
      lifecycleStatus: 'active',
    },
  ]
  const { service } = freshService(seed)
  const updated = service.updateRecord({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 1,
    input: { recordId: 'hr_s', updates: { subtitle: 'Co edit' } },
  })
  assert.equal(updated.data.updatedByAccountId, coOwner.id)
  assert.ok(updated.data.updatedAt)
})

// T — finalize server-required
check('T) finalize server-required', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.finalizeRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        petId: bella.id,
        recordId: 'hr_any',
        pets,
      }),
    'SERVER_REQUIRED',
  )
})

// U — sign server-required (after authorize; owner DENY on sign)
check('U) sign — owner DENY; pro path SERVER_REQUIRED after allow attempt', () => {
  const { service } = freshService()
  // Owner cannot clinical.sign
  expectClinicalCode(
    () =>
      service.signRecord({
        context: ctxForAccount(SELF_OWNER_ID),
        petId: bella.id,
        recordId: 'hr_any',
        pets,
      }),
    'FORBIDDEN',
  )

  // Server stub service — always SERVER_REQUIRED at adapter/authority layer
  const server = createServerClinicalServiceStub(createServerClinicalPersistenceStub(), {
    store,
  })
  expectClinicalCode(
    () =>
      server.signRecord({
        context: { ...ctxForAccount(SELF_OWNER_ID), authority: 'server' },
        petId: bella.id,
        recordId: 'hr_any',
        pets,
      }),
    'FORBIDDEN', // owner still denied before stub mutate
  )
})

// Also prove DEMO sign never returns fake success for anyone with write
check('U2) clinical.sign never fake-success', () => {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  // Pro has no clinical.sign mapping → FORBIDDEN (not fake signed=true)
  expectClinicalCode(
    () =>
      service.signRecord({
        context: { ...ctx, activeMode: 'professional' },
        petId: bella.id,
        recordId: 'hr_any',
        pets,
      }),
    'FORBIDDEN',
  )
})

// V — export server-required
check('V) export server-required', () => {
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

// W — emergency write ≠ permanent health.write (K62: Emergency Card ALLOW for owner)
check('W) emergency write ≠ health.write (Emergency Card scoped)', () => {
  const { service, adapter } = freshService()
  const before = adapter.getHealthRecords().length
  const result = service.emergencyWrite({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      patch: {
        health: { allergies: 'Penicillin' },
        visibility: { showHealthAllergies: true },
      },
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.authorizationAction, 'clinical.emergency.write')
  assert.equal(result.data.health?.allergies, 'Penicillin')
  // Must not create HealthRecord via emergency path
  assert.equal(adapter.getHealthRecords().length, before)

  // health.write still works separately
  const { service: s2 } = freshService()
  const ok = s2.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Normal write',
      date: '5. 5. 2026',
    },
  })
  assert.equal(ok.ok, true)
  assert.ok(!KNOWN_SECURITY_ACTIONS.includes('clinical.write' as never))
})

// W2 — emergency cannot mutate HealthRecord payload
check('W2) emergency write rejects clinical entity mutation', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          petId: bella.id,
          patch: { health: { allergies: 'x' } },
          healthRecord: { id: 'hr_forge' },
        },
      }),
    'FORBIDDEN',
  )
})

// X — no parallel access model
check('X) no parallel access model', () => {
  assert.ok(!KNOWN_SECURITY_ACTIONS.includes('clinical.write' as never))
  assert.equal(
    KNOWN_SECURITY_ACTIONS.includes('clinical.finalize'),
    true,
  )
  assert.equal(KNOWN_SECURITY_ACTIONS.includes('clinical.sign'), true)
  assert.equal(KNOWN_SECURITY_ACTIONS.includes('clinical.export'), true)
  // Server adapter is not LS wrapper
  const stub = createServerClinicalPersistenceStub()
  assert.equal(stub.authority, 'server')
  assert.equal(stub.wired, false)
  expectClinicalCode(() => stub.getHealthRecords(), 'SERVER_REQUIRED')
})

check('DEMO authority ≠ production', () => {
  const { service } = freshService()
  assert.equal(service.authority, 'demo')
})

check('LAUNCH01 – medication complete goes through ClinicalService (deny stranger)', () => {
  const { adapter, service } = freshService()
  const created = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'medication',
      title: 'Antibiotika',
      subtitle: 'Kurz',
      date: '1. 1. 2020',
      status: 'active',
      reminderDays: 3,
      reminderEnabled: true,
    },
  })
  assert.equal(created.ok, true)
  const updated = service.updateRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      recordId: created.data.id,
      updates: { status: 'completed', reminderEnabled: false },
    },
  })
  assert.equal(updated.ok, true)
  assert.equal(updated.data.status, 'completed')
  assert.equal(updated.data.reminderEnabled, false)
  assert.equal(adapter.findHealthRecord(created.data.id)?.status, 'completed')

  expectClinicalCode(
    () =>
      service.updateRecord({
        context: ctxForAccount(viewer.id),
        pets,
        expectedVersion: 2,
        input: {
          recordId: created.data.id,
          updates: { status: 'active' },
        },
      }),
    'FORBIDDEN',
  )
})

console.log(`\nK56 clinical service: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
