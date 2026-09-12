/**
 * K62 — Clinical Emergency Write hardening assert matrix.
 * Run: npx tsx scripts/assert-clinical-emergency-write.mts
 *
 * clinical.emergency.write ≠ health.write
 * Scope = Emergency Card only. Reuses HH/Pro/Org grants — no EmergencyAccess system.
 */
import assert from 'node:assert/strict'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  isClinicalError,
  ClinicalError,
} from '../src/lib/clinical/index.ts'
import {
  authorize,
  assertEmergencyWriteGrantHasExpiry,
  configureAuthorizationAudit,
  createDemoAuditSink,
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
  saveOrganizationPetAccess,
} from '../src/lib/organization/index.ts'
import {
  loginSelfSession,
  saveSelfAccount,
} from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import {
  buildClinicalEmergencyAccessGrantedNotification,
  buildClinicalEmergencyAccessRevokedNotification,
  isSafeClinicalEmergencyNotificationPayload,
} from '../src/lib/notifications/fromClinicalEmergency.ts'
import { buildEmergencyCardPublicView } from '../src/lib/emergencyCard/index.ts'
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
    emergencyCard: {
      publicSlug: 'bella-er',
      visibility: {
        showMaskedMicrochip: false,
        showHealthAllergies: false,
        showHealthChronic: false,
        showHealthMedication: false,
        showHealthRestrictions: false,
        showHealthOther: false,
        showVet: false,
        showVetPhone: false,
        showVetNavigate: false,
        showOwnerPhoneOnPrint: false,
      },
    },
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

function futureExpiry(days = 1): string {
  return new Date(Date.now() + days * 86400000).toISOString()
}

function pastExpiry(): string {
  return new Date(Date.now() - 86400000).toISOString()
}

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const vetB = account('acct_vet_b', 'Dr. Other', ['veterinarian'])
const orgVet = account('acct_org_vet', 'Org Vet', ['veterinarian'])
const orgMemberOnly = account('acct_org_member', 'Org Member', ['veterinarian'])
const stranger = account('acct_stranger', 'Stranger')

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_k62',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const vetProfileB: ProfessionalProfile = {
  id: 'pro_vet_b_k62',
  accountId: vetB.id,
  displayName: 'Dr. Other',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const bella = makePet()
const otherPet = makePet({
  id: 'pet_other',
  name: 'Other',
  ownerAccountId: 'acct_other_owner',
  emergencyCard: {
    publicSlug: 'other-er',
    visibility: bella.emergencyCard!.visibility,
  },
})
const pets = [bella, otherPet]
const store = { pets }

saveAccounts([
  owner,
  coOwner,
  caregiver,
  viewer,
  vetAccount,
  vetB,
  orgVet,
  orgMemberOnly,
  stranger,
])
saveProfessionalProfiles([vetProfile, vetProfileB])
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
    permissions: suggestedHouseholdPermissionsForRole('caregiver'),
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
  displayName: 'Clinic A K62',
  organizationType: 'veterinary_clinic',
})
const { organization: clinicB } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic B K62',
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

function freshService(seedRecords: HealthRecord[] = []) {
  const adapter = createInMemoryDemoClinicalAdapter({ healthRecords: seedRecords })
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

function patchAllergies(note = 'K62 allergy') {
  return {
    petId: bella.id,
    patch: { health: { allergies: note } },
  }
}

console.log('\nK62 Clinical Emergency Write\n')

check('vocab) clinical.emergency.write exists; no emergency.admin aliases', () => {
  assert.ok(KNOWN_SECURITY_ACTIONS.includes('clinical.emergency.write'))
  assert.ok(!KNOWN_SECURITY_ACTIONS.includes('emergency.write' as never))
  assert.ok(!KNOWN_SECURITY_ACTIONS.includes('clinical.emergency.admin' as never))
})

check('1) forged actor DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        claimedActorAccountId: stranger.id,
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('2) forged petId / wrong pet DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: { petId: otherPet.id, patch: { health: { allergies: 'x' } } },
      }),
    'FORBIDDEN',
  )
})

