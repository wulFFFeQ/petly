/**
 * K50 — Health authorization hardening asserts.
 * Run: npx tsx scripts/assert-health-authorization.mts
 *
 * Reuses K47 authorize() + existing HH/Pro/Org grants. No new ACL.
 */
import assert from 'node:assert/strict'
import {
  authorize,
  assertPetClinical,
  buildDemoClinicalAuthorizeDeps,
  createDemoSecurityContext,
  createDemoPublicSecurityContext,
  createSecurityContext,
  filterHealthRecordsForClinicalAccess,
  projectAfterAuthorize,
  projectPetAfterClinicalAuthorize,
  withOrganizationContext,
  withProfessionalContext,
  writeActionForHealthRecordType,
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
import {
  loginSelfSession,
  saveSelfAccount,
} from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import { projectPublicPet } from '../src/lib/privacy/project.ts'
import { buildEmergencyCardPublicView } from '../src/lib/emergencyCard/publicView.ts'
import { AuthorizationError } from '../src/lib/security/errors.ts'
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

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const orgVet = account('acct_org_vet', 'Org Vet', ['veterinarian'])
const orgMember = account('acct_org_member', 'Org Member', ['veterinarian'])

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_k50',
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
const store = { pets: [bella, otherPet] }
const clinicalRecords: HealthRecord[] = [
  {
    id: 'hr_1',
    petId: bella.id,
    type: 'vaccination',
    title: 'Očkování',
    subtitle: 'Rabies',
    date: '1. 1. 2026',
    status: 'completed',
  },
]

saveAccounts([owner, coOwner, caregiver, viewer, vetAccount, orgVet, orgMember])
saveProfessionalProfiles([vetProfile])
saveSelfAccount(owner)
loginSelfSession()

// Seed household grants
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
    permissions: [], // no health by default for matrix
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

console.log('\nK50 Health Authorization Hardening\n')

check('OWNER health.read = ALLOW', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const d = authorize(
    demo.context,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, true)
})

check('OWNER health.write = ALLOW', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const d = authorize(
    demo.context,
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, true)
})

