/**
 * Assert verification / trust model (KROK 16).
 * Run: npx tsx scripts/assert-verification.mts
 *
 * A – unverified profile has no trust badge
 * B – verified email shows only email verification
 * C – verified phone shows only phone verification
 * D – revoked/expired not shown as active
 * E – public payload has no sensitive verification metadata
 * F – microchip never in public payload
 * G – breeding verification only with active breeding profile
 * H – verification states survive reload (storage round-trip)
 * I – no hardcoded verified=true in production projection
 * J – mock/demo verification not presented as real trust
 */
import assert from 'node:assert/strict'
import { projectOwnedPetToDiscover } from '../src/lib/discover/fromOwnedPet.ts'
import { sanitizeDiscoverPet } from '../src/lib/discover/privacy.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { defaultPrivacySettings, projectPublicPet } from '../src/lib/privacy/index.ts'
import {
  applyBreedingEvaluation,
  createDemoEmailVerification,
  createTrustEmailVerification,
  createTrustIdentityVerification,
  createTrustPetVerification,
  createTrustPhoneVerification,
  evaluateBreedingVerification,
  isActiveTrustVerification,
  normalizeVerifications,
  toPublicTrustBadges,
  type Verification,
} from '../src/lib/verification/index.ts'
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
    microchipVerification: {
      status: 'found',
      verifiedAt: '2026-01-01T12:00:00.000Z',
      mode: 'dev_mock',
      chipNumber: '985112004567890',
    },
    healthStatus: 'healthy',
    dateOfBirth: '2020-05-01',
    publicDiscover: true,
    neutered: false,
    breedingProfile: false,
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

const publicPrivacy = (() => {
  const s = defaultPrivacySettings()
  return {
    ...s,
    pets: {
      luna: {
        name: 'public' as const,
        photos: 'public' as const,
        speciesBreed: 'public' as const,
        ageDob: 'public' as const,
        location: 'public' as const,
        breeding: 'public' as const,
      },
    },
  }
})()

console.log('\nKROK 16 — Verification / trust\n')

check('A – unverified profile has no verified trust badge', () => {
  const pet = basePet()
  const projected = projectOwnedPetToDiscover(pet, [], {
    privacySettings: publicPrivacy,
    verifications: [],
  })
  assert.ok(projected)
  assert.equal(projected.publicTrustBadges?.length ?? 0, 0)
  assert.equal('verified' in projected, false)
})

check('B – verified email shows only email verification', () => {
  const email = createTrustEmailVerification({
    userId: SELF_OWNER_ID,
    nowIso: '2026-03-01T10:00:00.000Z',
  })
  const badges = toPublicTrustBadges([email], {
    petId: 'luna',
    ownerId: SELF_OWNER_ID,
  })
  assert.equal(badges.length, 1)
  assert.equal(badges[0]?.type, 'email')
  assert.equal(badges[0]?.label, 'Ověřený e-mail')

  const projected = projectOwnedPetToDiscover(basePet(), [], {
    privacySettings: publicPrivacy,
    verifications: [email],
  })
  assert.ok(projected)
  assert.deepEqual(
    projected.publicTrustBadges?.map((b) => b.type),
    ['email'],
  )
})

check('C – verified phone shows only phone verification', () => {
  const phone = createTrustPhoneVerification({
    userId: SELF_OWNER_ID,
    nowIso: '2026-03-01T10:00:00.000Z',
  })
  const badges = toPublicTrustBadges([phone], {
    petId: 'luna',
    ownerId: SELF_OWNER_ID,
  })
  assert.equal(badges.length, 1)
  assert.equal(badges[0]?.type, 'phone')

  const projected = projectOwnedPetToDiscover(basePet(), [], {
    privacySettings: publicPrivacy,
    verifications: [phone],
  })
  assert.ok(projected)
  assert.deepEqual(
    projected.publicTrustBadges?.map((b) => b.type),
    ['phone'],
  )
})

check('D – revoked/expired verification is not active', () => {
  const revoked: Verification = {
    ...createTrustEmailVerification({ userId: SELF_OWNER_ID }),
    status: 'revoked',
  }
  const expired: Verification = {
    ...createTrustPhoneVerification({ userId: SELF_OWNER_ID }),
    status: 'verified',
    expiresAt: '2020-01-01T00:00:00.000Z',
  }
  assert.equal(isActiveTrustVerification(revoked), false)
  assert.equal(isActiveTrustVerification(expired), false)
  const badges = toPublicTrustBadges([revoked, expired], {
    petId: 'luna',
    ownerId: SELF_OWNER_ID,
  })
  assert.equal(badges.length, 0)
})

check('E – public payload has no sensitive verification metadata', () => {
  const email = createTrustEmailVerification({
    userId: SELF_OWNER_ID,
    metadata: {
      providerPayload: { secret: 'x' },
      emailHint: 'te***cz',
      documentIds: ['doc1'],
    },
  })
  const projected = projectPublicPet(basePet(), {
    settings: publicPrivacy,
    verifications: [email],
  })
  assert.ok(projected)
  const json = JSON.stringify(projected)
  assert.equal(json.includes('providerPayload'), false)
  assert.equal(json.includes('documentIds'), false)
  assert.equal(json.includes('emailHint'), false)
  assert.equal(json.includes('metadata'), false)
  assert.equal('verifications' in projected, false)

  const dirty = {
    ...projected,
    verifications: [email],
    metadata: { secret: true },
    providerPayload: { a: 1 },
  }
  const sanitized = sanitizeDiscoverPet(dirty)
  assert.ok(sanitized)
  const sJson = JSON.stringify(sanitized)
  assert.equal(sJson.includes('verifications'), false)
  assert.equal(sJson.includes('providerPayload'), false)
  assert.equal(sJson.includes('"metadata"'), false)
})

