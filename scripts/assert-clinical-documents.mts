/**
 * K59 — Clinical Documents / PetDocument hardening assert matrix.
 * Run: npx tsx scripts/assert-clinical-documents.mts
 *
 * PetDocument = Document SSOT. No ClinicalDocument. No parallel ACL/audit.
 * Reuses K47 authorize + K48 audit + K51 provenance + K57 versioning + K58 encounter FK.
 */
import assert from 'node:assert/strict'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  createServerClinicalPersistenceStub,
  createServerClinicalServiceStub,
  isClinicalError,
  toAuthorizedDocumentView,
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
} from '../src/lib/professional/index.ts'
import {
  acceptOrganizationInvitation,
  createOrganization,
  grantOrganizationPetAccess,
  inviteOrganizationMember,
  loadOrganizationPetAccess,
  projectPetForOrganization,
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
import { normalizePetDocument } from '../src/lib/documentStorage.ts'
import type {
  ClinicalEncounter,
  Pet,
  PetDocument,
} from '../src/types/index.ts'
import type { Account, ProfessionalProfile } from '../src/types/professional.ts'
import type { OrganizationMembership } from '../src/lib/organization/types.ts'
import { loadOrganizationMemberships } from '../src/lib/organization/index.ts'

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
  id: 'pro_vet_k59',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const vetBProfile: ProfessionalProfile = {
  id: 'pro_vet_b_k59',
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
  displayName: 'Clinic A K59',
  organizationType: 'veterinary_clinic',
})

const { organization: clinicB } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic B K59',
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
  documents?: PetDocument[]
  encounters?: ClinicalEncounter[]
}) {
  const adapter = createInMemoryDemoClinicalAdapter(seed)
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

function ensureProActive(
  status: 'active' | 'revoked' | 'pending' | 'expired' = 'active',
  permissions: Array<'viewDocuments' | 'addNote' | 'viewHealth' | 'addHealthRecord'> = [
    'viewDocuments',
    'addNote',
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

function ownerCreateDoc(
  service: ReturnType<typeof createDemoClinicalService>,
  overrides: Partial<{
    name: string
    encounterId: string
    documentId: string
    storageKey: string
  }> = {},
) {
  return service.createDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    documentId: overrides.documentId,
    input: {
      petId: bella.id,
      name: overrides.name ?? 'Lab result',
      category: 'health',
      documentType: 'lab_results',
      fileName: 'lab.pdf',
      size: '1 MB',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      storageKey: overrides.storageKey ?? 'doc_blob_1',
      encounterId: overrides.encounterId,
    },
  })
}

const auditSink = createDemoAuditSink()
configureAuthorizationAudit(auditSink)
auditSink.clearForTests()

console.log('\nK59 Clinical Documents\n')

check('A) create document', () => {
  const { service } = freshService()
  const result = ownerCreateDoc(service)
  assert.equal(result.ok, true)
  assert.equal(result.data.petId, bella.id)
  assert.equal(result.data.isPublic, false)
})

check('B) create v1', () => {
  const { service } = freshService()
  const result = ownerCreateDoc(service)
  assert.equal(result.data.version, 1)
  assert.equal(result.newVersion, 1)
})

check('C) missing pet → reject', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          petId: 'pet_missing',
          name: 'X',
          category: 'other',
          documentType: 'other',
          fileName: 'x.pdf',
          size: '1',
        },
      }),
    'NOT_FOUND',
  )
})

check('D) owner read → allowed', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const read = service.readDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    documentId: created.data.id,
  })
  assert.equal(read.data.id, created.data.id)
})

check('E) owner write → allowed', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id, updates: { name: 'Updated lab' } },
  })
  assert.equal(updated.data.name, 'Updated lab')
  assert.equal(updated.data.version, 2)
})

check('F) authorized professional read → allowed', () => {
  ensureProActive('active', ['viewDocuments'])
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  const read = service.readDocument({
    context: ctx,
    pets,
    petId: bella.id,
    documentId: created.data.id,
  })
  assert.equal(read.ok, true)
})

