/**
 * K60 — Clinical Measurements / WeightMeasurement hardening assert matrix.
 * Run: npx tsx scripts/assert-clinical-measurements.mts
 *
 * WeightMeasurement = measurement SSOT. No ClinicalMeasurement. No parallel ACL/audit.
 * Reuses health.read / health.write + K47 authorize + K48 audit + K51 provenance.
 * Versioning CAS / soft withdraw = known gaps (tests 21–23 documented N/A).
 */
import assert from 'node:assert/strict'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  createServerClinicalPersistenceStub,
  createServerClinicalServiceStub,
  isClinicalError,
  toAuthorizedWeightView,
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
  projectPetForProfessional,
  revokeAccess,
  savePetProfessionalAccess,
  saveProfessionalProfiles,
  assertProfessionalViewSafe,
} from '../src/lib/professional/index.ts'
import {
  acceptOrganizationInvitation,
  createOrganization,
  grantOrganizationPetAccess,
  inviteOrganizationMember,
  projectPetForOrganization,
  saveOrganizationPetAccess,
  assertOrganizationPetViewSafe,
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
import type {
  ClinicalEncounter,
  Pet,
  WeightMeasurement,
} from '../src/types/index.ts'
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
  id: 'pro_vet_k60',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const vetBProfile: ProfessionalProfile = {
  id: 'pro_vet_b_k60',
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
  // Caregiver without health permissions (explicit empty)
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
  displayName: 'Clinic A K60',
  organizationType: 'veterinary_clinic',
})

const { organization: clinicB } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic B K60',
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
  weights?: WeightMeasurement[]
  encounters?: ClinicalEncounter[]
}) {
  const adapter = createInMemoryDemoClinicalAdapter({
    weights: seed?.weights,
    encounters: seed?.encounters,
  })
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

function ensureProActive(
  status: 'active' | 'revoked' | 'pending' | 'expired' = 'active',
  permissions: Array<'viewHealth' | 'addHealthRecord' | 'viewDocuments' | 'addNote'> = [
    'viewHealth',
    'addHealthRecord',
  ],
) {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions,
    grantedByAccountId: SELF_OWNER_ID,
    status: status === 'expired' ? 'active' : status,
    ...(status === 'expired' ? { expiresAt: '2020-01-01T00:00:00.000Z' } : {}),
  })
  savePetProfessionalAccess(accessList)
}

