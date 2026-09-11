/**
 * Assert public professional profile (KROK 24).
 * Run: npx tsx scripts/assert-professional-public-profile.mts
 *
 * A – public profile projects; private returns null
 * B – sensitive fields never in public projection
 * C – verification badge only with verified + active trust (not DEMO)
 * D – trust items from real trust only
 * E – empty services/specializations stay absent (UI would hide)
 * F – breeder + active public breeding pets → showcase
 * G – breeder without breeding data → null showcase
 * H – non-breeder → null showcase
 * I – private breeding / microchip / ownerContacts never in showcase
 * J – catalog listPublicProfessionals uses same toPublicProfessionalProfile
 * K – foreign account pets never leak into showcase
 */
import assert from 'node:assert/strict'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import {
  applyPublicDiscoverMigration,
  normalizePrivacySettings,
  type PrivacySettings,
} from '../src/lib/privacy/index.ts'
import {
  assertPublicBreederShowcaseSafe,
  assertPublicProfessionalSafe,
  hasProfessionalVerifiedBadge,
  listPublicProfessionals,
  listPublicProfessionalTrustItems,
  toPublicBreederShowcase,
  toPublicProfessionalProfile,
  type ProfessionalProfile,
} from '../src/lib/professional/index.ts'
import type { Verification } from '../src/lib/verification/types.ts'
import type { Pet } from '../src/types/index.ts'

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
  })
  return memory
}

const memory = installMemoryStorage()

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