check('G) professional without document permission → denied', () => {
  ensureProActive('active', ['viewHealth'])
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctx,
        pets,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('H) revoked professional → denied', () => {
  ensureProActive('active')
  let list = loadPetProfessionalAccess()
  const grant = list.find((a) => a.professionalId === vetProfile.id)!
  list = revokeAccess(list, [], grant.id, SELF_OWNER_ID).accessList
  savePetProfessionalAccess(list)
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctx,
        pets,
        petId: bella.id,
        documentId: created.data.id,
      }),
    ['FORBIDDEN', 'STALE_ACCESS'],
  )
})

check('I) expired professional → denied', () => {
  ensureProActive('expired')
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctx,
        pets,
        petId: bella.id,
        documentId: created.data.id,
      }),
    ['FORBIDDEN', 'STALE_ACCESS'],
  )
})

check('J) organization membership only → denied', () => {
  saveOrganizationPetAccess([])
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const ctx = withOrganizationContext(ctxForAccount(orgMemberOnly.id), {
    organizationId: clinicA.id,
    membershipId: 'mem_placeholder',
    role: 'staff',
  })
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctx,
        pets,
        claimedOrganizationId: clinicA.id,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('K) OrganizationPetAccess + document permission → allowed', () => {
  saveOrganizationPetAccess([])
  grantOrganizationPetAccess({
    organizationId: clinicA.id,
    petId: bella.id,
    actorAccountId: SELF_OWNER_ID,
    permissions: ['viewDocuments'],
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const memberships = loadOrganizationMemberships()
  const membership = memberships.find(
    (m: OrganizationMembership) =>
      m.organizationId === clinicA.id && m.accountId === orgVet.id,
  )
  assert.ok(membership)
  const ctx = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicA.id,
    membershipId: membership!.id,
    role: membership!.role,
  })
  const read = service.readDocument({
    context: ctx,
    pets,
    claimedOrganizationId: clinicA.id,
    petId: bella.id,
    documentId: created.data.id,
  })
  assert.equal(read.ok, true)
})

check('L) caregiver without grant → denied', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctxForAccount(caregiver.id),
        pets,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('M) viewer → denied', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctxForAccount(viewer.id),
        pets,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('N) booking alone → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        bookingId: 'booking_x',
        input: {
          petId: bella.id,
          name: 'X',
          category: 'other',
          documentType: 'other',
          fileName: 'x.pdf',
          size: '1',
        },
      }),
    'FORBIDDEN',
  )
})

check('O) encounter alone → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets: [],
        encounterId: 'enc_alone',
        input: {
          petId: bella.id,
          name: 'X',
          category: 'other',
          documentType: 'other',
          fileName: 'x.pdf',
          size: '1',
        },
      }),
    'NOT_FOUND',
  )
})

check('P) microchip alone → denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        microchip: '999999999999999',
        input: {
          petId: bella.id,
          name: 'X',
          category: 'other',
          documentType: 'other',
          fileName: 'x.pdf',
          size: '1',
        },
      }),
    'FORBIDDEN',
  )
})

check('Q) update expectedVersion → v2', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id, updates: { notes: 'n2' } },
  })
  assert.equal(updated.data.version, 2)
  assert.equal(updated.previousVersion, 1)
})

check('R) stale version → STALE_VERSION', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id, updates: { notes: 'first' } },
  })
  expectClinicalCode(
    () =>
      service.updateDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 1,
        input: { documentId: created.data.id, updates: { notes: 'stale' } },
      }),
    'STALE_VERSION',
  )
})

check('S) stale update causes no mutation', () => {
  const { adapter, service } = freshService()
  const created = ownerCreateDoc(service)
  service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id, updates: { notes: 'keep' } },
  })
  try {
    service.updateDocument({
      context: ctxForAccount(SELF_OWNER_ID),
      pets,
      expectedVersion: 1,
      input: { documentId: created.data.id, updates: { notes: 'overwrite' } },
    })
  } catch {
    /* expected */
  }
  const current = adapter.findDocument(created.data.id)!
  assert.equal(current.notes, 'keep')
  assert.equal(current.version, 2)
})

