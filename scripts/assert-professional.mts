/**
 * Assert professional / B2B access architecture (KROK 17).
 * Run: npx tsx scripts/assert-professional.mts
 *
 * A – owner can grant access
 * B – owner can revoke access
 * C – pending access has no health access
 * D – active access respects individual permissions
 * E – viewHealth does not allow addHealthRecord without write permission
 * F – professional without access cannot see health data
 * G – professional without access cannot see chip
 * H – ownerContacts are never auto-available
 * I – revoked access stops immediately
 * J – expired access stops applying
 * K – public professional profile has no sensitive data
 * L – verification badge not shown without real verified trust state
 * M – audit log records grant/revoke/access actions
 * N – KROK 15 privacy boundary remains intact
 */
import assert from 'node:assert/strict'
import { projectOwnedPetToDiscover } from '../src/lib/discover/fromOwnedPet.ts'
import { sanitizeDiscoverPet } from '../src/lib/discover/privacy.ts'
import {
  normalizePrivacySettings,
  projectPublicPet,
} from '../src/lib/privacy/index.ts'
import {
  assertCanAddHealthRecord,
  assertProfessionalViewSafe,
  assertPublicProfessionalSafe,
  canProfessionalViewHealth,
  grantPetAccess,
  hasPermission,
  hasProfessionalVerifiedBadge,
  isAccessEffective,
  isProfessionalType,
  logsIncludeAction,
  projectPetForProfessional,
  revokeAccess,
  roleGrantsPetDataAccess,
  toPublicProfessionalProfile,
  type PetProfessionalAccess,
  type ProfessionalAccessLog,
  type ProfessionalProfile,
} from '../src/lib/professional/index.ts'
import { isActiveTrustVerification } from '../src/lib/verification/status.ts'
import type { Verification } from '../src/lib/verification/types.ts'
import type { HealthRecord, Pet, PetDocument } from '../src/types/index.ts'

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

function basePet(overrides: Partial<Pet> = {}): Pet {
  return {
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
    emergencyCard: {
      publicSlug: 'luna',
      health: {
        allergies: 'Kuřecí bílkovina',
        regularMedication: 'Apoquel 16mg',
      },
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
  }
}

function baseProfile(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id: 'pro_vet_1',
    accountId: 'acct_vet_1',
    type: 'veterinarian',
    displayName: 'MVDr. Novák',
    organizationName: 'PetCare Central',
    description: 'Malá zvířata',
    phone: '+420111222333',
    email: 'novak@petcare.example',
    address: 'Hlavní 12, Praha 1',
    city: 'Praha',
    website: 'https://petcare.example',
    specializations: ['chirurgie', 'stomatologie'],
    hoursSummary: 'Po–Pá 8–18',
    professionalCredentials: {
      licenseNumber: 'VET-SECRET-999',
      registrationId: 'REG-HIDDEN',
    },
    publicVisibility: 'public',
    verificationStatus: 'unverified',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const healthRecords: HealthRecord[] = [
  {
    id: 'hr1',
    petId: 'luna',
    type: 'vaccination',
    title: 'Vzteklina',
    subtitle: 'Vakcína',
    date: '2025-01-01',
  },
  {
    id: 'hr2',
    petId: 'luna',
    type: 'medication',
    title: 'Apoquel',
    subtitle: 'Léky',
    date: '2025-02-01',
  },
  {
    id: 'hr3',
    petId: 'luna',
    type: 'vet',
    title: 'Kontrola',
    subtitle: 'Návštěva',
    date: '2025-03-01',
  },
]

const documents: PetDocument[] = [
  {
    id: 'doc1',
    petId: 'luna',
    name: 'Pas',
    category: 'identification',
    documentType: 'eu_pet_passport',
    fileName: 'pas.pdf',
    size: '1 MB',
    uploadedAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    isPublic: false,
  },
]

const ownerContacts = {
  phone: '+420999888777',
  email: 'owner@example.com',
  address: 'Tajná 1, Brno',
}

console.log('KROK 17 – assert-professional')

check('roles are extensible and never grant data access', () => {
  assert.equal(isProfessionalType('veterinarian'), true)
  assert.equal(isProfessionalType('custom_physio'), true)
  assert.equal(isProfessionalType('owner'), false)
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
  assert.equal(roleGrantsPetDataAccess('owner'), false)
})

check('A – owner can grant access', () => {
  const { access, accessList, logs } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'addVisit'],
    grantedByAccountId: 'owner_self',
    status: 'active',
    id: 'ppa_a',
  })
  assert.equal(access.status, 'active')
  assert.equal(accessList.length, 1)
  assert.equal(accessList[0].id, 'ppa_a')
  assert.ok(logsIncludeAction(logs, 'access_granted', { petId: 'luna', professionalId: 'pro_vet_1' }))
})

