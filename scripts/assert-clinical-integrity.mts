/**
 * K51 — Clinical record integrity & provenance asserts.
 * Run: npx tsx scripts/assert-clinical-integrity.mts
 *
 * Reuses K47/K48/K50 authorize() + clinicalGate. No new Health/Audit/Access system.
 */
import assert from 'node:assert/strict'
import {
  authorize,
  buildDemoClinicalAuthorizeDeps,
  configureAuthorizationAudit,
  createDemoAuditSink,
  createDemoPublicSecurityContext,
  createDemoSecurityContext,
  createSecurityContext,
  filterHealthRecordsForClinicalAccess,
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
import { loginSelfSession, saveSelfAccount } from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import { projectPublicPet } from '../src/lib/privacy/project.ts'
import {
  normalizePrivacySettings,
  PUBLIC_PAYLOAD_FORBIDDEN_KEYS,
} from '../src/lib/privacy/index.ts'
import {
  clinicalRecordSourceLabel,
  isClinicalWithdrawn,
  resolveRecordSource,
  stampClinicalUpdate,
  stampClinicalWithdraw,
  stampNewClinicalRecord,
  stripClinicalClientUpdates,
} from '../src/lib/health/clinicalProvenance.ts'
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

/** Simulate AppContext create after authorize ALLOW — stamps only. */
function createStampedRecord(
  ctx: SecurityContext,
  pet: Pet,
  type: HealthRecord['type'] = 'vet',
): HealthRecord {
  const decision = authorize(
    ctx,
    { action: writeActionForHealthRecordType(type), resource: { type: 'pet', id: pet.id } },
    buildDemoClinicalAuthorizeDeps({ pets: [pet] }),
  )
  assert.equal(decision.allowed, true, 'create requires ALLOW')
  const stamp = stampNewClinicalRecord(ctx, pet)
  return {
    id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    petId: pet.id,
    type,
    title: 'Návštěva veterináře',
    subtitle: 'Kontrola',
    date: '12. 9. 2026',
    ...stamp,
  }
}

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const orgVet = account('acct_org_vet', 'Org Vet', ['veterinarian'])

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_k51',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
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
})
const store = { pets: [bella, otherPet] }

const sink = createDemoAuditSink()
configureAuthorizationAudit(sink)

saveAccounts([owner, coOwner, caregiver, viewer, vetAccount, orgVet])
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

console.log('\nK51 Clinical Record Integrity & Provenance\n')

check('A) Owner creates health record → actor recorded', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const record = createStampedRecord(demo.context, bella)
  assert.equal(record.createdByAccountId, SELF_OWNER_ID)
  assert.equal(record.updatedByAccountId, SELF_OWNER_ID)
  assert.equal(record.recordSource, 'owner')
  assert.equal(record.lifecycleStatus, 'active')
  assert.ok(record.createdAt)
  assert.ok(record.updatedAt)
})

check('B) Co-owner creates health record → actor recorded', () => {
  const ctx = ctxForAccount(coOwner.id)
  const record = createStampedRecord(ctx, bella)
  assert.equal(record.createdByAccountId, coOwner.id)
  assert.notEqual(record.createdByAccountId, SELF_OWNER_ID)
  assert.equal(record.recordSource, 'co_owner')
})

check('C) Professional creates health record → actor recorded', () => {
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
    accountId: vetAccount.id,
  })
  const record = createStampedRecord(
    { ...ctx, activeMode: 'professional' },
    bella,
  )
  assert.equal(record.createdByAccountId, vetAccount.id)
  assert.equal(record.recordSource, 'professional')
})

check('D) Organization creates health record → actor recorded', () => {
  const { organization: clinic } = createOrganization({
    actorAccountId: SELF_OWNER_ID,
    displayName: 'Klinika K51',
    organizationType: 'veterinary_clinic',
  })
  const invite = inviteOrganizationMember({
    organizationId: clinic.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgVet.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(invite.id, orgVet.id)

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
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinic.id,
    membershipId: m.id,
    role: m.role,
  })
  const decision = authorize(
    ctx,
    {
      action: 'health.write',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinic.id,
    },
    buildDemoClinicalAuthorizeDeps({ pets: [bella] }),
  )
  assert.equal(decision.allowed, true)
  const stamp = stampNewClinicalRecord(ctx, bella)
  assert.equal(stamp.createdByAccountId, orgVet.id)
  assert.equal(stamp.recordSource, 'organization')
})