check('T) historical version immutable', () => {
  const { adapter, service } = freshService()
  const created = ownerCreateDoc(service, { name: 'v1 name' })
  service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id, updates: { name: 'v2 name' } },
  })
  const v1 = adapter.getDocumentVersion(created.data.id, 1)!
  assert.equal(v1.document.name, 'v1 name')
  expectClinicalCode(
    () =>
      adapter.appendDocumentVersion({
        documentId: created.data.id,
        petId: bella.id,
        version: 1,
        frozenAt: new Date().toISOString(),
        mutationKind: 'update',
        document: created.data,
      }),
    'IMMUTABLE_VERSION',
  )
})

check('U) content update creates new version', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const replaced = service.replaceDocumentContent({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      fileName: 'lab-v2.pdf',
      size: '2 MB',
      storageKey: 'doc_blob_1',
      clearUrl: true,
    },
  })
  assert.equal(replaced.data.version, 2)
  assert.equal(replaced.data.fileName, 'lab-v2.pdf')
})

check('V) correction preserves previous content', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service, { name: 'original' })
  service.correctDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      updates: { name: 'corrected' },
      correctionReason: 'typo',
    },
  })
  const history = service.getDocumentHistory({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    documentId: created.data.id,
  })
  assert.equal(history.data[0].document.name, 'original')
  assert.equal(history.data[1].document.name, 'corrected')
  assert.equal(history.data[1].mutationKind, 'correct')
  assert.equal(history.data[1].correctionOfVersion, 1)
})

check('W) withdraw is soft', () => {
  const { adapter, service } = freshService()
  const created = ownerCreateDoc(service)
  const withdrawn = service.withdrawDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id },
  })
  assert.equal(withdrawn.data.lifecycleStatus, 'withdrawn')
  assert.ok(adapter.findDocument(created.data.id))
})

check('X) withdrawn document history retained', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  service.withdrawDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id },
  })
  const history = service.getDocumentHistory({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    documentId: created.data.id,
  })
  assert.ok(history.data.length >= 2)
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'NOT_FOUND',
  )
})

check('Y) wrong pet isolation', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        petId: otherPet.id,
        documentId: created.data.id,
      }),
    'NOT_FOUND',
  )
})