check('B – owner can revoke access', () => {
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
    id: 'ppa_b',
  })
  const { access, accessList, logs } = revokeAccess(granted.accessList, granted.logs, 'ppa_b')
  assert.ok(access)
  assert.equal(access!.status, 'revoked')
  assert.equal(accessList[0].status, 'revoked')
  assert.ok(accessList[0].revokedAt)
  assert.ok(logsIncludeAction(logs, 'access_revoked', { petId: 'luna' }))
})

check('C – pending access has no health access', () => {
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: 'owner_self',
    status: 'pending',
    id: 'ppa_c',
  })
  assert.equal(isAccessEffective(access), false)
  assert.equal(hasPermission(access, 'viewHealth'), false)
  assert.equal(canProfessionalViewHealth(access), false)

  const { view } = projectPetForProfessional(basePet(), {
    access,
    healthRecords,
    documents,
    ownerContacts,
  })
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.name, undefined)
})

check('D – active access respects individual permissions', () => {
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewVaccinations', 'addVisit'],
    grantedByAccountId: 'owner_self',
    status: 'active',
    id: 'ppa_d',
  })
  assert.equal(hasPermission(access, 'viewVaccinations'), true)
  assert.equal(hasPermission(access, 'addVisit'), true)
  assert.equal(hasPermission(access, 'viewDocuments'), false)
  assert.equal(hasPermission(access, 'viewHealth'), false)
  assert.equal(hasPermission(access, 'addHealthRecord'), false)

  const { view } = projectPetForProfessional(basePet(), {
    access,
    healthRecords,
    documents,
  })
  assert.ok(view.vaccinations)
  assert.equal(view.vaccinations!.length, 1)
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.documents, undefined)
})

check('E – viewHealth does not allow addHealthRecord without write permission', () => {
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'addVisit', 'addHealthRecord'].filter(
      (p) => p === 'viewHealth' || p === 'addVisit',
    ) as PetProfessionalAccess['permissions'],
    grantedByAccountId: 'owner_self',
    id: 'ppa_e',
  })
  assert.equal(hasPermission(access, 'viewHealth'), true)
  assert.equal(hasPermission(access, 'addHealthRecord'), false)
  assert.throws(() => assertCanAddHealthRecord(access), /addHealthRecord/)
})

check('F – professional without access cannot see health data', () => {
  const { view } = projectPetForProfessional(basePet(), {
    access: null,
    healthRecords,
    documents,
  })
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.vaccinations, undefined)
  assert.equal(view.medications, undefined)

  const roleOnly = baseProfile()
  void roleOnly
  // Role alone never opens health — no access object.
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
})

check('G – professional without access cannot see chip', () => {
  const pet = basePet()
  assert.ok(pet.microchip)
  const { view } = projectPetForProfessional(pet, {
    access: null,
    healthRecords,
  })
  assertProfessionalViewSafe(view)
  assert.equal('microchip' in view && (view as { microchip?: unknown }).microchip != null, false)

  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'viewDocuments'],
    grantedByAccountId: 'owner_self',
    id: 'ppa_g',
  })
  const withAccess = projectPetForProfessional(pet, { access, healthRecords })
  assertProfessionalViewSafe(withAccess.view)
  assert.equal(
    'microchip' in withAccess.view && (withAccess.view as { microchip?: unknown }).microchip != null,
    false,
  )
})

check('H – ownerContacts are never auto-available', () => {
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: [
      'viewHealth',
      'viewVaccinations',
      'viewMedications',
      'viewDocuments',
      'addVisit',
      'addVaccination',
      'addHealthRecord',
      'addNote',
    ],
    grantedByAccountId: 'owner_self',
    id: 'ppa_h',
  })
  const { view } = projectPetForProfessional(basePet(), {
    access,
    healthRecords,
    documents,
    ownerContacts,
  })
  assertProfessionalViewSafe(view)
  const record = view as Record<string, unknown>
  assert.equal(record.ownerContacts, undefined)
  assert.equal(record.ownerPhone, undefined)
  assert.equal(record.ownerEmail, undefined)
  assert.equal(record.phone, undefined)
  assert.equal(record.email, undefined)
})

check('I – revoked access stops immediately', () => {
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
    id: 'ppa_i',
  })
  assert.equal(canProfessionalViewHealth(granted.access), true)
  const { access } = revokeAccess(granted.accessList, granted.logs, 'ppa_i')
  assert.equal(isAccessEffective(access), false)
  assert.equal(canProfessionalViewHealth(access), false)
  const { view } = projectPetForProfessional(basePet(), {
    access,
    healthRecords,
  })
  assert.equal(view.healthRecords, undefined)
})

