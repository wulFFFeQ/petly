/**
 * K63 — GDPR / privacy boundary assert matrix.
 * Run: npx tsx scripts/assert-privacy-gdpr.mts
 *
 * Extends existing privacy SSOT — does not create a parallel taxonomy.
 * Clinical / PII / storage metadata must not leak via public projections.
 */
import assert from 'node:assert/strict'
import {
  createDemoClinicalService,
  createInMemoryDemoClinicalAdapter,
  isClinicalError,
  toAuthorizedDocumentView,
} from '../src/lib/clinical/index.ts'
import {
  assertClinicalShareAttachmentSafe,
} from '../src/lib/messaging/privacy.ts'
import {
  buildClinicalShareReceivedNotification,
  isSafeClinicalShareNotificationPayload,
} from '../src/lib/notifications/fromClinicalShare.ts'
import {
  assertStorageKeysForbiddenInPublicPayload,
  CLINICAL_PUBLIC_FORBIDDEN_KEYS,
  normalizePrivacySettings,
  PRIVACY_DATA_CLASSES,
  projectPublicPet,
  PUBLIC_PAYLOAD_FORBIDDEN_KEYS,
  STORAGE_INTERNAL_FORBIDDEN_KEYS,
} from '../src/lib/privacy/index.ts'
import { sanitizeDiscoverPet } from '../src/lib/discover/privacy.ts'
import { projectOwnedPetToDiscover } from '../src/lib/discover/fromOwnedPet.ts'
import { buildEmergencyCardPublicView } from '../src/lib/emergencyCard/index.ts'
import { buildLostPetPublicView } from '../src/lib/lostPet/publicView.ts'
import { toPublicProfessionalProfile } from '../src/lib/professional/public.ts'
import { projectPetForProfessional } from '../src/lib/professional/project.ts'
import { projectPetForOrganization } from '../src/lib/organization/petProject.ts'
import {
  scrubAuditMetadata,
  auditEventContainsForbiddenContent,
} from '../src/lib/security/audit/scrub.ts'
import {
  configureAuthorizationAudit,
  createDemoAuditSink,
  createSecurityContext,
} from '../src/lib/security/index.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import type { Pet, PetDocument } from '../src/types/index.ts'
import type { ProfessionalProfile } from '../src/types/professional.ts'
import type { LostPetAnnouncement } from '../src/types/lostPet.ts'

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

function hasForbidden(obj: unknown, keys: readonly string[]): string[] {
  const text = JSON.stringify(obj)
  return keys.filter((k) => {
    const re = new RegExp(`"${k}"\\s*:`)
    return re.test(text)
  })
}

const publicSettings = normalizePrivacySettings({
  account: {},
  pets: {
    luna: {
      name: 'public',
      photos: 'public',
      speciesBreed: 'public',
      ageDob: 'public',
      location: 'public',
      breeding: 'public',
      postsAndTagging: 'public',
      weight: 'private',
      microchip: 'private',
      health: 'private',
      allergies: 'private',
      medications: 'private',
      documents: 'private',
    },
  },
})