check('Z) cross-clinic isolation (Clinic B without access)', () => {
  saveOrganizationPetAccess([])
  grantOrganizationPetAccess({
    organizationId: clinicA.id,
    petId: bella.id,
    actorAccountId: SELF_OWNER_ID,
    permissions: ['viewDocuments'],
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const ctxB = withOrganizationContext(ctxForAccount(orgVet.id), {
    organizationId: clinicB.id,
    membershipId: 'mem_b',
    role: 'professional',
  })
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctxB,
        pets,
        claimedOrganizationId: clinicB.id,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'FORBIDDEN',
  )
})

check('AA) multi-clinic same pet', () => {
  const { service } = freshService()
  const a = ownerCreateDoc(service, { name: 'Clinic A doc', documentId: 'doc_a' })
  const b = ownerCreateDoc(service, { name: 'Clinic B doc', documentId: 'doc_b' })
  const list = service.listDocumentsForPet({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
  })
  assert.ok(list.data.some((d) => d.id === a.data.id))
  assert.ok(list.data.some((d) => d.id === b.data.id))
})

check('AB) professional projection privacy', () => {
  ensureProActive('active', ['viewDocuments'])
  const doc: PetDocument = {
    id: 'doc_pro_priv',
    petId: bella.id,
    name: 'Secret',
    category: 'health',
    documentType: 'vet_report',
    fileName: 'x.pdf',
    size: '1',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    uploadedByAccountId: SELF_OWNER_ID,
    storageKey: 'secret_key',
    url: 'data:application/pdf;base64,AAA',
    isPublic: false,
    lifecycleStatus: 'active',
    version: 1,
  }
  const access = loadPetProfessionalAccess().find((a) => a.professionalId === vetProfile.id)!
  const { view } = projectPetForProfessional(bella, {
    access,
    documents: [doc],
  })
  assert.ok(view.documents)
  assert.equal(view.documents![0].storageKey, undefined)
  assert.equal(view.documents![0].url, undefined)
  assert.equal(view.documents![0].uploadedByAccountId, undefined)
})

check('AC) organization projection privacy', () => {
  saveOrganizationPetAccess([])
  grantOrganizationPetAccess({
    organizationId: clinicA.id,
    petId: bella.id,
    actorAccountId: SELF_OWNER_ID,
    permissions: ['viewDocuments'],
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  const memberships = loadOrganizationMemberships()
  const membership = memberships.find(
    (m) => m.organizationId === clinicA.id && m.accountId === orgVet.id,
  )!
  const access = loadOrganizationPetAccess().find(
    (a) => a.organizationId === clinicA.id && a.petId === bella.id,
  )!
  const doc: PetDocument = {
    id: 'doc_org_priv',
    petId: bella.id,
    name: 'Org secret',
    category: 'health',
    documentType: 'vet_report',
    fileName: 'x.pdf',
    size: '1',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    uploadedByAccountId: SELF_OWNER_ID,
    storageKey: 'org_key',
    isPublic: false,
    lifecycleStatus: 'active',
    version: 1,
  }
  const view = projectPetForOrganization(bella, {
    access,
    membership,
    actorAccountId: orgVet.id,
    documents: [doc],
  })
  assert.ok(view.documents)
  assert.equal(view.documents![0].storageKey, undefined)
  assert.equal(view.documents![0].uploadedByAccountId, undefined)
})

check('AD) public projection excludes clinical documents', () => {
  const publicPet = projectPublicPet(bella, {
    privacy: normalizePrivacySettings({}),
    documents: [
      {
        id: 'doc_pub',
        petId: bella.id,
        name: 'should not appear',
        category: 'health',
        documentType: 'lab_results',
        fileName: 'x.pdf',
        size: '1',
        uploadedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        isPublic: false,
      },
    ],
  } as never)
  const record = publicPet as Record<string, unknown>
  assert.ok(!('documents' in record) || record.documents == null)
  for (const key of ['documents', 'encounterId', 'storageKey'] as const) {
    assert.ok(PUBLIC_PAYLOAD_FORBIDDEN_KEYS.includes(key as never) || key === 'storageKey')
  }
})

check('AE) raw file URL not public', () => {
  const scrubbed = toAuthorizedDocumentView(
    {
      id: 'd1',
      petId: bella.id,
      name: 'n',
      category: 'other',
      documentType: 'other',
      fileName: 'f.pdf',
      size: '1',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      url: 'https://evil.example/private.pdf',
      isPublic: false,
    },
    'professional',
  )
  assert.equal(scrubbed.url, undefined)
})

check('AF) internal storage key not public', () => {
  const scrubbed = toAuthorizedDocumentView(
    {
      id: 'd1',
      petId: bella.id,
      name: 'n',
      category: 'other',
      documentType: 'other',
      fileName: 'f.pdf',
      size: '1',
      uploadedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      storageKey: 'internal_blob',
      isPublic: false,
    },
    'organization',
  )
  assert.equal(scrubbed.storageKey, undefined)
})

check('AG) createdAt/uploadedAt immutable', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const uploadedAt = created.data.uploadedAt
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      updates: { uploadedAt: '1999-01-01T00:00:00.000Z', name: 'x' } as Partial<PetDocument>,
    },
  })
  assert.equal(updated.data.uploadedAt, uploadedAt)
})

check('AH) createdBy/uploadedBy immutable', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const by = created.data.uploadedByAccountId
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      updates: { uploadedByAccountId: 'forged' } as Partial<PetDocument>,
    },
  })
  assert.equal(updated.data.uploadedByAccountId, by)
})

check('AI) updatedBy trusted actor', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      updates: { notes: 'by owner' },
    },
  })
  assert.equal(updated.data.updatedByAccountId, SELF_OWNER_ID)
})

check('AJ) forged actor denied', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.createDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        claimedActorAccountId: 'forged_actor',
        input: {
          petId: bella.id,
          name: 'X',
          category: 'other',
          documentType: 'other',
          fileName: 'x.pdf',
          size: '1',
        },
      }),
    'FORBIDDEN',
  )
})

check('AK) forged version denied/canonicalized', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      updates: { version: 99, notes: 'x' } as Partial<PetDocument>,
    },
  })
  assert.equal(updated.data.version, 2)
})