function basePro(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id: 'pro_pub_1',
    accountId: SELF_OWNER_ID,
    type: 'veterinarian',
    displayName: 'MUDr. Public Vet',
    organizationName: 'Public Clinic',
    description: 'Preventivní péče',
    address: 'Tajná 12',
    phone: '+420777000111',
    email: 'vet@example.com',
    city: 'Praha 2',
    website: 'https://example.com',
    services: ['očkování', 'vyšetření'],
    specializations: ['dermatologie'],
    hoursSummary: 'Po–Pá 8–18',
    professionalCredentials: { licenseNumber: 'LIC-SECRET' },
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function breedingPet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'breeder_dog_1',
    name: 'Astra',
    type: 'dog',
    breed: 'Německý ovčák',
    image: 'https://example.com/astra.jpg',
    age: 3,
    weight: 30,
    microchip: '985112009999999',
    healthStatus: 'healthy',
    dateOfBirth: '2022-01-01',
    neutered: false,
    publicDiscover: true,
    breedingProfile: true,
    breeding: {
      info: { kennelName: 'von Bohemia', registrationNumber: 'REG-PRIVATE' },
      titles: [{ id: 't1', name: 'CACIB' }],
      shows: [
        {
          id: 's1',
          name: 'Národní výstava',
          date: '2025-06-01',
          result: 'Výborná 1',
        },
      ],
      pedigree: [
        { id: 'p1', role: 'sire', name: 'Max' },
        { id: 'p2', role: 'dam', name: 'Bella' },
      ],
      litters: [{ id: 'l1', birthDate: '2024-03-01', totalCount: 5, notes: 'Zdravý vrh' }],
      healthTests: [
        { id: 'h1', name: 'HD', result: 'A', protocolNumber: 'PROTO-SECRET' },
      ],
    },
    emergencyCard: {
      publicSlug: 'astra',
      health: { allergies: 'Secret allergy', regularMedication: 'Secret med' },
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

function publicBreedingSettings(petId: string): PrivacySettings {
  return applyPublicDiscoverMigration(
    normalizePrivacySettings({
      account: {},
      pets: {
        [petId]: {
          name: 'public',
          photos: 'public',
          speciesBreed: 'public',
          ageDob: 'public',
          location: 'public',
          breeding: 'public',
          microchip: 'private',
          health: 'private',
          medications: 'private',
        },
      },
    }),
    [breedingPet({ id: petId })],
  )
}

console.log('KROK 24 – assert-professional-public-profile')

check('A – public projects; private returns null', () => {
  const pub = toPublicProfessionalProfile(basePro())
  assert.ok(pub)
  assert.equal(pub!.displayName, 'MUDr. Public Vet')
  assert.equal(pub!.city, 'Praha 2')
  assert.equal(pub!.hoursSummary, 'Po–Pá 8–18')
  assertPublicProfessionalSafe(pub!)

  const priv = toPublicProfessionalProfile(basePro({ publicVisibility: 'private' }))
  assert.equal(priv, null)
})

check('B – sensitive fields never in public projection', () => {
  const pub = toPublicProfessionalProfile(basePro())!
  const record = pub as unknown as Record<string, unknown>
  for (const key of [
    'address',
    'accountId',
    'professionalCredentials',
    'licenseNumber',
    'microchip',
    'ownerContacts',
    'health',
    'publicVisibility',
  ]) {
    assert.equal(key in record && record[key] != null, false, `must not include ${key}`)
  }
  assert.notEqual(pub.publicEmail, undefined)
  assert.ok(!JSON.stringify(pub).includes('LIC-SECRET'))
  assert.ok(!JSON.stringify(pub).includes('Tajná'))
})

check('C – verification badge only verified + trust (not DEMO)', () => {
  const profile = basePro({ verificationStatus: 'verified' })
  const demo: Verification = {
    id: 'v_demo',
    subjectType: 'professional',
    subjectId: profile.id,
    type: 'identity',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(hasProfessionalVerifiedBadge(profile, [demo]), false)
  const pubDemo = toPublicProfessionalProfile(profile, { verifications: [demo] })
  assert.equal(pubDemo?.verifiedBadge, undefined)

  const trust: Verification = {
    id: 'v_trust',
    subjectType: 'professional',
    subjectId: profile.id,
    type: 'identity',
    status: 'verified',
    source: 'identity_provider',
    presentation: 'trust',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(hasProfessionalVerifiedBadge(profile, [trust]), true)
  const pubTrust = toPublicProfessionalProfile(profile, { verifications: [trust] })
  assert.equal(pubTrust?.verifiedBadge, true)

  const pending = basePro({ verificationStatus: 'pending' })
  assert.equal(hasProfessionalVerifiedBadge(pending, [trust]), false)
})

check('D – trust items from real trust only', () => {
  const profile = basePro({ verificationStatus: 'verified' })
  assert.equal(listPublicProfessionalTrustItems(profile, []).length, 0)

  const items = listPublicProfessionalTrustItems(profile, [
    {
      id: 'v_pro',
      subjectType: 'professional',
      subjectId: profile.id,
      type: 'identity',
      status: 'verified',
      source: 'identity_provider',
      presentation: 'trust',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'v_email',
      subjectType: 'user',
      subjectId: SELF_OWNER_ID,
      type: 'email',
      status: 'verified',
      source: 'email_provider',
      presentation: 'trust',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'v_demo_phone',
      subjectType: 'user',
      subjectId: SELF_OWNER_ID,
      type: 'phone',
      status: 'verified',
      source: 'local_demo',
      presentation: 'demo',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  assert.equal(items.some((i) => i.id === 'professional'), true)
  assert.equal(items.some((i) => i.id === 'email'), true)
  assert.equal(items.some((i) => i.id === 'phone'), false)
  for (const item of items) {
    assert.equal('accountId' in item, false)
    assert.equal('metadata' in item, false)
  }
})

check('E – empty services/specializations stay absent', () => {
  const pub = toPublicProfessionalProfile(
    basePro({ services: [], specializations: undefined, description: undefined }),
  )!
  assert.equal(pub.services, undefined)
  assert.equal(pub.specializations, undefined)
  assert.equal(pub.description, undefined)
})

check('F – breeder + active public breeding → showcase', () => {
  const breeder = basePro({ id: 'pro_breeder', type: 'breeder', displayName: 'Chovatelská stanice' })
  const pet = breedingPet()
  const settings = publicBreedingSettings(pet.id)
  const showcase = toPublicBreederShowcase(breeder, [pet], {
    viewerAccountId: SELF_OWNER_ID,
    privacySettings: settings,
  })
  assert.ok(showcase)
  assert.ok(showcase!.animals.length >= 1)
  assert.equal(showcase!.animals[0]!.name, 'Astra')
  assert.ok(showcase!.kennelSummary?.includes('Bohemia'))
  assert.ok(showcase!.animals[0]!.breeding?.titles?.includes('CACIB'))
  assertPublicBreederShowcaseSafe(showcase!)
  const raw = JSON.stringify(showcase)
  assert.ok(!raw.includes('985112009999999'))
  assert.ok(!raw.includes('REG-PRIVATE'))
  assert.ok(!raw.includes('PROTO-SECRET'))
  assert.ok(!raw.includes('Secret allergy'))
  assert.ok(!raw.includes('healthTests'))
})

check('G – breeder without breeding data → null', () => {
  const breeder = basePro({ type: 'breeder' })
  const pet = breedingPet({
    breedingProfile: false,
    breeding: undefined,
  })
  const showcase = toPublicBreederShowcase(breeder, [pet], {
    viewerAccountId: SELF_OWNER_ID,
    privacySettings: publicBreedingSettings(pet.id),
  })
  assert.equal(showcase, null)
})

check('H – non-breeder → null showcase', () => {
  const vet = basePro({ type: 'veterinarian' })
  const pet = breedingPet()
  const showcase = toPublicBreederShowcase(vet, [pet], {
    viewerAccountId: SELF_OWNER_ID,
    privacySettings: publicBreedingSettings(pet.id),
  })
  assert.equal(showcase, null)
})

check('I – private breeding never in showcase; microchip blocked', () => {
  const breeder = basePro({ type: 'breeder' })
  const pet = breedingPet()
  const privateBreeding = normalizePrivacySettings({
    account: { ownerContacts: 'private' },
    pets: {
      [pet.id]: {
        name: 'public',
        photos: 'public',
        speciesBreed: 'public',
        ageDob: 'public',
        location: 'public',
        breeding: 'private',
        microchip: 'private',
      },
    },
  })
  const showcase = toPublicBreederShowcase(breeder, [pet], {
    viewerAccountId: SELF_OWNER_ID,
    privacySettings: privateBreeding,
  })
  assert.equal(showcase, null)
})

check('J – catalog uses same public projection', () => {
  memory.clear()
  const profile = basePro({ id: 'pro_cat_same' })
  memory.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
  const trust: Verification[] = [
    {
      id: 'v1',
      subjectType: 'professional',
      subjectId: profile.id,
      type: 'identity',
      status: 'verified',
      source: 'identity_provider',
      presentation: 'trust',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    },
  ]
  const verifiedProfile = { ...profile, verificationStatus: 'verified' as const }
  memory.setItem('lovedandknown.professionalProfiles', JSON.stringify([verifiedProfile]))
  const listed = listPublicProfessionals(trust)
  const detail = toPublicProfessionalProfile(verifiedProfile, { verifications: trust })
  assert.ok(detail)
  const match = listed.find((p) => p.id === verifiedProfile.id)
  assert.ok(match)
  assert.deepEqual(match, detail)
})

check('K – foreign account pets never in showcase', () => {
  const foreignBreeder = basePro({
    type: 'breeder',
    accountId: 'other_account',
  })
  const pet = breedingPet()
  const showcase = toPublicBreederShowcase(foreignBreeder, [pet], {
    viewerAccountId: SELF_OWNER_ID,
    privacySettings: publicBreedingSettings(pet.id),
  })
  assert.equal(showcase, null)
})

console.log(`\nPassed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
