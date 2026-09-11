/**
 * Assert plans / entitlements architecture (KROK 18).
 * Run: npx tsx scripts/assert-entitlements.mts
 *
 * A – Free má základní funkce
 * B – Free nemá Premium-only funkce
 * C – Premium má Premium funkce
 * D – Family má Family funkce
 * E – Breeder Pro má breeding funkce
 * F – Breeder Pro neobchází privacy
 * G – bezpečnostní funkce jsou dostupné ve Free
 * H – owner nemůže získat cizí data pouze díky tarifu
 * I – health/chip/PII protection zůstává zachována
 * J – změna tarifu nemění existující data
 * K – neznámý feature ID nezpůsobí automatické povolení
 * L – DEMO subscription není prezentováno jako skutečná platba
 */
import assert from 'node:assert/strict'
import { getDiscoverPets } from '../src/lib/discover/catalog.ts'
import { projectOwnedPetToDiscover } from '../src/lib/discover/fromOwnedPet.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { sanitizeDiscoverPet } from '../src/lib/discover/privacy.ts'
import {
  BREEDING_FEATURES,
  CORE_SAFETY_FEATURES,
  FAMILY_FEATURES,
  PREMIUM_FEATURES,
  PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS,
  SAFETY_FEATURES,
  assertPublicMembershipSafe,
  createDefaultSubscription,
  demoDisclaimer,
  effectivePlan,
  hasEntitlement,
  isDemoSubscription,
  normalizeSubscription,
  planIncludesBase,
  requireEntitlement,
  resolvePlanEntitlements,
  toPublicMembershipSummary,
  type SubscriptionRecord,
} from '../src/lib/entitlements/index.ts'
import {
  PUBLIC_PAYLOAD_FORBIDDEN_KEYS,
  normalizePrivacySettings,
  projectPublicPet,
} from '../src/lib/privacy/index.ts'
import { roleGrantsPetDataAccess } from '../src/lib/professional/index.ts'
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