check('F – microchip never appears in public payload', () => {
  const pet = basePet({
    microchip: '985112004567890',
    microchipVerification: {
      status: 'found',
      verifiedAt: '2026-01-01T12:00:00.000Z',
      mode: 'dev_mock',
      chipNumber: '985112004567890',
    },
  })
  const projected = projectOwnedPetToDiscover(pet, [], {
    privacySettings: publicPrivacy,
    verifications: [],
  })
  assert.ok(projected)
  const json = JSON.stringify(projected)
  assert.equal(json.includes('985112004567890'), false)
  assert.equal(json.includes('microchip'), false)
  assert.equal(json.includes('chipNumber'), false)
  // Microchip found must NOT imply trust badges / verified pet
  assert.equal(projected.publicTrustBadges?.length ?? 0, 0)
})

check('G – breeding verification only for active breeding profile', () => {
  const identity = createTrustIdentityVerification({ userId: SELF_OWNER_ID })
  const petVer = createTrustPetVerification({ petId: 'luna' })
  const inactive = basePet({ breedingProfile: false, neutered: false })
  const evalInactive = evaluateBreedingVerification(inactive, [identity, petVer])
  assert.equal(evalInactive.eligible, false)
  assert.equal(evalInactive.verification, null)

  const active = basePet({ breedingProfile: true, neutered: false })
  const evalActive = evaluateBreedingVerification(active, [identity, petVer])
  assert.equal(evalActive.eligible, true)
  assert.ok(evalActive.verification)
  assert.equal(evalActive.verification?.type, 'breeding')
  assert.equal(evalActive.verification?.source, 'breeding_composite')
  assert.equal(evalActive.verification?.presentation, 'trust')

  const list = applyBreedingEvaluation([identity, petVer], active)
  const badges = toPublicTrustBadges(list, { petId: 'luna', ownerId: SELF_OWNER_ID })
  assert.ok(badges.some((b) => b.type === 'breeding'))
  assert.ok(badges.some((b) => b.type === 'pet'))

  // Neutered / inactive breeding clears eligibility even with sub-verifications
  const neutered = basePet({ breedingProfile: true, neutered: true })
  const evalNeutered = evaluateBreedingVerification(neutered, [identity, petVer])
  assert.equal(evalNeutered.eligible, false)
})

check('H – verification states survive reload (normalize round-trip)', () => {
  const original: Verification[] = [
    createTrustEmailVerification({
      userId: SELF_OWNER_ID,
      nowIso: '2026-04-01T08:00:00.000Z',
      metadata: { keepPrivate: true },
    }),
    createDemoEmailVerification({ email: 'demo@example.cz' }),
  ]
  const reloaded = normalizeVerifications(JSON.parse(JSON.stringify(original)))
  assert.equal(reloaded.length, 2)
  assert.equal(reloaded[0]?.type, 'email')
  assert.equal(reloaded[0]?.status, 'verified')
  assert.equal(reloaded[0]?.presentation, 'trust')
  assert.equal(reloaded[0]?.verifiedAt, '2026-04-01T08:00:00.000Z')
  assert.equal(reloaded[1]?.presentation, 'demo')
  assert.equal(reloaded[1]?.source, 'local_demo')
  assert.deepEqual(reloaded[0]?.metadata, { keepPrivate: true })
})

check('I – no hardcoded verified=true in production projection', () => {
  const pet = basePet({
    microchipVerification: {
      status: 'found',
      verifiedAt: '2026-01-01T12:00:00.000Z',
      mode: 'live',
      chipNumber: '985112004567890',
    },
  })
  const projected = projectPublicPet(pet, {
    settings: publicPrivacy,
    verifications: [],
  })
  assert.ok(projected)
  assert.equal((projected as { verified?: boolean }).verified, undefined)
  assert.equal('verified' in projected, false)
  const sanitized = sanitizeDiscoverPet({ ...projected, verified: true })
  assert.ok(sanitized)
  assert.equal((sanitized as { verified?: boolean }).verified, undefined)
})

check('J – mock/demo verification cannot present as real trust', () => {
  const demo = createDemoEmailVerification({ email: 'tereza@example.cz' })
  assert.equal(demo.presentation, 'demo')
  assert.equal(demo.source, 'local_demo')
  assert.equal(isActiveTrustVerification(demo), false)
  const badges = toPublicTrustBadges([demo], {
    petId: 'luna',
    ownerId: SELF_OWNER_ID,
  })
  assert.equal(badges.length, 0)

  const projected = projectOwnedPetToDiscover(basePet(), [], {
    privacySettings: publicPrivacy,
    verifications: [demo],
  })
  assert.ok(projected)
  assert.equal(projected.publicTrustBadges?.length ?? 0, 0)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
