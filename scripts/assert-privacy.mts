/**
 * Assert central privacy model + public projection (KROK 15).
 * Run: npx tsx scripts/assert-privacy.mts
 *
 * A – private field not in public payload
 * B – connections field not visible to public viewer
 * C – public field available in public profile projection
 * E – chip/health/PII never leak into Discover
 * F – owner/self not in foreign Discover catalog
 * G – new sensitive field defaults to private
 */
import assert from 'node:assert/strict'
import { getDiscoverPets } from '../src/lib/discover/catalog.ts'
import { projectOwnedPetToDiscover } from '../src/lib/discover/fromOwnedPet.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { sanitizeDiscoverPet } from '../src/lib/discover/privacy.ts'
import {
  canViewPetField,
  clampLevel,
  defaultPrivacySettings,
  getPetFieldLevel,
  normalizePrivacySettings,
  projectForViewer,
  projectPublicPet,
  PUBLIC_PAYLOAD_FORBIDDEN_KEYS,
  type PrivacySettings,
} from '../src/lib/privacy/index.ts'
import type { Pet } from '../src/types/index.ts'

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

function settingsWith(
  petId: string,
  fields: PrivacySettings['pets'][string],
  account: PrivacySettings['account'] = {},
): PrivacySettings {
  return normalizePrivacySettings({
    account,
    pets: { [petId]: fields },
  })
}

console.log('KROK 15 – assert-privacy')

check('G – new sensitive field defaults to private', () => {
  const settings = defaultPrivacySettings()
  assert.equal(getPetFieldLevel(settings, 'any-new-pet', 'microchip'), 'private')
  assert.equal(getPetFieldLevel(settings, 'any-new-pet', 'health'), 'private')
  assert.equal(getPetFieldLevel(settings, 'any-new-pet', 'weight'), 'private')
  assert.equal(getPetFieldLevel(settings, 'any-new-pet', 'allergies'), 'private')
  assert.equal(getPetFieldLevel(settings, 'any-new-pet', 'medications'), 'private')
  assert.equal(getPetFieldLevel(settings, 'any-new-pet', 'documents'), 'private')
  assert.equal(clampLevel('public', 'connections'), 'connections')
})

check('A – private field absent from public payload', () => {
  const pet = basePet()
  const settings = settingsWith('luna', {
    name: 'public',
    photos: 'public',
    speciesBreed: 'public',
    ageDob: 'public',
    location: 'public',
    breeding: 'private',
    weight: 'private',
    microchip: 'private',
  })
  const pub = projectPublicPet(pet, { settings })
  assert.ok(pub)
  assert.equal(pub!.name, 'Luna')
  assert.equal('weight' in pub!, false)
  assert.equal('microchip' in pub!, false)
  assert.equal(pub!.breeding, undefined)
  assert.equal(pub!.breedingProfile, undefined)

  const conn = projectForViewer(pet, 'public', { settings })
  assert.ok(conn)
  assert.equal(conn!.weight, undefined)
  assert.equal(conn!.microchip, undefined)
})

check('B – connections field not visible to unconnected (public) viewer', () => {
  const pet = basePet()
  const settings = settingsWith('luna', {
    name: 'public',
    photos: 'public',
    speciesBreed: 'public',
    ageDob: 'public',
    location: 'public',
    weight: 'connections',
    microchip: 'connections',
    health: 'connections',
    allergies: 'connections',
  })

  assert.equal(canViewPetField(settings, 'luna', 'weight', 'public'), false)
  assert.equal(canViewPetField(settings, 'luna', 'weight', 'connection'), true)
  assert.equal(canViewPetField(settings, 'luna', 'microchip', 'connection'), true)

  const asPublic = projectForViewer(pet, 'public', { settings })
  assert.equal(asPublic?.weight, undefined)
  assert.equal(asPublic?.microchip, undefined)
  assert.equal(asPublic?.allergies, undefined)

  const asConnection = projectForViewer(pet, 'connection', { settings })
  assert.equal(asConnection?.weight, 28)
  assert.equal(asConnection?.microchip, '985112004567890')
  assert.equal(asConnection?.allergies, 'Kuřecí bílkovina')
})

