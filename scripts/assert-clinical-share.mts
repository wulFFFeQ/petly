/**
 * K61 — Clinical Share hardening assert matrix.
 * Run: npx tsx scripts/assert-clinical-share.mts
 *
 * Clinical Share = workflow over authorize() + Messages.
 * NOT access grant / permission grant / parallel ACL / ClinicalShareAudit.
 */
import assert from 'node:assert/strict'
import {
  createClinicalShare,
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  isClinicalError,
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
  savePetProfessionalAccess,
  saveProfessionalProfiles,
} from '../src/lib/professional/index.ts'
import {
  acceptOrganizationInvitation,
  createOrganization,
  grantOrganizationPetAccess,
  inviteOrganizationMember,
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
import {
  assertClinicalShareAttachmentSafe,
  sendMessage,
  upsertConversation,
  loadInboxConversations,
} from '../src/lib/messaging/index.ts'
import {
  buildClinicalShareReceivedNotification,
  isSafeClinicalShareNotificationPayload,
  emitClinicalShareReceivedNotification,
  upsertNotification,
  loadNotifications,
  saveNotifications,
} from '../src/lib/notifications/index.ts'
import type {
  ClinicalEncounter,
  Conversation,
  HealthRecord,
  Pet,
  PetDocument,
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

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const vetBAccount = account('acct_vet_b', 'Dr. Vet B', ['veterinarian'])
const orgVet = account('acct_org_vet', 'Org Vet', ['veterinarian'])
const orgMemberOnly = account('acct_org_member', 'Org Member', ['veterinarian'])
const stranger = account('acct_stranger', 'Stranger')

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_k61',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const vetBProfile: ProfessionalProfile = {
  id: 'pro_vet_b_k61',
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
  stranger,
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
  displayName: 'Clinic A K61',
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

function ensureProActive(
  status: 'active' | 'revoked' | 'pending' | 'expired' = 'active',
  permissions: Array<'viewHealth' | 'addHealthRecord' | 'viewDocuments' | 'addNote'> = [
    'viewHealth',
    'viewDocuments',
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

function seedConversation(
  id: string,
  participants: [string, string],
  petId = bella.id,
): Conversation {
  const conv: Conversation = {
    id,
    name: 'Share thread',
    avatar: '',
    petContext: 'Bella',
    petId,
    contactType: 'professional',
    lastMessage: '',
    time: '',
    unread: 0,
    messages: [],
    participantAccountIds: [...participants],
    professionalId: vetProfile.id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  return upsertConversation(conv)
}

function freshService(seed?: {
  healthRecords?: HealthRecord[]
  documents?: PetDocument[]
  weights?: WeightMeasurement[]
  encounters?: ClinicalEncounter[]
}) {
  const adapter = createInMemoryDemoClinicalAdapter(seed)
  const service = createDemoClinicalService(adapter, { store })
  return { adapter, service }
}

function ownerSeedClinical() {
  const { service, adapter } = freshService()
  const record = service.createRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      type: 'vet',
      title: 'Kontrola',
      subtitle: 'Roční prohlídka',
      date: '12. 9. 2026',
    },
  }).data
  const weight = service.createWeightMeasurement({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      id: `wm_k61_${Date.now()}`,
      petId: bella.id,
      date: '12. 9. 2026',
      weight: 14.2,
    },
  }).data
  const doc = service.createDocument({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      name: 'Lab PDF',
      category: 'health',
      documentType: 'lab_results',
      fileName: 'lab.pdf',
      size: '1 MB',
      storageKey: 'secret_storage_key_xyz',
      url: 'https://evil.example/secret.pdf',
    },
  }).data
  const encounter = service.createEncounter({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    input: {
      petId: bella.id,
      encounterType: 'preventive',
      reason: 'sensitive clinical reason never share',
    },
  }).data
  return { service, adapter, record, weight, doc, encounter }
}

const auditSink = createDemoAuditSink()
configureAuthorizationAudit(auditSink)
auditSink.clearForTests()
saveNotifications([])

console.log('\nK61 Clinical Share\n')