check('3) forged capability / self-grant flag DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(stranger.id),
        pets,
        input: { ...patchAllergies(), canEmergencyWrite: true },
      }),
    'FORBIDDEN',
  )
})

check('4) forged scope / clinical entity DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          ...patchAllergies(),
          healthRecord: { id: 'hr_x' },
        },
      }),
    'FORBIDDEN',
  )
})

check('5) forged provenance DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          ...patchAllergies(),
          claimedUpdatedByAccountId: stranger.id,
        },
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          ...patchAllergies(),
          claimedGrantedByAccountId: stranger.id,
        },
      }),
    'FORBIDDEN',
  )
})

check('6) owner Emergency Card ALLOW; not HealthRecord', () => {
  const { service, adapter } = freshService()
  const before = adapter.getHealthRecords().length
  const result = service.emergencyWrite({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: patchAllergies('Owner note'),
  })
  assert.equal(result.ok, true)
  assert.equal(result.data.health?.allergies, 'Owner note')
  assert.equal(adapter.getHealthRecords().length, before)
})

check('7) co-owner with emergency_write ALLOW', () => {
  const { service } = freshService()
  const result = service.emergencyWrite({
    context: ctxForAccount(coOwner.id),
    pets,
    input: patchAllergies('Co-owner'),
  })
  assert.equal(result.ok, true)
})

check('8) caregiver without emergency_write DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(caregiver.id),
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('9) viewer DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(viewer.id),
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('10) professional role only DENY', () => {
  savePetProfessionalAccess([])
  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctx,
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('11) PetProfessionalAccess + addHealthRecord only DENY', () => {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    expiresAt: futureExpiry(),
    status: 'active',
  })
  savePetProfessionalAccess(accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctx,
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('12) Pro + emergencyWrite without expiresAt grant-time reject', () => {
  assert.throws(() => {
    assertEmergencyWriteGrantHasExpiry(['emergencyWrite'], undefined)
  })
  assert.throws(() => {
    grantPetAccess([], [], {
      petId: bella.id,
      professionalId: vetProfile.id,
      permissions: ['emergencyWrite'],
      grantedByAccountId: SELF_OWNER_ID,
      status: 'active',
    })
  })
})

check('13) Pro + emergencyWrite + expiresAt ALLOW', () => {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['emergencyWrite'],
    grantedByAccountId: SELF_OWNER_ID,
    expiresAt: futureExpiry(),
    status: 'active',
  })
  savePetProfessionalAccess(accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  const result = service.emergencyWrite({
    context: ctx,
    pets,
    input: patchAllergies('Pro ER'),
  })
  assert.equal(result.ok, true)
})

check('14) expired capability DENY', () => {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['emergencyWrite'],
    grantedByAccountId: SELF_OWNER_ID,
    expiresAt: pastExpiry(),
    status: 'active',
  })
  savePetProfessionalAccess(accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctx,
        pets,
        input: patchAllergies(),
      }),
    'STALE_ACCESS',
  )
})

check('15) revoked capability DENY', () => {
  savePetProfessionalAccess([])
  const granted = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['emergencyWrite'],
    grantedByAccountId: SELF_OWNER_ID,
    expiresAt: futureExpiry(),
    status: 'active',
  })
  const revoked = revokeAccess(granted.accessList, granted.logs, granted.access.id)
  savePetProfessionalAccess(revoked.accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctx,
        pets,
        input: patchAllergies(),
      }),
    'STALE_ACCESS',
  )
})

check('16) wrong clinic / unrelated pro DENY', () => {
  savePetProfessionalAccess([])
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['emergencyWrite'],
    grantedByAccountId: SELF_OWNER_ID,
    expiresAt: futureExpiry(),
    status: 'active',
  })
  savePetProfessionalAccess(accessList)

  const { service } = freshService()
  const ctx = withProfessionalContext(ctxForAccount(vetB.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfileB.id,
  })
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctx,
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('17) stranger clinical.emergency.write DENY', () => {
  const decision = authorize(
    ctxForAccount(stranger.id),
    {
      action: 'clinical.emergency.write',
      resource: { type: 'pet', id: bella.id },
    },
    { store: { pets } },
  )
  assert.equal(decision.allowed, false)
})