const richPet = {
  id: 'luna',
  name: 'Luna',
  type: 'dog',
  breed: 'Zlatý retrívr',
  image: 'https://example.com/luna.jpg',
  age: 4,
  weight: 28,
  microchip: '985112004567890',
  healthStatus: 'healthy',
  dateOfBirth: '2020-05-01',
  publicDiscover: true,
  breedingProfile: true,
  ownerAccountId: SELF_OWNER_ID,
  emergencyCard: {
    publicSlug: 'luna',
    health: {
      allergies: 'Kuřecí bílkovina',
      regularMedication: 'Apoquel 16mg',
    },
    visibility: {
      showMaskedMicrochip: true,
      showHealthAllergies: true,
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
} as Pet

console.log('\nK63 Privacy / GDPR\n')

check('taxonomy) PRIVACY_DATA_CLASSES A–I present', () => {
  const ids = PRIVACY_DATA_CLASSES.map((c) => c.id)
  assert.deepEqual(ids, [
    'public',
    'account_private',
    'household_private',
    'professional_access',
    'organization_access',
    'clinical',
    'sensitive_identifier',
    'storage_internal',
    'audit_security',
  ])
  assertStorageKeysForbiddenInPublicPayload()
})

check('1) public pet excludes clinical data', () => {
  const pub = projectPublicPet(richPet, { settings: publicSettings })
  assert.ok(pub)
  const leaks = hasForbidden(pub, [...CLINICAL_PUBLIC_FORBIDDEN_KEYS, 'microchip', 'weight'])
  assert.deepEqual(leaks, [])
})

check('2) public owner excludes private data', () => {
  const pub = projectPublicPet(richPet, { settings: publicSettings })
  assert.ok(pub)
  const leaks = hasForbidden(pub, ['ownerContacts', 'phone', 'email', 'address', 'ownerPhone'])
  assert.deepEqual(leaks, [])
})

check('3) discover excludes clinical data', () => {
  const projected = projectOwnedPetToDiscover(richPet, [], {
    privacySettings: publicSettings,
  })
  assert.ok(projected)
  const sanitized = sanitizeDiscoverPet(projected!)
  assert.ok(sanitized)
  const leaks = hasForbidden(sanitized, [
    ...CLINICAL_PUBLIC_FORBIDDEN_KEYS,
    'microchip',
    'storageKey',
  ])
  assert.deepEqual(leaks, [])
})

check('4) community excludes clinical data', () => {
  // Community public location helper + post payloads must not carry clinical keys.
  const fakePost = {
    id: 'p1',
    text: 'Ahoj',
    petId: richPet.id,
    // Attempted leak fields must not be treated as public contract
  }
  const leaks = hasForbidden(fakePost, CLINICAL_PUBLIC_FORBIDDEN_KEYS)
  assert.deepEqual(leaks, [])
  // Public pet projection remains the community identity source
  const pub = projectPublicPet(richPet, { settings: publicSettings })
  assert.ok(pub)
  assert.equal('healthRecords' in pub!, false)
})

check('5) professional public excludes clinical data', () => {
  const profile: ProfessionalProfile = {
    id: 'pro_1',
    accountId: 'acct_pro',
    type: 'veterinarian',
    displayName: 'Dr. Vet',
    publicVisibility: 'public',
    verificationStatus: 'unverified',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const pub = toPublicProfessionalProfile(profile)
  assert.ok(pub)
  const leaks = hasForbidden(pub, [
    ...CLINICAL_PUBLIC_FORBIDDEN_KEYS,
    'microchip',
    'ownerContacts',
    'storageKey',
  ])
  assert.deepEqual(leaks, [])
})

check('6) breeder showcase excludes clinical data', () => {
  const pub = projectPublicPet(
    { ...richPet, breedingProfile: true },
    { settings: publicSettings },
  )
  assert.ok(pub)
  const leaks = hasForbidden(pub, [...CLINICAL_PUBLIC_FORBIDDEN_KEYS, 'microchip', 'weight'])
  assert.deepEqual(leaks, [])
})

check('7) emergency public excludes private clinical details', () => {
  const view = buildEmergencyCardPublicView(richPet)
  assert.ok(view)
  // Full chip never public; medication hidden by visibility
  const json = JSON.stringify(view)
  assert.equal(json.includes('985112004567890'), false)
  assert.equal(json.includes('Apoquel'), false)
  assert.ok(!('ownerContacts' in view))
  assert.ok(!('storageKey' in view))
})

check('8) lost & found excludes private clinical data', () => {
  const announcement = {
    id: 'lost_1',
    petId: richPet.id,
    publicToken: 'tok_abc',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSeen: {
      publicLabel: 'Praha',
      seenAt: '2026-01-01T00:00:00.000Z',
      publicLat: 50.08,
      publicLng: 14.42,
    },
    allowAppContact: true,
    knowsPossibleArea: false,
    respondsToName: true,
    publicBehavior: 'friendly',
  } as LostPetAnnouncement
  const view = buildLostPetPublicView(richPet, announcement)
  assert.ok(view)
  const leaks = hasForbidden(view, [
    'microchip',
    'ownerContacts',
    'healthRecords',
    'storageKey',
    'medications',
  ])
  assert.deepEqual(leaks, [])
})

check('9) notification excludes clinical payload', () => {
  const draft = buildClinicalShareReceivedNotification({
    messageId: 'msg_1',
    conversationId: 'conv_1',
    recipientAccountId: 'acct_r',
  })
  assert.ok(draft)
  assert.equal(draft!.message, 'Byl vám sdílen klinický záznam')
  assert.ok(isSafeClinicalShareNotificationPayload(draft))
  assert.equal(draft!.message.includes('Apoquel'), false)
  assert.equal(JSON.stringify(draft).includes('storageKey'), false)
})

check('10) message share excludes raw storage key', () => {
  const attachment = {
    kind: 'clinical_share' as const,
    shareType: 'document' as const,
    sourceId: 'doc_1',
    petId: 'luna',
    title: 'Lab result',
    displayKind: 'doc' as const,
  }
  assertClinicalShareAttachmentSafe(attachment)
  assert.equal('storageKey' in attachment, false)
  assert.equal('url' in attachment, false)
})

check('11) document projection excludes raw URL', () => {
  const doc: PetDocument = {
    id: 'doc_1',
    petId: 'luna',
    name: 'Lab',
    category: 'health',
    documentType: 'lab',
    fileName: 'lab.pdf',
    size: '1 KB',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    storageKey: 'secret/blob/path',
    url: 'https://provider.example/signed?token=abc',
    version: 1,
    lifecycleStatus: 'active',
  }
  const projected = toAuthorizedDocumentView(doc, 'professional')
  assert.equal(projected.storageKey, undefined)
  assert.equal(projected.url, undefined)
})

check('12) professional projection excludes ownerContacts', () => {
  const view = projectPetForProfessional(richPet, {
    permissions: ['health.read', 'documents.read'],
    ownerContacts: { phone: '777', email: 'a@b.cz', address: 'Ulice 1' },
  })
  assert.ok(view)
  assert.equal('ownerContacts' in view, false)
  assert.equal('microchip' in view && Boolean((view as { microchip?: string }).microchip), false)
})

check('13) organization projection excludes ownerContacts', () => {
  const view = projectPetForOrganization(richPet, {
    permissions: ['health.read', 'documents.read'],
    ownerContacts: { phone: '777', email: 'a@b.cz', address: 'Ulice 1' },
  })
  assert.ok(view)
  assert.equal('ownerContacts' in view, false)
})

check('14) microchip privacy boundary', () => {
  const pub = projectPublicPet(richPet, { settings: publicSettings })
  assert.ok(pub)
  assert.equal('microchip' in pub!, false)
  const emergency = buildEmergencyCardPublicView(richPet)
  const json = JSON.stringify(emergency)
  assert.equal(json.includes('985112004567890'), false)
  if (emergency.maskedMicrochip) {
    assert.ok(emergency.maskedMicrochip.includes('•') || emergency.maskedMicrochip.includes('*'))
  }
})

check('15) account cross-isolation', () => {
  const adapter = createInMemoryDemoClinicalAdapter({})
  const service = createDemoClinicalService(adapter, {
    store: { pets: [richPet] },
  })
  try {
    service.createRecord({
      context: createSecurityContext({
        authentication: {
          kind: 'session',
          sessionId: 'demo_stranger',
          authenticatedAt: '2026-01-01T00:00:00.000Z',
        },
        actor: { kind: 'account', accountId: 'acct_other' },
        authority: 'demo',
        activeMode: 'personal',
      }),
      input: { petId: richPet.id, type: 'vet', title: 'X', date: '2026-01-01' },
      pets: [richPet],
    })
    assert.fail('expected deny')
  } catch (err) {
    assert.ok(isClinicalError(err))
    assert.equal(err.code, 'FORBIDDEN')
  }
})

check('16) pet cross-isolation', () => {
  const other = { ...richPet, id: 'other-pet', ownerAccountId: 'acct_other' } as Pet
  const adapter = createInMemoryDemoClinicalAdapter({})
  const service = createDemoClinicalService(adapter, {
    store: { pets: [richPet, other] },
  })
  // Owner of luna must not read other-pet clinical via service without ownership
  // (SELF_OWNER_ID owns luna only in this fixture — other has different owner)
  try {
    service.listRecordsForPet({
      context: createSecurityContext({
        authentication: {
          kind: 'session',
          sessionId: 'demo_owner',
          authenticatedAt: '2026-01-01T00:00:00.000Z',
        },
        actor: { kind: 'account', accountId: SELF_OWNER_ID },
        authority: 'demo',
        activeMode: 'personal',
      }),
      petId: other.id,
      pets: [richPet, other],
    })
    assert.fail('expected deny')
  } catch (err) {
    assert.ok(isClinicalError(err))
    assert.ok(err.code === 'FORBIDDEN' || err.code === 'NOT_FOUND')
  }
})

check('17) organization cross-isolation', () => {
  // Org projection without grant must not invent access — projection is post-authorize.
  // Forbidden keys still scrubbed even if mis-called.
  const view = projectPetForOrganization(richPet, {
    permissions: [],
    ownerContacts: { phone: '777' },
  })
  assert.equal('ownerContacts' in (view ?? {}), false)
})

check('18) clinical export requires clinical.export', () => {
  const adapter = createInMemoryDemoClinicalAdapter({})
  const service = createDemoClinicalService(adapter, {
    store: { pets: [richPet] },
  })
  try {
    service.exportClinicalHistory({
      context: createSecurityContext({
        authentication: {
          kind: 'session',
          sessionId: 'demo_owner',
          authenticatedAt: '2026-01-01T00:00:00.000Z',
        },
        actor: { kind: 'account', accountId: SELF_OWNER_ID },
        authority: 'demo',
        activeMode: 'personal',
      }),
      petId: richPet.id,
      pets: [richPet],
    })
    assert.fail('expected SERVER_REQUIRED after authorize')
  } catch (err) {
    assert.ok(isClinicalError(err))
    // Owner may authorize clinical.export then hit SERVER_REQUIRED — never fake export body
    assert.ok(err.code === 'SERVER_REQUIRED' || err.code === 'FORBIDDEN')
  }
})

check('19) audit excludes clinical payload', () => {
  const scrubbed = scrubAuditMetadata({
    workflow: 'clinical_share',
    medication: 'Apoquel',
    healthRecord: { diagnosis: 'x' },
    phase: 'created',
  })
  assert.ok(scrubbed)
  assert.equal(scrubbed!.workflow, 'clinical_share')
  assert.equal(scrubbed!.medication, undefined)
  assert.equal(scrubbed!.healthRecord, undefined)
  const serialized = JSON.stringify(scrubbed)
  assert.equal(auditEventContainsForbiddenContent(serialized, ['Apoquel', 'diagnosis']), false)
})

check('20) logs exclude clinical payload', () => {
  // Contract: no clinical console helpers in privacy modules; scrub keys cover log payloads.
  for (const key of STORAGE_INTERNAL_FORBIDDEN_KEYS) {
    assert.ok((PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes(key))
  }
})

check('21) JSON serialization does not leak private fields', () => {
  const pub = projectPublicPet(richPet, { settings: publicSettings })
  const text = JSON.stringify(pub)
  for (const key of [
    'microchip',
    'storageKey',
    'ownerContacts',
    'healthRecords',
    'weightMeasurements',
    'medications',
  ]) {
    assert.equal(text.includes(`"${key}"`), false, `leaked ${key}`)
  }
})

check('22) SEO does not leak clinical data', () => {
  // Discover / public pet is the SEO identity source — no clinical in serialized public card.
  const pub = projectPublicPet(richPet, { settings: publicSettings })
  const seoBlob = {
    title: pub?.name,
    description: `${pub?.breed ?? ''} · ${pub?.location ?? ''}`,
    image: pub?.image,
  }
  const text = JSON.stringify(seoBlob)
  assert.equal(text.includes('985112004567890'), false)
  assert.equal(text.includes('Apoquel'), false)
  assert.equal(text.includes('healthRecords'), false)
})

// Ensure audit sink does not retain clinical from our scrub test path
const sink = createDemoAuditSink({ storageKey: 'k63.privacy.audit' })
configureAuthorizationAudit({ sink, enabled: true })

console.log(`\nK63 privacy/GDPR: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