check('1) owner share health record → ALLOW', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_1', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_1',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.data.attachment.kind, 'clinical_share')
  assert.equal(result.data.attachment.shareType, 'health_record')
  assert.equal(result.data.attachment.sourceId, record.id)
  assert.equal(result.data.recipientAccountId, vetAccount.id)
})

check('2) owner share measurement → ALLOW', () => {
  const { service, weight } = ownerSeedClinical()
  seedConversation('conv_share_2', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_2',
    petId: bella.id,
    shareType: 'measurement',
    sourceId: weight.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
})

check('3) owner share document → ALLOW metadata-only (blob DEFERRED)', () => {
  const { service, doc } = ownerSeedClinical()
  seedConversation('conv_share_3', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_3',
    petId: bella.id,
    shareType: 'document',
    sourceId: doc.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const json = JSON.stringify(result.data.attachment)
  assert.equal(json.includes('storageKey'), false)
  assert.equal(json.includes('secret_storage'), false)
  assert.equal(json.includes('https://'), false)
  assert.equal(result.data.attachment.title, 'Lab PDF')
})

check('4) owner share encounter → ALLOW summary only', () => {
  const { service, encounter } = ownerSeedClinical()
  seedConversation('conv_share_4', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_4',
    petId: bella.id,
    shareType: 'encounter',
    sourceId: encounter.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const json = JSON.stringify(result.data.attachment)
  assert.equal(json.includes('sensitive clinical reason'), false)
})

check('5) co-owner share → ALLOW', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_5', [coOwner.id, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(coOwner.id),
    conversationId: 'conv_share_5',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
})

check('6) caregiver without read → DENY', () => {
  setCaregiverPermissions([])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_6', [caregiver.id, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(caregiver.id),
    conversationId: 'conv_share_6',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('7) caregiver with read → ALLOW', () => {
  setCaregiverPermissions(['health_read', 'documents_read'])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_7', [caregiver.id, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(caregiver.id),
    conversationId: 'conv_share_7',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
})

check('8) viewer → DENY', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_8', [viewer.id, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(viewer.id),
    conversationId: 'conv_share_8',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('9) professional without access → DENY', () => {
  savePetProfessionalAccess([])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_9', [vetAccount.id, SELF_OWNER_ID])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  const result = createClinicalShare({
    context: ctx,
    conversationId: 'conv_share_9',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('10) professional without read permission → DENY', () => {
  ensureProActive('active', ['addNote'])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_10', [vetAccount.id, SELF_OWNER_ID])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  const result = createClinicalShare({
    context: ctx,
    conversationId: 'conv_share_10',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('11) professional with read permission → ALLOW', () => {
  ensureProActive('active', ['viewHealth', 'viewDocuments'])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_11', [vetAccount.id, SELF_OWNER_ID])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id, { activeMode: 'professional' }), {
    professionalProfileId: vetProfile.id,
  })
  const result = createClinicalShare({
    context: ctx,
    conversationId: 'conv_share_11',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
})

check('12) organization membership only → DENY', () => {
  saveOrganizationPetAccess([])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_12', [orgMemberOnly.id, SELF_OWNER_ID])
  const ctx = withOrganizationContext(
    ctxForAccount(orgMemberOnly.id, { activeMode: 'organization' }),
    { organizationId: clinicA.id, membershipId: 'mem_placeholder', role: 'staff' },
  )
  const result = createClinicalShare({
    context: ctx,
    claimedOrganizationId: clinicA.id,
    conversationId: 'conv_share_12',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('13) organization access + read permission → ALLOW', () => {
  saveOrganizationPetAccess([])
  const { accessList } = grantOrganizationPetAccess([], {
    organizationId: clinicA.id,
    pet: bella,
    permissions: ['viewHealth', 'viewDocuments'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional', 'staff'],
  })
  saveOrganizationPetAccess(accessList)
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_13', [orgVet.id, SELF_OWNER_ID])
  const ctx = withOrganizationContext(
    ctxForAccount(orgVet.id, { activeMode: 'organization' }),
    { organizationId: clinicA.id, membershipId: 'mem_org_vet', role: 'professional' },
  )
  const result = createClinicalShare({
    context: ctx,
    claimedOrganizationId: clinicA.id,
    conversationId: 'conv_share_13',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
})

check('14) forged actor → DENY', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_14', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    claimedActorAccountId: stranger.id,
    conversationId: 'conv_share_14',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('15) forged pet → DENY', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_15', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_15',
    petId: 'pet_forged_missing',
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('16) forged source → DENY', () => {
  const { service } = ownerSeedClinical()
  seedConversation('conv_share_16', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_16',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: 'hr_does_not_exist',
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('17) forged recipient (client claim ignored) → still valid participant only', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_17', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_17',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
    claimedRecipientAccountId: stranger.id,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.data.recipientAccountId, vetAccount.id)
  assert.notEqual(result.data.recipientAccountId, stranger.id)
})

check('17b) unrelated recipient conversation → DENY', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_17b', [stranger.id, vetBAccount.id], bella.id)
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_17b',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('18) cross-pet source → DENY', () => {
  const { service } = ownerSeedClinical()
  const otherRecord = service.createRecord({
    context: ctxForAccount('acct_other_owner'),
    pets,
    input: {
      petId: otherPet.id,
      type: 'vet',
      title: 'Other pet visit',
      subtitle: 'x',
      date: '1. 1. 2026',
    },
  })
  // other owner create may fail if not owner of otherPet in session — seed adapter directly
  void otherRecord
  const { service: svc2, adapter } = freshService()
  const foreign: HealthRecord = {
    id: 'hr_foreign',
    petId: otherPet.id,
    type: 'vet',
    title: 'Foreign',
    subtitle: 'x',
    date: '1. 1. 2026',
    version: 1,
  }
  adapter.setHealthRecords([foreign])
  seedConversation('conv_share_18', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_18',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: foreign.id,
    pets,
    clinical: svc2,
  })
  assert.equal(result.ok, false)
})

check('19) share does not grant write', () => {
  savePetProfessionalAccess([])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_19', [SELF_OWNER_ID, vetAccount.id])
  const shared = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_19',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(shared.ok, true)
  const proCtx = withProfessionalContext(
    ctxForAccount(vetAccount.id, { activeMode: 'professional' }),
    { professionalProfileId: vetProfile.id },
  )
  try {
    service.updateRecord({
      context: proCtx,
      pets,
      expectedVersion: record.version ?? 1,
      input: { recordId: record.id, updates: { title: 'Hacked' } },
    })
    assert.fail('expected write DENY')
  } catch (err) {
    assert.ok(isClinicalError(err))
    assert.ok(err.code === 'FORBIDDEN' || err.code === 'UNAUTHENTICATED')
  }
})

check('20) share does not grant permanent access', () => {
  savePetProfessionalAccess([])
  const before = loadPetProfessionalAccess().length
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_20', [SELF_OWNER_ID, vetAccount.id])
  createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_20',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(loadPetProfessionalAccess().length, before)
})

check('21) recipient cannot bypass source authorization', () => {
  savePetProfessionalAccess([])
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_21', [SELF_OWNER_ID, vetAccount.id])
  createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_21',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  const proCtx = withProfessionalContext(
    ctxForAccount(vetAccount.id, { activeMode: 'professional' }),
    { professionalProfileId: vetProfile.id },
  )
  try {
    service.readRecord({
      context: proCtx,
      pets,
      petId: bella.id,
      recordId: record.id,
    })
    assert.fail('expected read DENY after share-only')
  } catch (err) {
    assert.ok(isClinicalError(err))
    assert.ok(err.code === 'FORBIDDEN' || err.code === 'NOT_FOUND')
  }
})

check('22) public projection excludes share / clinical', () => {
  const discoverable = makePet({
    id: 'pet_public_k61',
    name: 'PublicBella',
    publicDiscover: true,
    image: 'https://example.com/dog.jpg',
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
  const publicPet = projectPublicPet(discoverable, { settings }) as Record<string, unknown> | null
  assert.ok(publicPet)
  const json = JSON.stringify(publicPet)
  for (const key of PUBLIC_PAYLOAD_FORBIDDEN_KEYS) {
    assert.equal(json.includes(`"${key}"`), false, `public leak ${key}`)
  }
  assert.equal(json.includes('clinical_share'), false)
  assert.equal(json.includes('storageKey'), false)
})

check('23) notification excludes clinical payload', () => {
  const draft = buildClinicalShareReceivedNotification({
    messageId: 'msg_x',
    conversationId: 'conv_x',
    recipientAccountId: vetAccount.id,
  })
  assert.ok(draft)
  assert.equal(draft!.type, 'clinical_share_received')
  assert.equal(draft!.message, 'Byl vám sdílen klinický záznam')
  assert.ok(isSafeClinicalShareNotificationPayload(draft))
  const bad = {
    ...draft!,
    message: 'Rabies vaccination dosage 2ml',
  }
  assert.equal(isSafeClinicalShareNotificationPayload(bad), false)
})

check('24) storageKey / raw URL injection blocked', () => {
  assert.throws(() =>
    assertClinicalShareAttachmentSafe({
      kind: 'clinical_share',
      shareType: 'document',
      sourceId: 'd1',
      petId: bella.id,
      title: 'Doc',
      storageKey: 'evil',
    }),
  )
  assert.throws(() =>
    assertClinicalShareAttachmentSafe({
      kind: 'clinical_share',
      shareType: 'document',
      sourceId: 'd1',
      petId: bella.id,
      title: 'https://evil.example/x.pdf',
    }),
  )
  const send = sendMessage({
    conversationId: 'conv_share_1',
    senderAccountId: SELF_OWNER_ID,
    text: 'x',
    attachment: {
      kind: 'clinical_share',
      shareType: 'document',
      sourceId: 'd1',
      petId: bella.id,
      title: 'blob:http://local/secret',
    },
  })
  assert.equal(send.ok, false)
})

check('25) audit uses trusted actor', () => {
  auditSink.clearForTests()
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_25', [SELF_OWNER_ID, vetAccount.id])
  createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    claimedActorAccountId: stranger.id,
    conversationId: 'conv_share_25',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  const events = auditSink.listAll()
  assert.ok(events.length >= 1)
  for (const e of events) {
    if (e.actorAccountId) {
      assert.notEqual(e.actorAccountId, stranger.id)
    }
    assert.equal(e.kind, 'authorization_decision')
  }
})

check('26) duplicate share behavior is deterministic', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_26', [SELF_OWNER_ID, vetAccount.id])
  const a = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_26',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  const b = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_26',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  if (!a.ok || !b.ok) return
  assert.notEqual(a.data.message.id, b.data.message.id)
  const conv = loadInboxConversations().find((c) => c.id === 'conv_share_26')
  assert.ok(conv)
  const shares = conv!.messages.filter((m) => m.attachment?.kind === 'clinical_share')
  assert.ok(shares.length >= 2)
})

check('27) withdrawn source handled safely', () => {
  const { service, record } = ownerSeedClinical()
  service.withdrawRecord({
    context: ctxForAccount(SELF_OWNER_ID),
    pets,
    expectedVersion: record.version ?? 1,
    input: { recordId: record.id },
  })
  seedConversation('conv_share_27', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_27',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, false)
})

check('notification emit uses existing AppNotification path', () => {
  saveNotifications([])
  let list = loadNotifications()
  const draft = emitClinicalShareReceivedNotification(
    (d) => {
      list = upsertNotification(list, d)
      saveNotifications(list)
    },
    {
      messageId: 'msg_emit_1',
      conversationId: 'conv_emit',
      recipientAccountId: vetAccount.id,
    },
  )
  assert.ok(draft)
  assert.ok(loadNotifications().some((n) => n.type === 'clinical_share_received'))
})

check('no ClinicalShareAccess parallel model symbols in attachment', () => {
  const { service, record } = ownerSeedClinical()
  seedConversation('conv_share_sym', [SELF_OWNER_ID, vetAccount.id])
  const result = createClinicalShare({
    context: ctxForAccount(SELF_OWNER_ID),
    conversationId: 'conv_share_sym',
    petId: bella.id,
    shareType: 'health_record',
    sourceId: record.id,
    pets,
    clinical: service,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const keys = Object.keys(result.data.attachment)
  assert.ok(!keys.includes('permissions'))
  assert.ok(!keys.includes('grantId'))
  assert.ok(!keys.includes('accessId'))
})

console.log(`\nK61 Clinical Share: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