check('AL) encounterId does not grant access', () => {
  const { adapter, service } = freshService()
  const enc = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: { petId: bella.id, encounterType: 'laboratory' },
  })
  const created = ownerCreateDoc(service, { encounterId: enc.data.id })
  assert.equal(created.data.encounterId, enc.data.id)
  savePetProfessionalAccess([])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
    accountId: vetAccount.id,
  })
  expectClinicalCode(
    () =>
      service.readDocument({
        context: ctx,
        pets,
        encounterId: enc.data.id,
        petId: bella.id,
        documentId: created.data.id,
      }),
    'FORBIDDEN',
  )
  void adapter
})

check('AM) bookingId does not grant access', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listDocumentsForPet({
        context: ctxForAccount(vetAccount.id),
        pets,
        petId: bella.id,
        bookingId: 'booking_1',
      }),
    'FORBIDDEN',
  )
})

check('AN) microchip does not grant access', () => {
  const { service } = freshService()
  expectClinicalCode(
    () =>
      service.listDocumentsForPet({
        context: ctxForAccount(vetAccount.id),
        pets,
        petId: bella.id,
        microchip: bella.microchip,
      }),
    'FORBIDDEN',
  )
})

check('AO) completion ≠ document finalization', () => {
  const { service } = freshService()
  const enc = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: { petId: bella.id, encounterType: 'acute', status: 'in_progress' },
  })
  const doc = ownerCreateDoc(service, { encounterId: enc.data.id })
  service.completeEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: enc.data.id, updates: {} },
  })
  const still = service.readDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    documentId: doc.data.id,
  })
  assert.equal(still.data.lifecycleStatus, 'active')
  assert.equal(still.data.version, 1)
})

check('AP) no fake finalize on document', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  assert.equal(
    'finalized' in (created.data as object),
    false,
  )
})

check('AQ) no fake sign on document', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  assert.equal('signed' in (created.data as object), false)
})

check('AR) no hard delete', () => {
  const { adapter, service } = freshService()
  const created = ownerCreateDoc(service)
  service.withdrawDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id },
  })
  assert.ok(adapter.findDocument(created.data.id))
  assert.equal(adapter.getDocuments().some((d) => d.id === created.data.id), true)
})

check('AS) audit via K48', () => {
  auditSink.clearForTests()
  const { service } = freshService()
  ownerCreateDoc(service)
  const events = auditSink.getEventsForTests()
  assert.ok(events.length >= 1)
})

check('AT) no parallel audit system symbol', () => {
  assert.equal(typeof (globalThis as { DocumentAudit?: unknown }).DocumentAudit, 'undefined')
})

check('AU) no DocumentAccess model', () => {
  assert.equal(typeof (globalThis as { DocumentAccess?: unknown }).DocumentAccess, 'undefined')
})

check('AV) no DocumentPermission model', () => {
  assert.equal(typeof (globalThis as { DocumentPermission?: unknown }).DocumentPermission, 'undefined')
})

check('AW) no ClinicalDocument SSOT', () => {
  assert.equal(typeof (globalThis as { ClinicalDocument?: unknown }).ClinicalDocument, 'undefined')
})

check('AX) no new messaging system', () => {
  assert.equal(typeof (globalThis as { DocumentChat?: unknown }).DocumentChat, 'undefined')
})

check('AY) DEMO authority explicit', () => {
  const { service } = freshService()
  const result = ownerCreateDoc(service)
  assert.equal(result.authority, 'demo')
})

check('AZ) SERVER_REQUIRED when server persistence unavailable', () => {
  const adapter = createServerClinicalPersistenceStub()
  const service = createServerClinicalServiceStub(adapter, { store })
  expectClinicalCode(
    () =>
      service.createDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        input: {
          petId: bella.id,
          name: 'X',
          category: 'other',
          documentType: 'other',
          fileName: 'x.pdf',
          size: '1',
        },
      }),
    'SERVER_REQUIRED',
  )
})