check('E) Caregiver without write permission → DENY', () => {
  const d = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('F) Professional without write permission → DENY', () => {
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('G) Organization without health permission → DENY', () => {
  const { organization: clinic } = createOrganization({
    actorAccountId: SELF_OWNER_ID,
    displayName: 'Klinika NoHealth',
    organizationType: 'veterinary_clinic',
  })
  const invite = inviteOrganizationMember({
    organizationId: clinic.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: orgVet.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(invite.id, orgVet.id)

  const { accessList } = grantOrganizationPetAccess(loadOrganizationPetAccess(), {
    organizationId: clinic.id,
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
    (x) => x.accountId === orgVet.id && x.organizationId === clinic.id,
  )!
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinic.id,
    membershipId: m.id,
    role: m.role,
  })
  const d = authorize(
    ctx,
    {
      action: 'health.write',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinic.id,
    },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('H) Viewer → DENY', () => {
  const d = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('I) Public → DENY', () => {
  const pub = createDemoPublicSecurityContext()
  const d = authorize(
    pub,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('J) Wrong Pet → DENY', () => {
  const d = authorize(
    ctxForAccount(coOwner.id),
    { action: 'health.write', resource: { type: 'pet', id: otherPet.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('K) Revoked access → DENY', () => {
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  const revoked = revokeAccess(accessList, [], accessList[0]!.id)
  savePetProfessionalAccess(revoked.accessList)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('L) Expired access → DENY', () => {
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    expiresAt: '2020-01-01T00:00:00.000Z',
  })
  savePetProfessionalAccess(accessList)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    { ...ctx, activeMode: 'professional' },
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('M) Edit → createdAt unchanged', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const record = createStampedRecord(demo.context, bella)
  const createdAt = record.createdAt!
  // ensure clock moves
  const later = stampClinicalUpdate(record, demo.context)
  assert.equal(later.createdAt, createdAt)
  assert.equal(later.createdByAccountId, record.createdByAccountId)
})

check('N) Edit → updatedAt changes', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const record = createStampedRecord(demo.context, bella)
  const originalUpdated = record.updatedAt!
  // Force older updatedAt then stamp
  const aged = { ...record, updatedAt: '2020-01-01T00:00:00.000Z' }
  const later = stampClinicalUpdate(aged, demo.context)
  assert.notEqual(later.updatedAt, '2020-01-01T00:00:00.000Z')
  assert.ok(Date.parse(later.updatedAt) > Date.parse(originalUpdated) - 60_000)
})

check('O) Wrong actor (no write) attempting edit → DENY', () => {
  const d = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

function publicPrivacy(petId: string) {
  return normalizePrivacySettings({
    account: {},
    pets: {
      [petId]: {
        name: 'public',
        photos: 'public',
        speciesBreed: 'public',
        ageDob: 'public',
        location: 'public',
      },
    },
  })
}

check('P) Microchip does not leak via stamp / public', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const stamp = stampNewClinicalRecord(demo.context, bella)
  assert.equal('microchip' in stamp, false)
  const publicPet = makePet({
    ...bella,
    publicDiscover: true,
    image: 'https://example.com/bella.jpg',
    age: 3,
  })
  const pub = projectPublicPet(publicPet, { settings: publicPrivacy(publicPet.id) })
  assert.ok(pub)
  assert.equal((pub as { microchip?: string }).microchip, undefined)
  assert.equal(JSON.stringify(pub).includes('999999999999999'), false)
})

check('Q) Owner PII does not leak', () => {
  const publicPet = makePet({
    ...bella,
    publicDiscover: true,
    image: 'https://example.com/bella.jpg',
    age: 3,
  })
  const pub = projectPublicPet(
    {
      ...publicPet,
      ownerPhone: '+420111',
      ownerEmail: 'owner@example.com',
    } as Pet,
    { settings: publicPrivacy(publicPet.id) },
  )
  assert.ok(pub)
  const raw = JSON.stringify(pub)
  assert.equal(raw.includes('+420111'), false)
  assert.equal(raw.includes('owner@example.com'), false)
})

check('R) Public projection contains no clinical provenance', () => {
  const publicPet = makePet({
    ...bella,
    publicDiscover: true,
    image: 'https://example.com/bella.jpg',
    age: 3,
  })
  const pub = projectPublicPet(publicPet, {
    settings: publicPrivacy(publicPet.id),
  }) as Record<string, unknown> | null
  assert.ok(pub)
  assert.equal(pub.healthRecords, undefined)
  for (const key of [
    'createdByAccountId',
    'updatedByAccountId',
    'recordSource',
    'lifecycleStatus',
    'withdrawnByAccountId',
  ] as const) {
    assert.equal(key in pub, false)
    assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes(key))
  }
})

check('S) Audit remains connected to authorize()', () => {
  sink.clearForTests()
  const before = sink.listAll().length
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  authorize(
    demo.context,
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  const after = sink.listAll()
  assert.ok(after.length > before)
  const last = after[after.length - 1]!
  assert.equal(last.kind, 'authorization_decision')
  assert.equal(last.action, 'health.write')
})

check('Withdraw soft-delete retains row + preserves createdAt', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const record = createStampedRecord(demo.context, bella)
  const withdrawn = { ...record, ...stampClinicalWithdraw(record, demo.context) }
  assert.equal(withdrawn.lifecycleStatus, 'withdrawn')
  assert.equal(withdrawn.createdAt, record.createdAt)
  assert.equal(withdrawn.createdByAccountId, record.createdByAccountId)
  assert.ok(isClinicalWithdrawn(withdrawn))
  const filtered = filterHealthRecordsForClinicalAccess(
    [withdrawn],
    [bella],
    'health.read',
    { pets: [bella] },
  )
  assert.equal(filtered.length, 0)
})

check('stripClinicalClientUpdates blocks provenance overwrite', () => {
  const stripped = stripClinicalClientUpdates({
    subtitle: 'OK',
    createdAt: 'hacked',
    createdByAccountId: 'attacker',
    petId: 'other',
    ownerAccountId: 'steal',
    microchip: 'leak',
  })
  assert.equal(stripped.subtitle, 'OK')
  assert.equal(stripped.createdAt, undefined)
  assert.equal(stripped.createdByAccountId, undefined)
  assert.equal(stripped.petId, undefined)
  assert.equal(stripped.ownerAccountId, undefined)
  assert.equal(stripped.microchip, undefined)
})

check('UI source labels never expose account IDs', () => {
  assert.equal(clinicalRecordSourceLabel('owner'), 'Přidáno majitelem')
  assert.equal(clinicalRecordSourceLabel('professional'), 'Přidáno veterinářem')
  assert.equal(clinicalRecordSourceLabel(undefined), null)
  const label = clinicalRecordSourceLabel('owner')!
  assert.equal(label.includes(SELF_OWNER_ID), false)
})

check('resolveRecordSource is metadata only (caregiver)', () => {
  const src = resolveRecordSource(ctxForAccount(caregiver.id), bella)
  assert.equal(src, 'caregiver')
  const d = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('UNKNOWN — direct localStorage mutation bypass (not PASS)', () => {
  // Documented gap: DEMO authority cannot prevent raw LS writes.
  // Marked UNKNOWN — REQUIRES SERVER TEST. Do not treat as PASS.
  console.log(
    '  UNKNOWN — REQUIRES SERVER TEST: raw Pet / direct HealthRecord LS mutation / ungated UI handler',
  )
})

configureAuthorizationAudit(null)

console.log(`\nK51 clinical integrity: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