check('C – public field available in public profile projection', () => {
  const pet = basePet({ bio: 'Miluje plavání' })
  const settings = settingsWith('luna', {
    name: 'public',
    photos: 'public',
    speciesBreed: 'public',
    ageDob: 'public',
    location: 'public',
    breeding: 'public',
  })
  const pub = projectPublicPet(pet, { settings })
  assert.ok(pub)
  assert.equal(pub!.name, 'Luna')
  assert.equal(pub!.breed, 'Zlatý retrívr')
  assert.equal(pub!.age, 4)
  assert.equal(typeof pub!.location, 'string')
  assert.ok(pub!.location.length > 0)
  assert.equal(pub!.image, 'https://example.com/luna.jpg')
  assert.equal(pub!.bio, 'Miluje plavání')
})

check('E – chip/health/PII never in Discover sanitize or projection', () => {
  const pet = basePet()
  const settings = settingsWith('luna', {
    name: 'public',
    photos: 'public',
    speciesBreed: 'public',
    ageDob: 'public',
    location: 'public',
    // Attempt to set forbidden fields as high as allowed — still must not hit Discover
    microchip: 'connections',
    health: 'connections',
    weight: 'connections',
  })

  const projected = projectOwnedPetToDiscover(pet, [], { privacySettings: settings })
  assert.ok(projected)
  for (const key of PUBLIC_PAYLOAD_FORBIDDEN_KEYS) {
    assert.equal(
      key in (projected as unknown as Record<string, unknown>),
      false,
      `forbidden key leaked: ${key}`,
    )
  }
  assert.equal(
    JSON.stringify(projected).includes('985112'),
    false,
    'chip number must not appear in Discover JSON',
  )
  assert.equal(JSON.stringify(projected).toLowerCase().includes('apoquel'), false)

  const dirty = {
    ...projected,
    microchip: '985112004567890',
    weight: 28,
    phone: '+420777111222',
    email: 'owner@example.com',
    healthStatus: 'healthy',
  }
  const sanitized = sanitizeDiscoverPet(dirty)
  assert.ok(sanitized)
  assert.equal('microchip' in sanitized!, false)
  assert.equal('weight' in sanitized!, false)
  assert.equal('phone' in sanitized!, false)
  assert.equal('email' in sanitized!, false)
  assert.equal('healthStatus' in sanitized!, false)
})

check('F – owner/self profile excluded from foreign Discover catalog', () => {
  const pet = basePet({ publicDiscover: true })
  const settings = settingsWith('luna', {
    name: 'public',
    photos: 'public',
    speciesBreed: 'public',
    ageDob: 'public',
    location: 'public',
  })
  const foreign = getDiscoverPets({
    ownedPets: [pet],
    privacySettings: settings,
    excludePetIds: [pet.id],
    excludeOwnerIds: [SELF_OWNER_ID],
  })
  assert.equal(
    foreign.some((p) => p.id === 'luna'),
    false,
    'own pet must not appear in foreign catalog',
  )
  assert.equal(
    foreign.some((p) => p.ownerId === SELF_OWNER_ID),
    false,
    'SELF_OWNER_ID must not appear in foreign catalog',
  )
})

check('G/extra – clamp refuses public for hard-ceiling fields', () => {
  const normalized = normalizePrivacySettings({
    account: { ownerContacts: 'public' },
    pets: {
      luna: {
        microchip: 'public',
        health: 'public',
        weight: 'public',
        documents: 'public',
      },
    },
  })
  assert.equal(normalized.account.ownerContacts, 'connections')
  assert.equal(normalized.pets.luna.microchip, 'connections')
  assert.equal(normalized.pets.luna.health, 'connections')
  assert.equal(normalized.pets.luna.weight, 'connections')
  assert.equal(normalized.pets.luna.documents, 'connections')
})

check('privateDiscover still blocks projection', () => {
  const pet = basePet({ publicDiscover: false })
  const settings = settingsWith('luna', {
    name: 'public',
    photos: 'public',
    speciesBreed: 'public',
    ageDob: 'public',
    location: 'public',
  })
  assert.equal(projectPublicPet(pet, { settings }), null)
  assert.equal(projectOwnedPetToDiscover(pet, [], { privacySettings: settings }), null)
})

// --- KROK 39 — Discover hardening ---

const publicIdentity = {
  name: 'public' as const,
  photos: 'public' as const,
  speciesBreed: 'public' as const,
  ageDob: 'public' as const,
  location: 'public' as const,
}

check('K39 – public gallery included when petPhotos provided', () => {
  const pet = basePet()
  const settings = settingsWith('luna', publicIdentity)
  const projected = projectPublicPet(pet, {
    settings,
    petPhotos: [
      { id: 'ph1', petId: 'luna', url: 'https://example.com/a.jpg', caption: 'Park' },
      { id: 'ph2', petId: 'other', url: 'https://example.com/other.jpg' },
      { id: 'ph3', petId: 'luna', url: '  ' },
    ],
  })
  assert.ok(projected)
  assert.equal(projected!.gallery?.length, 1)
  assert.equal(projected!.gallery![0].id, 'ph1')
  assert.equal(projected!.gallery![0].caption, 'Park')
})