function ownerCreateWeight(
  service: ReturnType<typeof createDemoClinicalService>,
  overrides: Partial<{
    id: string
    weight: number
    date: string
    encounterId: string
    petId: string
  }> = {},
) {
  return service.createWeightMeasurement({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      id: overrides.id ?? `wm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      petId: overrides.petId ?? bella.id,
      date: overrides.date ?? '12. 9. 2026',
      weight: overrides.weight ?? 12.5,
      encounterId: overrides.encounterId,
    },
  })
}

function setCaregiverPermissions(
  permissions: Array<'health_read' | 'health_write' | 'documents_read' | 'documents_write'>,
) {
  let list = loadPetHouseholdAccess()
  list = list.map((a) =>
    a.accountId === caregiver.id && a.petId === bella.id
      ? { ...a, permissions: [...permissions] }
      : a,
  )
  savePetHouseholdAccess(list)
}

const auditSink = createDemoAuditSink()
configureAuthorizationAudit(auditSink)
auditSink.clearForTests()

console.log('\nK60 Clinical Measurements\n')

// --- 1–2 owner ---
check('1) owner read → ALLOW', () => {
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_owner_1' })
  const listed = service.listWeightMeasurementsForPet({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
  })
  assert.equal(listed.ok, true)
  assert.ok(listed.data.some((w) => w.id === 'wm_owner_1'))
  const got = service.getWeightMeasurement({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    measurementId: 'wm_owner_1',
  })
  assert.equal(got.data.weight, 12.5)
})

check('2) owner write → ALLOW', () => {
  const { service, adapter } = freshService()
  const created = ownerCreateWeight(service, { id: 'wm_owner_write', weight: 14.2 })
  assert.equal(created.ok, true)
  assert.equal(created.data.version, 1)
  assert.equal(created.data.createdByAccountId, SELF_OWNER_ID)
  assert.equal(created.data.recordSource, 'owner')
  assert.equal(adapter.getWeightMeasurements().length, 1)
})

// --- 3 co-owner ---
check('3) co-owner → ALLOW', () => {
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_co' })
  const listed = service.listWeightMeasurementsForPet({
    context: ctxForAccount(coOwner.id),
    pets,
    petId: bella.id,
  })
  assert.equal(listed.ok, true)
  const write = service.createWeightMeasurement({
    context: ctxForAccount(coOwner.id),
    pets,
    input: {
      id: 'wm_co_write',
      petId: bella.id,
      date: '12. 9. 2026',
      weight: 13,
    },
  })
  assert.equal(write.ok, true)
  assert.equal(write.data.recordSource, 'co_owner')
})

// --- 4–5 caregiver ---
check('4) caregiver without permission → DENY', () => {
  setCaregiverPermissions([])
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_cg_deny' })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctxForAccount(caregiver.id),
        pets,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.createWeightMeasurement({
        context: ctxForAccount(caregiver.id),
        pets,
        input: {
          id: 'wm_cg_w',
          petId: bella.id,
          date: '12. 9. 2026',
          weight: 10,
        },
      }),
    'FORBIDDEN',
  )
})

check('5) caregiver with explicit health permission → ALLOW', () => {
  setCaregiverPermissions(['health_read', 'health_write'])
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_cg_allow' })
  const listed = service.listWeightMeasurementsForPet({
    context: ctxForAccount(caregiver.id),
    pets,
    petId: bella.id,
  })
  assert.equal(listed.ok, true)
  const write = service.createWeightMeasurement({
    context: ctxForAccount(caregiver.id),
    pets,
    input: {
      id: 'wm_cg_write_ok',
      petId: bella.id,
      date: '12. 9. 2026',
      weight: 11.1,
    },
  })
  assert.equal(write.ok, true)
  assert.equal(write.data.recordSource, 'caregiver')
  setCaregiverPermissions([])
})

// --- 6 viewer ---
check('6) viewer → DENY', () => {
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_viewer' })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctxForAccount(viewer.id),
        pets,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
})

// --- 7–10 professional ---
check('7) professional without access → DENY', () => {
  savePetProfessionalAccess([])
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_pro_none' })
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctx,
        pets,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
})

check('8) professional with access but no read permission → DENY', () => {
  ensureProActive('active', ['addNote'])
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_pro_noread' })
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctx,
        pets,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
})

check('9) professional with viewHealth → ALLOW read', () => {
  ensureProActive('active', ['viewHealth'])
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_pro_read' })
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  const listed = service.listWeightMeasurementsForPet({
    context: ctx,
    pets,
    petId: bella.id,
  })
  assert.equal(listed.ok, true)
  expectClinicalCode(
    () =>
      service.createWeightMeasurement({
        context: ctx,
        pets,
        input: {
          id: 'wm_pro_nowrite',
          petId: bella.id,
          date: '12. 9. 2026',
          weight: 15,
        },
      }),
    'FORBIDDEN',
  )
})

check('10) professional with addHealthRecord → ALLOW write', () => {
  ensureProActive('active', ['viewHealth', 'addHealthRecord'])
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  const write = service.createWeightMeasurement({
    context: ctx,
    pets,
    input: {
      id: 'wm_pro_write',
      petId: bella.id,
      date: '12. 9. 2026',
      weight: 15.5,
    },
  })
  assert.equal(write.ok, true)
  assert.equal(write.data.recordSource, 'professional')
  assert.equal(write.data.createdByAccountId, vetAccount.id)
})

// --- 11–12 organization ---
check('11) organization membership only → DENY', () => {
  saveOrganizationPetAccess([])
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_org_mem' })
  const ctx = withOrganizationContext(ctxForAccount(orgMemberOnly.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_placeholder',
    role: 'staff',
  })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctx,
        pets,
        claimedOrganizationId: clinicA.id,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
})

check('12) organization access + permission → ALLOW', () => {
  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  saveOrganizationPetAccess(accessList)
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_org_ok' })
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_org_vet',
    role: 'professional',
  })
  const listed = service.listWeightMeasurementsForPet({
    context: ctx,
    pets,
    claimedOrganizationId: clinicA.id,
    petId: bella.id,
  })
  assert.equal(listed.ok, true)
  const write = service.createWeightMeasurement({
    context: ctx,
    pets,
    claimedOrganizationId: clinicA.id,
    input: {
      id: 'wm_org_write',
      petId: bella.id,
      date: '12. 9. 2026',
      weight: 16,
    },
  })
  assert.equal(write.ok, true)
})

// --- 13 wrong pet ---
check('13) wrong pet → DENY / NOT_FOUND', () => {
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_wrong_pet' })
  // Owner of bella cannot read otherPet clinical data
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: otherPet.id,
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.getWeightMeasurement({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        measurementId: 'wm_nonexistent',
      }),
    'NOT_FOUND',
  )
  // Measurement id on bella requested under other pet → NOT_FOUND (pet+id isolation)
  expectClinicalCode(
    () =>
      service.getWeightMeasurement({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: otherPet.id,
        measurementId: 'wm_wrong_pet',
      }),
    'FORBIDDEN',
  )
})

check('13b) owner get own measurement still ALLOW', () => {
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_own_get' })
  const got = service.getWeightMeasurement({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    measurementId: 'wm_own_get',
  })
  assert.equal(got.ok, true)
})

// --- 14 cross-clinic ---
check('14) cross-clinic isolation', () => {
  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  saveOrganizationPetAccess(accessList)
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_clinic_a' })

  // Clinic B member without OrgPetAccess
  const inviteB = inviteOrganizationMember({
    organizationId: clinicB.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgVet.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(inviteB.id, orgVet.id)

  const ctxB = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicB.id,
    membershipId: 'mem_clinic_b',
    role: 'professional',
  })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctxB,
        pets,
        claimedOrganizationId: clinicB.id,
        petId: bella.id,
      }),
    'FORBIDDEN',
  )
})

// --- 15 encounterId ≠ access ---
check('15) encounterId does not grant access', () => {
  const encounter: ClinicalEncounter = {
    id: 'enc_k60',
    petId: bella.id,
    encounterType: 'other',
    status: 'in_progress',
    startedAt: '2026-09-12T10:00:00.000Z',
    createdAt: '2026-09-12T10:00:00.000Z',
    createdByAccountId: SELF_OWNER_ID,
    updatedAt: '2026-09-12T10:00:00.000Z',
    updatedByAccountId: SELF_OWNER_ID,
    version: 1,
    lifecycleStatus: 'active',
  }
  const { service } = freshService({ encounters: [encounter] })
  ownerCreateWeight(service, { id: 'wm_enc', encounterId: encounter.id })
  savePetProfessionalAccess([])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctx,
        pets,
        petId: bella.id,
        encounterId: encounter.id,
      }),
    'FORBIDDEN',
  )
})

// --- 16 booking ---
check('16) bookingId does not grant access', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        bookingId: 'booking_1',
      }),
    'FORBIDDEN',
  )
})

// --- 17 microchip ---
check('17) microchip does not grant access', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        microchip: bella.microchip,
      }),
    'FORBIDDEN',
  )
})

// --- 18–19 forged identity / createdBy ---
check('18) forged actor rejected', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createWeightMeasurement({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        claimedActorAccountId: 'forged_actor',
        input: {
          id: 'wm_forged_actor',
          petId: bella.id,
          date: '12. 9. 2026',
          weight: 10,
        },
      }),
    'FORBIDDEN',
  )
})

check('19) forged createdBy rejected (trusted stamp)', () => {
  const { service } = freshService()
  const created = service.createWeightMeasurement({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      id: 'wm_forged_by',
      petId: bella.id,
      date: '12. 9. 2026',
      weight: 10.5,
      // @ts-expect-error — client must not supply provenance
      createdByAccountId: 'forged_author',
      recordSource: 'professional',
      version: 99,
    },
  })
  assert.equal(created.data.createdByAccountId, SELF_OWNER_ID)
  assert.equal(created.data.recordSource, 'owner')
  assert.equal(created.data.version, 1)
})

// --- 20 invalid numeric ---
check('20) invalid numeric measurement rejected', () => {
  const { service } = freshService()
  for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
    expectClinicalCode(
      () =>
        service.createWeightMeasurement({
          context: ctxForAccount(SELF_OWNER_ID),
          pets,
          input: {
            id: `wm_bad_${String(bad)}`,
            petId: bella.id,
            date: '12. 9. 2026',
            weight: bad,
          },
        }),
      'INVALID_RESOURCE',
    )
  }
  expectClinicalCode(
    () =>
      service.createWeightMeasurement({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          id: 'wm_bad_date',
          petId: bella.id,
          date: '   ',
          weight: 10,
        },
      }),
    'INVALID_RESOURCE',
  )
})

// --- 21–23 known gaps (document, do not invent APIs) ---
check('21) N/A — stale version (no WeightMeasurement CAS yet)', () => {
  // Documented K60 gap: create-only additive version; no update/expectedVersion.
  assert.ok(true)
})

check('22) N/A — historical version immutable (no weight history ledger yet)', () => {
  assert.ok(true)
})

check('23) N/A — withdrawn measurement ordinary read (no soft withdraw yet)', () => {
  assert.ok(true)
})

// --- 24 public ---
check('24) public projection excludes clinical measurement', () => {
  assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes('weight'))
  assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes('weightMeasurements'))
  const discoverable = makePet({
    ...bella,
    publicDiscover: true,
    image: 'https://example.com/dog.jpg',
    age: 3,
    weight: 12.5,
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
  assert.equal(pub.weightMeasurements, undefined)
  assert.equal(pub.weight, undefined)
})

// --- 25 professional projection scrubbed ---
check('25) professional projection is scrubbed', () => {
  ensureProActive('active', ['viewHealth'])
  const access = loadPetProfessionalAccess().find((a) => a.professionalId === vetProfile.id)!
  const raw: WeightMeasurement = {
    id: 'wm_scrub_pro',
    petId: bella.id,
    date: '12. 9. 2026',
    weight: 12,
    createdByAccountId: SELF_OWNER_ID,
    updatedByAccountId: SELF_OWNER_ID,
    recordSource: 'owner',
    version: 1,
  }
  const { view } = projectPetForProfessional(bella, {
    access,
    weightMeasurements: [raw],
  })
  assertProfessionalViewSafe(view)
  assert.ok(view.weightMeasurements)
  assert.equal(view.weightMeasurements![0].createdByAccountId, undefined)
  assert.equal(view.weightMeasurements![0].updatedByAccountId, undefined)
  assert.equal(view.weightMeasurements![0].weight, 12)
  const scrubbed = toAuthorizedWeightView(raw, 'professional')
  assert.equal(scrubbed.createdByAccountId, undefined)
})

// --- 26 organization projection scrubbed ---
check('26) organization projection is scrubbed', () => {
  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  saveOrganizationPetAccess(accessList)
  const access = accessList[0]
  const raw: WeightMeasurement = {
    id: 'wm_scrub_org',
    petId: bella.id,
    date: '12. 9. 2026',
    weight: 11,
    createdByAccountId: SELF_OWNER_ID,
    updatedByAccountId: SELF_OWNER_ID,
    recordSource: 'owner',
    version: 1,
  }
  const view = projectPetForOrganization(bella, {
    access,
    membership: {
      id: 'mem_org_vet',
      organizationId: clinicA.id,
      accountId: orgVet.id,
      role: 'professional',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    actorAccountId: orgVet.id,
    weightMeasurements: [raw],
  })
  assertOrganizationPetViewSafe(view)
  assert.ok(view.weightMeasurements)
  assert.equal(view.weightMeasurements![0].createdByAccountId, undefined)
  assert.equal(view.weightMeasurements![0].weight, 11)
})

check('SERVER_REQUIRED on server stub mutate', () => {
  const adapter = createServerClinicalPersistenceStub()
  const service = createServerClinicalServiceStub(adapter, { store })
  expectClinicalCode(
    () =>
      service.createWeightMeasurement({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          id: 'wm_server',
          petId: bella.id,
          date: '12. 9. 2026',
          weight: 10,
        },
      }),
    'SERVER_REQUIRED',
  )
})

check('revoked professional → DENY', () => {
  ensureProActive('active', ['viewHealth'])
  let list = loadPetProfessionalAccess()
  const grant = list.find((a) => a.professionalId === vetProfile.id)!
  list = revokeAccess(list, [], grant.id, SELF_OWNER_ID).accessList
  savePetProfessionalAccess(list)
  const { service } = freshService()
  ownerCreateWeight(service, { id: 'wm_revoked' })
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.listWeightMeasurementsForPet({
        context: ctx,
        pets,
        petId: bella.id,
      }),
    ['FORBIDDEN', 'STALE_ACCESS'],
  )
})

console.log(`\nK60 measurements: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