check('18) booking / encounter / microchip shortcuts DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        bookingId: 'bk_1',
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        microchip: bella.microchip,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        encounterId: 'enc_1',
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('19) org membership only DENY', () => {
  saveOrganizationPetAccess([])
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgMemberOnly.id && x.organizationId === clinicA.id,
  )
  assert.ok(m)
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgMemberOnly.id), {
    organizationId: clinicA.id,
    membershipId: m!.id,
    role: m!.role,
  })
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: { ...ctx, activeMode: 'organization' },
        claimedOrganizationId: clinicA.id,
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('20) org + emergencyWrite + expiresAt ALLOW; wrong org DENY', () => {
  const { accessList } = grantOrganizationPetAccess([], {
    pet: bella,
    organizationId: clinicA.id,
    permissions: ['emergencyWrite'],
    grantedByAccountId: SELF_OWNER_ID,
    expiresAt: futureExpiry(),
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)

  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgVet.id && x.organizationId === clinicA.id,
  )!
  const { service } = freshService()
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicA.id,
    membershipId: m.id,
    role: m.role,
  })
  const ok = service.emergencyWrite({
    context: { ...ctx, activeMode: 'organization' },
    claimedOrganizationId: clinicA.id,
    pets,
    input: patchAllergies('Org ER'),
  })
  assert.equal(ok.ok, true)

  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: withOrganizationContext(ctxForAccount(orgVet.id), {
          organizationId: clinicB.id,
          membershipId: 'fake',
          role: 'professional',
        }),
        claimedOrganizationId: clinicB.id,
        pets,
        input: patchAllergies(),
      }),
    'FORBIDDEN',
  )
})

check('21) public finder read-only; anonymous write DENY', () => {
  const view = buildEmergencyCardPublicView(bella)
  assert.ok(view)
  const decision = authorize(
    createDemoPublicSecurityContext(),
    {
      action: 'clinical.emergency.write',
      resource: { type: 'pet', id: bella.id },
    },
    { store: { pets } },
  )
  assert.equal(decision.allowed, false)
})

check('22) arbitrary forbidden patch keys DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          petId: bella.id,
          patch: { recordId: 'hr_1' } as never,
        },
      }),
    'FORBIDDEN',
  )
})

check('23) weight / document mutation attempts DENY', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          ...patchAllergies(),
          weightMeasurement: { id: 'w1' },
        },
      }),
    'FORBIDDEN',
  )
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          ...patchAllergies(),
          document: { id: 'd1' },
        },
      }),
    'FORBIDDEN',
  )
})

check('24) notifications safe (no clinical payload)', () => {
  const granted = buildClinicalEmergencyAccessGrantedNotification({
    recipientAccountId: vetAccount.id,
    petId: bella.id,
    grantId: 'ppa_test',
    professionalId: vetProfile.id,
  })
  assert.ok(granted)
  assert.equal(granted!.type, 'clinical_emergency_access_granted')
  assert.ok(isSafeClinicalEmergencyNotificationPayload(granted))
  assert.ok(!/Penicillin|allerg/i.test(JSON.stringify(granted)))

  const revoked = buildClinicalEmergencyAccessRevokedNotification({
    recipientAccountId: vetAccount.id,
    petId: bella.id,
    grantId: 'ppa_test',
  })
  assert.ok(revoked)
  assert.ok(isSafeClinicalEmergencyNotificationPayload(revoked))
})

check('25) audit emits on allow (K48)', () => {
  const sink = createDemoAuditSink()
  sink.clearForTests()
  configureAuthorizationAudit(sink)
  const { service } = freshService()
  service.emergencyWrite({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: patchAllergies('audit'),
  })
  const events = sink.listAll()
  assert.ok(
    events.some(
      (e) => e.action === 'clinical.emergency.write' && e.result === 'allow',
    ),
  )
})

check('26) cross-pet isolation for co-owner', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.emergencyWrite({
        context: ctxForAccount(coOwner.id),
        pets,
        input: { petId: otherPet.id, patch: { health: { allergies: 'x' } } },
      }),
    'FORBIDDEN',
  )
})

console.log(`\nK62 emergency write: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