check('K39 – private gallery excluded when petPhotos omitted', () => {
  const pet = basePet()
  const settings = settingsWith('luna', publicIdentity)
  const projected = projectPublicPet(pet, { settings })
  assert.ok(projected)
  assert.equal(projected!.gallery, undefined)
  assert.equal(projected!.publicTimeline, undefined)
  assert.equal(projected!.activities, undefined)
})

check('K39 – owned timeline / activities never projected (extension point)', () => {
  const pet = basePet()
  const settings = settingsWith('luna', publicIdentity)
  const projected = projectOwnedPetToDiscover(pet, [], { privacySettings: settings })
  assert.ok(projected)
  assert.equal(projected!.publicTimeline, undefined)
  assert.equal(projected!.activities, undefined)
  // Medical / health tokens must never appear via owned projection
  const json = JSON.stringify(projected)
  assert.equal(json.includes('medications'), false)
  assert.equal(json.includes('healthRecords'), false)
  assert.equal(json.includes('Apoquel'), false)
})

check('K39 – breeding profile included when active + public breeding privacy', () => {
  const pet = basePet({
    breedingProfile: true,
    breeding: {
      info: { kennelName: 'Golden Heart' },
      titles: [{ id: 't1', name: 'CAJC' }],
      healthTests: [{ id: 'ht1', name: 'HD', result: 'A/A', date: '2024-01-01' }],
      matings: [{ id: 'm1', date: '2024-06-01', partnerName: 'Secret' }],
    },
  })
  const settings = settingsWith('luna', { ...publicIdentity, breeding: 'public' })
  const projected = projectOwnedPetToDiscover(pet, [], { privacySettings: settings })
  assert.ok(projected)
  assert.equal(projected!.breedingProfile, true)
  assert.ok(projected!.breeding)
  assert.equal(projected!.breeding!.status?.includes('Golden Heart'), true)
  assert.deepEqual(projected!.breeding!.titles, ['CAJC'])
  const json = JSON.stringify(projected)
  assert.equal(json.includes('healthTests'), false)
  assert.equal(json.includes('HD'), false)
  assert.equal(json.includes('matings'), false)
  assert.equal(json.includes('Secret'), false)
})

check('K39 – inactive breeding profile excluded', () => {
  const pet = basePet({
    breedingProfile: false,
    breeding: {
      info: { kennelName: 'Hidden Kennel' },
      titles: [{ id: 't1', name: 'CAJC' }],
    },
  })
  const settings = settingsWith('luna', { ...publicIdentity, breeding: 'public' })
  const projected = projectPublicPet(pet, { settings })
  assert.ok(projected)
  assert.equal(projected!.breedingProfile, undefined)
  assert.equal(projected!.breeding, undefined)
})

check('K39 – catalog with petPhotos projects owned gallery', () => {
  const pet = basePet()
  const settings = settingsWith('luna', publicIdentity)
  const catalog = getDiscoverPets({
    ownedPets: [pet],
    privacySettings: settings,
    petPhotos: [
      { id: 'ph_luna_1', petId: 'luna', url: 'https://example.com/luna-g.jpg', caption: 'Park' },
    ],
    excludePetIds: [],
  })
  const luna = catalog.find((p) => p.id === 'luna')
  assert.ok(luna)
  assert.equal(luna!.gallery?.length, 1)
  assert.equal(luna!.gallery![0].url, 'https://example.com/luna-g.jpg')
})

check('K39 – single projection path (sanitize after projectPublicPet)', () => {
  const pet = basePet({
    breedingProfile: true,
    breeding: { info: { kennelName: 'Solo' } },
  })
  const settings = settingsWith('luna', { ...publicIdentity, breeding: 'public' })
  const a = projectPublicPet(pet, {
    settings,
    petPhotos: [{ id: 'x', petId: 'luna', url: 'https://example.com/x.jpg' }],
  })
  const b = projectOwnedPetToDiscover(pet, [], {
    privacySettings: settings,
    petPhotos: [{ id: 'x', petId: 'luna', url: 'https://example.com/x.jpg' }],
  })
  assert.ok(a && b)
  assert.equal(a!.id, b!.id)
  assert.equal(a!.gallery?.length, b!.gallery?.length)
  assert.equal(b!.breedingProfile, true)
})

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