check('J – expired access stops applying', () => {
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
    expiresAt: '2020-01-01T00:00:00.000Z',
    id: 'ppa_j',
  })
  const now = Date.parse('2026-09-10T00:00:00.000Z')
  assert.equal(isAccessEffective(access, now), false)
  assert.equal(hasPermission(access, 'viewHealth', now), false)
  const { view } = projectPetForProfessional(basePet(), {
    access,
    healthRecords,
    now,
  })
  assert.equal(view.healthRecords, undefined)
})

check('K – public professional profile has no sensitive data', () => {
  const profile = baseProfile()
  const pub = toPublicProfessionalProfile(profile)
  assert.ok(pub)
  assertPublicProfessionalSafe(pub!)
  assert.equal(pub!.displayName, 'MVDr. Novák')
  assert.equal(pub!.city, 'Praha')
  assert.equal(pub!.type, 'veterinarian')
  const record = pub as Record<string, unknown>
  assert.equal(record.address, undefined)
  assert.equal(record.professionalCredentials, undefined)
  assert.equal(record.licenseNumber, undefined)
  assert.equal(record.registrationId, undefined)
  assert.equal(record.accountId, undefined)
  assert.equal(record.verified, undefined)
})

check('L – verification badge not shown without real verified trust state', () => {
  const unverified = baseProfile({ verificationStatus: 'unverified' })
  assert.equal(hasProfessionalVerifiedBadge(unverified, []), false)
  assert.equal(toPublicProfessionalProfile(unverified)?.verifiedBadge, undefined)

  const demoVer: Verification = {
    id: 'ver_demo_pro',
    subjectType: 'professional',
    subjectId: 'pro_vet_1',
    type: 'veterinary',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  const demoProfile = baseProfile({ verificationStatus: 'verified' })
  assert.equal(isActiveTrustVerification(demoVer), false)
  assert.equal(hasProfessionalVerifiedBadge(demoProfile, [demoVer]), false)
  assert.equal(
    toPublicProfessionalProfile(demoProfile, { verifications: [demoVer] })?.verifiedBadge,
    undefined,
  )

  const trustVer: Verification = {
    id: 'ver_trust_pro',
    subjectType: 'professional',
    subjectId: 'pro_vet_1',
    type: 'veterinary',
    status: 'verified',
    source: 'vet_attestation',
    presentation: 'trust',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(hasProfessionalVerifiedBadge(demoProfile, [trustVer]), true)
  assert.equal(
    toPublicProfessionalProfile(demoProfile, { verifications: [trustVer] })?.verifiedBadge,
    true,
  )
})

check('M – audit log records grant/revoke/access actions', () => {
  let logs: ProfessionalAccessLog[] = []
  const granted = grantPetAccess([], logs, {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'viewDocuments'],
    grantedByAccountId: 'owner_self',
    id: 'ppa_m',
  })
  logs = granted.logs
  assert.ok(logsIncludeAction(logs, 'access_granted'))

  const projected = projectPetForProfessional(basePet(), {
    access: granted.access,
    healthRecords,
    documents,
    auditLogs: logs,
    logViews: true,
  })
  logs = projected.logs
  assert.ok(logsIncludeAction(logs, 'record_viewed', { petId: 'luna' }))
  assert.ok(logsIncludeAction(logs, 'document_viewed', { petId: 'luna' }))

  const revoked = revokeAccess(granted.accessList, logs, 'ppa_m')
  assert.ok(logsIncludeAction(revoked.logs, 'access_revoked'))
})

check('N – KROK 15 privacy boundary remains intact', () => {
  const normalized = normalizePrivacySettings({
    account: { ownerContacts: 'public' },
    pets: {
      luna: {
        microchip: 'public',
        health: 'public',
        documents: 'public',
        name: 'public',
        photos: 'public',
        speciesBreed: 'public',
        ageDob: 'public',
        location: 'public',
      },
    },
  })
  assert.equal(normalized.account.ownerContacts, 'connections')
  assert.equal(normalized.pets.luna.microchip, 'connections')
  assert.equal(normalized.pets.luna.health, 'connections')
  assert.equal(normalized.pets.luna.documents, 'connections')

  const pet = basePet({ publicDiscover: true })
  const discover = sanitizeDiscoverPet(
    projectOwnedPetToDiscover(pet, [], {
      privacySettings: normalized,
    }),
  )
  assert.ok(discover)
  for (const key of ['microchip', 'health', 'documents', 'ownerPhone', 'ownerEmail'] as const) {
    assert.equal((discover as Record<string, unknown>)[key], undefined)
  }

  const publicPet = projectPublicPet(pet, { settings: normalized })
  assert.ok(publicPet)
  assert.equal((publicPet as Record<string, unknown>).microchip, undefined)
  assert.equal((publicPet as Record<string, unknown>).healthRecords, undefined)

  // Professional role does not open Discover / public pet payload.
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
})

console.log('')
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