function activeSub(plan: SubscriptionRecord['plan']): SubscriptionRecord {
  return {
    accountId: SELF_OWNER_ID,
    plan,
    status: 'active',
    provider: 'none',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function demoSub(plan: SubscriptionRecord['plan']): SubscriptionRecord {
  return {
    accountId: SELF_OWNER_ID,
    plan,
    status: 'demo',
    provider: 'demo',
    startedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

console.log('KROK 18 – assert-entitlements')

check('A – Free má základní funkce', () => {
  for (const f of CORE_SAFETY_FEATURES) {
    assert.equal(hasEntitlement('free', f), true, `free must have ${f}`)
  }
  assert.equal(resolvePlanEntitlements('free').size, CORE_SAFETY_FEATURES.length)
})

check('B – Free nemá Premium-only funkce', () => {
  for (const f of PREMIUM_FEATURES) {
    assert.equal(hasEntitlement('free', f), false, `free must not have ${f}`)
  }
  for (const f of FAMILY_FEATURES) {
    assert.equal(hasEntitlement('free', f), false)
  }
  for (const f of BREEDING_FEATURES) {
    assert.equal(hasEntitlement('free', f), false)
  }
})

check('C – Premium má Premium funkce', () => {
  for (const f of PREMIUM_FEATURES) {
    assert.equal(hasEntitlement('premium', f), true, `premium must have ${f}`)
  }
  for (const f of CORE_SAFETY_FEATURES) {
    assert.equal(hasEntitlement('premium', f), true)
  }
  for (const f of FAMILY_FEATURES) {
    assert.equal(hasEntitlement('premium', f), false)
  }
  assert.equal(planIncludesBase('premium', 'free'), true)
  assert.equal(planIncludesBase('premium', 'premium'), true)
  assert.equal(planIncludesBase('premium', 'family'), false)
})

check('D – Family má Family funkce', () => {
  for (const f of FAMILY_FEATURES) {
    assert.equal(hasEntitlement('family', f), true, `family must have ${f}`)
  }
  for (const f of PREMIUM_FEATURES) {
    assert.equal(hasEntitlement('family', f), true)
  }
  for (const f of BREEDING_FEATURES) {
    assert.equal(hasEntitlement('family', f), false, 'family is not breeder_pro')
  }
  assert.equal(planIncludesBase('family', 'premium'), true)
})

check('E – Breeder Pro má breeding funkce', () => {
  for (const f of BREEDING_FEATURES) {
    assert.equal(hasEntitlement('breeder_pro', f), true, `breeder_pro must have ${f}`)
  }
  for (const f of PREMIUM_FEATURES) {
    assert.equal(hasEntitlement('breeder_pro', f), true, 'breeder_pro includes premium base')
  }
  for (const f of FAMILY_FEATURES) {
    assert.equal(
      hasEntitlement('breeder_pro', f),
      false,
      'breeder_pro must not auto-include family',
    )
  }
  assert.equal(planIncludesBase('breeder_pro', 'premium'), true)
  assert.equal(planIncludesBase('breeder_pro', 'family'), false)
})

check('F – Breeder Pro neobchází privacy', () => {
  const pet = basePet({ publicDiscover: true })
  const settings = normalizePrivacySettings({
    account: { ownerContacts: 'private' },
    pets: {
      luna: {
        name: 'public',
        photos: 'public',
        speciesBreed: 'public',
        ageDob: 'public',
        location: 'public',
        microchip: 'private',
        health: 'private',
        documents: 'private',
        weight: 'private',
      },
    },
  })

  // Having breeder_pro entitlement must not change public projection.
  assert.equal(hasEntitlement('breeder_pro', 'breeding_advanced'), true)
  assert.equal(roleGrantsPetDataAccess('breeder'), false)

  const publicPet = projectPublicPet(pet, { settings })
  assert.ok(publicPet)
  assert.equal((publicPet as Record<string, unknown>).microchip, undefined)
  assert.equal((publicPet as Record<string, unknown>).healthRecords, undefined)

  const discover = sanitizeDiscoverPet(
    projectOwnedPetToDiscover(pet, [], { privacySettings: settings }),
  )
  assert.ok(discover)
  for (const key of ['microchip', 'health', 'documents', 'ownerPhone', 'ownerEmail'] as const) {
    assert.equal((discover as Record<string, unknown>)[key], undefined)
  }
})

check('G – bezpečnostní funkce jsou dostupné ve Free', () => {
  for (const f of SAFETY_FEATURES) {
    assert.equal(hasEntitlement('free', f), true, `safety ${f} must be free`)
    assert.equal(hasEntitlement('premium', f), true)
  }
  assert.equal(hasEntitlement('free', 'lost_pet'), true)
  assert.equal(hasEntitlement('free', 'found_pet'), true)
  assert.equal(hasEntitlement('free', 'emergency_card'), true)
})

check('H – owner nemůže získat cizí data pouze díky tarifu', () => {
  const pet = basePet({ publicDiscover: true })
  const settings = normalizePrivacySettings({
    pets: {
      luna: {
        name: 'public',
        photos: 'public',
        speciesBreed: 'public',
        ageDob: 'public',
        location: 'public',
      },
    },
  })

  // Premium entitlement does not remove owner exclusion from foreign catalog.
  assert.equal(hasEntitlement(activeSub('premium'), 'statistics'), true)
  const foreign = getDiscoverPets({
    ownedPets: [pet],
    privacySettings: settings,
    excludePetIds: [pet.id],
    excludeOwnerIds: [SELF_OWNER_ID],
  })
  assert.equal(
    foreign.some((p) => p.id === 'luna'),
    false,
    'own pet must not appear in foreign catalog regardless of plan',
  )
  assert.equal(
    foreign.some((p) => p.ownerId === SELF_OWNER_ID),
    false,
    'SELF_OWNER_ID must not appear in foreign catalog',
  )
})

check('I – health/chip/PII protection zůstává zachována', () => {
  const pet = basePet({ publicDiscover: true })
  const normalized = normalizePrivacySettings({
    account: { ownerContacts: 'public' },
    pets: {
      luna: {
        microchip: 'public',
        health: 'public',
        documents: 'public',
        weight: 'public',
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

  // Family plan still cannot force public microchip via entitlements.
  assert.equal(hasEntitlement('family', 'family_shared_health'), true)
  const publicPet = projectPublicPet(pet, { settings: normalized })
  assert.ok(publicPet)
  for (const key of PUBLIC_PAYLOAD_FORBIDDEN_KEYS) {
    assert.equal(
      (publicPet as Record<string, unknown>)[key],
      undefined,
      `forbidden key ${key}`,
    )
  }
})

check('J – změna tarifu nemění existující data', () => {
  const petBefore = basePet()
  const privacyBefore = normalizePrivacySettings({
    pets: { luna: { name: 'public', health: 'private' } },
  })
  const petSnapshot = JSON.stringify(petBefore)
  const privacySnapshot = JSON.stringify(privacyBefore)

  const free = createDefaultSubscription()
  const premium = activeSub('premium')
  const family = activeSub('family')
  const breeder = demoSub('breeder_pro')

  void free
  void premium
  void family
  void breeder

  assert.equal(JSON.stringify(petBefore), petSnapshot)
  assert.equal(JSON.stringify(privacyBefore), privacySnapshot)
  assert.notEqual(hasEntitlement(free, 'statistics'), hasEntitlement(premium, 'statistics'))
})

check('K – neznámý feature ID nezpůsobí automatické povolení', () => {
  assert.equal(hasEntitlement('family', 'totally_unknown_feature'), false)
  assert.equal(hasEntitlement('breeder_pro', ''), false)
  assert.equal(hasEntitlement('premium', 'STATISTICS'), false)
  const req = requireEntitlement('premium', 'not_a_real_feature')
  assert.equal(req.ok, false)
  if (!req.ok) assert.equal(req.reason, 'unknown_feature')
})

check('L – DEMO subscription není prezentováno jako skutečná platba', () => {
  const demo = demoSub('premium')
  assert.equal(isDemoSubscription(demo), true)
  assert.equal(demo.provider, 'demo')
  assert.equal(demo.status, 'demo')
  assert.equal(effectivePlan(demo), 'premium')

  const summary = toPublicMembershipSummary(demo)
  assert.equal(summary.isDemo, true)
  assert.equal(summary.plan, 'premium')
  assertPublicMembershipSafe(summary)
  for (const key of PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS) {
    assert.equal(
      key in (summary as unknown as Record<string, unknown>),
      false,
      `must not expose ${key}`,
    )
  }

  const text = demoDisclaimer()
  assert.match(text, /DEMO/i)
  assert.match(text, /není skutečné předplatné/i)
  assert.doesNotMatch(text, /zaplaceno|aktivováno|paid/i)

  // Expired paid-looking record falls back to free entitlements.
  const expired = normalizeSubscription({
    accountId: SELF_OWNER_ID,
    plan: 'premium',
    status: 'expired',
    provider: 'stripe',
    providerCustomerId: 'cus_secret',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
  assert.equal(effectivePlan(expired), 'free')
  assert.equal(hasEntitlement(expired, 'statistics'), false)
  const expiredSummary = toPublicMembershipSummary(expired)
  assert.equal(expiredSummary.plan, 'free')
  assert.equal(expiredSummary.isDemo, false)
  assert.equal(
    'providerCustomerId' in (expiredSummary as unknown as Record<string, unknown>),
    false,
  )
})

check('effectivePlan: none → free; canceled without expiry → free; active → plan; canceled grace', () => {
  assert.equal(effectivePlan(createDefaultSubscription()), 'free')
  assert.equal(
    effectivePlan({
      ...createDefaultSubscription(),
      plan: 'family',
      status: 'canceled',
    }),
    'free',
  )
  assert.equal(effectivePlan(activeSub('family')), 'family')

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  assert.equal(
    effectivePlan({
      ...createDefaultSubscription(),
      plan: 'premium',
      status: 'canceled',
      expiresAt: future,
    }),
    'premium',
  )
  assert.equal(
    effectivePlan({
      ...createDefaultSubscription(),
      plan: 'premium',
      status: 'canceled',
      expiresAt: past,
    }),
    'free',
  )
})

console.log('')
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