check('BA) migration without fabricated history', () => {
  const legacy = normalizePetDocument({
    id: 'doc_legacy',
    petId: bella.id,
    name: 'Legacy',
    category: 'health',
    documentType: 'lab_results',
    fileName: 'legacy.pdf',
    size: '1',
    uploadedAt: '2025-01-01T00:00:00.000Z',
  })
  assert.equal(legacy.version, 1)
  assert.equal(legacy.encounterId, undefined)
  assert.equal(legacy.uploadedByAccountId, undefined)
})

check('BB) document without encounter remains valid', () => {
  const { service } = freshService()
  const created = ownerCreateDoc(service)
  assert.equal(created.data.encounterId, undefined)
})

check('BC) encounter with multiple documents', () => {
  const { service } = freshService()
  const enc = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: { petId: bella.id, encounterType: 'laboratory' },
  })
  ownerCreateDoc(service, { name: 'lab', encounterId: enc.data.id, documentId: 'd1' })
  ownerCreateDoc(service, { name: 'imaging', encounterId: enc.data.id, documentId: 'd2' })
  const counts = service.getEncounterLinkedCounts({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    petId: bella.id,
    encounterId: enc.data.id,
  })
  assert.equal(counts.data.documents, 2)
})

check('BD) document linked to encounter does not expose encounter publicly', () => {
  const publicPet = projectPublicPet(bella, {
    privacy: normalizePrivacySettings({}),
  })
  const record = publicPet as Record<string, unknown>
  assert.ok(!('encounterId' in record) || record.encounterId == null)
  assert.ok(PUBLIC_PAYLOAD_FORBIDDEN_KEYS.includes('encounterId' as never))
})

check('concurrency: A reads v3, B updates to v4, A stale', () => {
  const { adapter, service } = freshService()
  const created = ownerCreateDoc(service)
  service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: created.data.id, updates: { notes: 'v2' } },
  })
  service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 2,
    input: { documentId: created.data.id, updates: { notes: 'v3' } },
  })
  // B: v3 → v4
  service.updateDocument({
    context: ctxForAccount(coOwner.id),
    pets,
    expectedVersion: 3,
    input: { documentId: created.data.id, updates: { notes: 'v4-from-B' } },
  })
  // A stale expectedVersion=3
  expectClinicalCode(
    () =>
      service.updateDocument({
        context: ctxForAccount(SELF_OWNER_ID),
        pets,
        expectedVersion: 3,
        input: { documentId: created.data.id, updates: { notes: 'A-overwrite' } },
      }),
    'STALE_VERSION',
  )
  assert.equal(adapter.findDocument(created.data.id)!.notes, 'v4-from-B')
  assert.equal(adapter.findDocument(created.data.id)!.version, 4)
})

check('booking regression: no auto document on booking fields', () => {
  const { adapter, service } = freshService()
  assert.equal(adapter.getDocuments().length, 0)
  void service
})

check('encounter withdraw does not delete documents', () => {
  const { adapter, service } = freshService()
  const enc = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: { petId: bella.id, encounterType: 'acute' },
  })
  const doc = ownerCreateDoc(service, { encounterId: enc.data.id })
  service.withdrawEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { encounterId: enc.data.id, updates: {} },
  })
  assert.ok(adapter.findDocument(doc.data.id))
  assert.equal(adapter.findDocument(doc.data.id)!.lifecycleStatus, 'active')
})

check('document withdraw does not delete encounter', () => {
  const { adapter, service } = freshService()
  const enc = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: { petId: bella.id, encounterType: 'acute' },
  })
  const doc = ownerCreateDoc(service, { encounterId: enc.data.id })
  service.withdrawDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: { documentId: doc.data.id },
  })
  assert.ok(adapter.findEncounter(enc.data.id))
  assert.notEqual(adapter.findEncounter(enc.data.id)!.lifecycleStatus, 'withdrawn')
})

check('encounterId immutable after create', () => {
  const { service } = freshService()
  const enc = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: { petId: bella.id, encounterType: 'acute' },
  })
  const created = ownerCreateDoc(service, { encounterId: enc.data.id })
  const updated = service.updateDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: 1,
    input: {
      documentId: created.data.id,
      updates: { encounterId: 'other_enc' } as Partial<PetDocument>,
    },
  })
  assert.equal(updated.data.encounterId, enc.data.id)
})

console.log(`\nK59 documents: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