check('CO-OWNER health.read/write = ALLOW', () => {
  const r = authorize(
    ctxForAccount(coOwner.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const w = authorize(
    ctxForAccount(coOwner.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(r.allowed, true)
  assert.equal(w.allowed, true)
})

check('CAREGIVER without health permission = DENY read/write', () => {
  const r = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const w = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(r.allowed, false)
  assert.equal(w.allowed, false)
})

check('CAREGIVER with health_read/write = ALLOW', () => {
  let list = loadPetHouseholdAccess()
  const grant = list.find((a) => a.accountId === caregiver.id && a.petId === bella.id)!
  list = list.map((a) =>
    a.id === grant.id
      ? { ...a, permissions: ['health_read', 'health_write'] as typeof a.permissions }
      : a,
  )
  savePetHouseholdAccess(list)
  const r = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const w = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(r.allowed, true)
  assert.equal(w.allowed, true)
  // restore empty perms for later caregiver deny scenarios
  savePetHouseholdAccess(
    list.map((a) => (a.id === grant.id ? { ...a, permissions: [] } : a)),
  )
})

check('VIEWER health read/write = DENY', () => {
  const r = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const w = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(r.allowed, false)
  assert.equal(w.allowed, false)
})

check('PROFESSIONAL without access = DENY', () => {
  savePetProfessionalAccess([])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  const d = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('PROFESSIONAL with access but without health permission = DENY', () => {
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewDocuments'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('PROFESSIONAL with explicit health read/write = ALLOW', () => {
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const r = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const w = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(r.allowed, true)
  assert.equal(w.allowed, true)
})

const { organization: clinic } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic K50',
  organizationType: 'veterinary_clinic',
})
;(globalThis as { __k50ClinicId?: string }).__k50ClinicId = clinic.id

{
  const inviteMember = inviteOrganizationMember({
    organizationId: clinic.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgMember.id,
    role: 'staff',
  })
  acceptOrganizationInvitation(inviteMember.id, orgMember.id)

  const inviteVet = inviteOrganizationMember({
    organizationId: clinic.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgVet.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(inviteVet.id, orgVet.id)
}

check('ORGANIZATION membership only = DENY', () => {
  const clinicId = clinic.id
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgMember.id && x.organizationId === clinicId,
  )
  assert.ok(m)
  const ctx = withOrganizationContext(ctxForAccount(orgMember.id), {
    organizationId: clinicId,
    membershipId: m!.id,
    role: m!.role,
  })
  const d = authorize(
    ctx,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicId,
    },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('ORGANIZATION Pet access without health permission = DENY', () => {
  const clinicId = clinic.id
  const { accessList } = grantOrganizationPetAccess(loadOrganizationPetAccess(), {
    organizationId: clinicId,
    pet: bella,
    permissions: ['viewDocuments'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgVet.id && x.organizationId === clinicId,
  )!
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicId,
    membershipId: m.id,
    role: m.role,
  })
  const d = authorize(
    ctx,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicId,
    },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('ORGANIZATION Pet access + health permission = ALLOW', () => {
  const clinicId = clinic.id
  const list = loadOrganizationPetAccess()
  const grant = list.find((a) => a.organizationId === clinicId && a.petId === bella.id)!
  saveOrganizationPetAccess(
    list.map((a) =>
      a.id === grant.id ? { ...a, permissions: ['viewHealth', 'addHealthRecord'] } : a,
    ),
  )
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgVet.id && x.organizationId === clinicId,
  )!
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicId,
    membershipId: m.id,
    role: m.role,
  })
  const d = authorize(
    ctx,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicId,
    },
    { store },
  )
  assert.equal(d.allowed, true)
})

check('PUBLIC health = DENY', () => {
  const pub = createDemoPublicSecurityContext()
  const d = authorize(
    pub,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
  const projected = projectPublicPet(bella, {
    settings: { discoverEnabled: true, showOnDiscover: true },
  })
  if (projected) {
    assert.equal('healthRecords' in projected && (projected as { healthRecords?: unknown }).healthRecords != null, false)
    assert.equal('microchip' in projected && (projected as { microchip?: unknown }).microchip != null, false)
  }
})

check('FINDER clinical health DENY; emergency-safe projection ALLOW', () => {
  const pub = createDemoPublicSecurityContext()
  const clinical = authorize(
    pub,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(clinical.allowed, false)

  const petWithEmergency = makePet({
    emergencyCard: {
      publicSlug: 'bella-emg',
      visibility: {
        showHealthAllergies: true,
        showHealthChronic: false,
        showHealthMedication: false,
        showHealthRestrictions: false,
        showHealthOther: false,
        showMicrochipMasked: false,
        showVetContact: false,
        allowFinderContact: false,
      },
      health: { allergies: 'Chicken' },
    },
  } as Partial<Pet>)
  const view = buildEmergencyCardPublicView(petWithEmergency)
  assert.ok(view)
  assert.equal(view?.health?.allergies, 'Chicken')
  assert.equal((view as { healthRecords?: unknown }).healthRecords, undefined)
  assert.equal((view as { microchip?: unknown }).microchip, undefined)
})

check('REVOKED professional access = DENY', () => {
  let list = loadPetProfessionalAccess()
  const grant = list.find((a) => a.professionalId === vetProfile.id && a.petId === bella.id)
  if (grant) {
    const { accessList } = revokeAccess(list, [], grant.id)
    savePetProfessionalAccess(accessList)
  }
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('EXPIRED household access = DENY', () => {
  let list = loadPetHouseholdAccess()
  const grant = list.find((a) => a.accountId === caregiver.id)!
  list = list.map((a) =>
    a.id === grant.id
      ? {
          ...a,
          permissions: ['health_read'] as typeof a.permissions,
          expiresAt: '2020-01-01T00:00:00.000Z',
        }
      : a,
  )
  savePetHouseholdAccess(list)
  const d = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('WRONG PET = DENY', () => {
  const d = authorize(
    ctxForAccount(coOwner.id),
    { action: 'health.read', resource: { type: 'pet', id: otherPet.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('WRONG ORGANIZATION = DENY', () => {
  const clinicId = clinic.id
  const { organization: otherClinic } = createOrganization({
    actorAccountId: SELF_OWNER_ID,
    displayName: 'Other Clinic K50',
    organizationType: 'veterinary_clinic',
  })
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === orgVet.id && x.organizationId === clinicId,
  )!
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicId,
    membershipId: m.id,
    role: m.role,
  })
  const d = authorize(
    ctx,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: otherClinic.id,
    },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('MICROCHIP must not leak through health access (HH projection)', () => {
  const decision = authorize(
    ctxForAccount(coOwner.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(decision.allowed, true)
  const view = projectAfterAuthorize(decision, bella, {
    path: 'household',
    actorAccountId: coOwner.id,
    householdAccess: loadPetHouseholdAccess().find(
      (a) => a.accountId === coOwner.id && a.petId === bella.id,
    ),
    healthRecords: clinicalRecords,
  }) as Record<string, unknown>
  assert.ok(view)
  assert.equal(view.microchip, undefined)
  assert.equal(view.ownerContacts, undefined)
  assert.equal(view.ownerPhone, undefined)
  assert.equal(view.ownerEmail, undefined)
})

check('OWNER PII / microchip.read still DENY for non-owner with health', () => {
  const micro = authorize(
    ctxForAccount(coOwner.id),
    { action: 'microchip.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const pii = authorize(
    ctxForAccount(coOwner.id),
    { action: 'ownerContacts.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(micro.allowed, false)
  assert.equal(pii.allowed, false)
})

check('clinicalGate: owner session filters health records; wrong pet DENY', () => {
  const owned = filterHealthRecordsForClinicalAccess(clinicalRecords, [bella], 'health.read', {
    pets: [bella],
  })
  assert.equal(owned.length, 1)

  // DEMO self session is always SELF_OWNER_ID — unauthorized pet must deny.
  assert.throws(
    () => assertPetClinical('health.write', otherPet.id, { pets: [bella, otherPet] }),
    (err: unknown) => err instanceof AuthorizationError,
  )
})

check('writeActionForHealthRecordType vocabulary', () => {
  assert.equal(writeActionForHealthRecordType('vaccination'), 'vaccination.write')
  assert.equal(writeActionForHealthRecordType('medication'), 'medication.write')
  assert.equal(writeActionForHealthRecordType('examination'), 'labs.write')
  assert.equal(writeActionForHealthRecordType('vet'), 'health.write')
})

check('Messages health-share: messaging isolation still DENY health on conversation', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const d = authorize(demo.context, {
    action: 'health.read',
    resource: { type: 'conversation', id: 'conv_demo' },
  })
  assert.equal(d.allowed, false)
})

check('localStorage is not production authority (demo flag)', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  assert.equal(demo.context.authority, 'demo')
})

check('UNAUTHORIZED: no mock fallback via projectPetAfterClinicalAuthorize (wrong pet)', () => {
  const projected = projectPetAfterClinicalAuthorize(otherPet, 'health.read', {
    pets: [bella, otherPet],
    healthRecords: clinicalRecords,
  })
  assert.equal(projected, null)
})

check('buildDemoClinicalAuthorizeDeps wires grant loaders', () => {
  const deps = buildDemoClinicalAuthorizeDeps({ pets: [bella] })
  assert.ok(deps.store?.pets)
  assert.ok(deps.household?.loadAccess)
  assert.ok(deps.professional?.loadAccess)
  assert.ok(deps.organizationPet?.loadAccess)
})

check('Non-owner health DENY via authorize (viewer) — clinicalGate session is owner-only in DEMO', () => {
  const d = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

console.log(`\nUNKNOWN — REQUIRES BACKEND TEST: server-authority enforcement of clinical mutations (authority='server' not implemented in DEMO).`)
console.log(`UNKNOWN — REQUIRES BACKEND TEST: Org multi-staff clinical product UI (lib-only; assert matrix covers policy).`)

console.log(`\nK50 assert-health-authorization: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed} ok, ${failed} fail)\n`)
process.exit(failed === 0 ? 0 : 1)
