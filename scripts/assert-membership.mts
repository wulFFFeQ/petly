/**
 * Assert membership / billing foundation (KROK 27).
 * Run: npx tsx scripts/assert-membership.mts
 *
 * A – default FREE
 * B – Premium effectivePlan
 * C – Family effectivePlan
 * D – Breeder Pro effectivePlan
 * E – unknown entitlement → false
 * F – expired subscription → FREE
 * G – canceled before expiry → stále aktivní do expiresAt
 * H – canceled after expiry → FREE
 * I – DEMO není trust/paid
 * J – safety entitlements vždy dostupné
 * K – breeder gating
 * L – privacy subscription fields
 * M – upgrade prompt suggested plans (no raw IDs in plan labels)
 * N – reload persistence (normalize round-trip)
 * O – pricing config consistency
 */
import assert from 'node:assert/strict'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { DemoSubscriptionProvider } from '../src/lib/billing/index.ts'
import {
  PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS,
  SAFETY_FEATURES,
  assertPublicMembershipSafe,
  createDefaultSubscription,
  demoDisclaimer,
  effectivePlan,
  getPlanMeta,
  hasEntitlement,
  isDemoSubscription,
  normalizeSubscription,
  suggestedPlanForFeature,
  toPublicMembershipSummary,
  type SubscriptionRecord,
} from '../src/lib/entitlements/index.ts'
import {
  BREEDER_PRO_INELIGIBLE_MESSAGE,
  PLAN_PRICING,
  canSelectBreederPro,
  formatMonthlyPrice,
  hasFamilyMembership,
  listPlanPricing,
} from '../src/lib/membership/index.ts'
import type { Account } from '../src/lib/professional/types.ts'

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

async function checkAsync(label: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  OK  ${label}`)
    passed += 1
  } catch (err) {
    failed += 1
    console.error(`  FAIL  ${label}`)
    console.error(err)
  }
}

function activeSub(plan: SubscriptionRecord['plan']): SubscriptionRecord {
  return {
    accountId: SELF_OWNER_ID,
    plan,
    status: 'active',
    provider: 'stripe',
    startedAt: '2026-01-01T00:00:00.000Z',
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

const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

console.log('Membership / billing asserts (KROK 27)\n')

check('A – default FREE', () => {
  const def = createDefaultSubscription()
  assert.equal(def.plan, 'free')
  assert.equal(def.status, 'none')
  assert.equal(effectivePlan(def), 'free')
  assert.equal(hasEntitlement(def, 'lost_pet'), true)
  assert.equal(hasEntitlement(def, 'statistics'), false)
})

check('B – Premium effectivePlan', () => {
  const sub = activeSub('premium')
  assert.equal(effectivePlan(sub), 'premium')
  assert.equal(hasEntitlement(sub, 'statistics'), true)
  assert.equal(hasEntitlement(sub, 'family_members'), false)
  assert.equal(hasEntitlement(sub, 'breeding_pedigree'), false)
})

check('C – Family effectivePlan', () => {
  const sub = activeSub('family')
  assert.equal(effectivePlan(sub), 'family')
  assert.equal(hasFamilyMembership(sub), true)
  assert.equal(hasEntitlement(sub, 'family_shared_care'), true)
  assert.equal(hasEntitlement(sub, 'statistics'), true)
  assert.equal(hasEntitlement(sub, 'breeding_litters'), false)
})

check('D – Breeder Pro effectivePlan', () => {
  const sub = activeSub('breeder_pro')
  assert.equal(effectivePlan(sub), 'breeder_pro')
  assert.equal(hasEntitlement(sub, 'breeding_pedigree'), true)
  assert.equal(hasEntitlement(sub, 'statistics'), true)
  assert.equal(hasEntitlement(sub, 'family_members'), false)
  assert.equal(hasFamilyMembership(sub), false)
})

check('E – unknown entitlement → false', () => {
  assert.equal(hasEntitlement('premium', 'totally_unknown'), false)
  assert.equal(hasEntitlement(activeSub('family'), 'health_advanced_xyz'), false)
})

check('F – expired subscription → FREE', () => {
  const expired: SubscriptionRecord = {
    ...activeSub('premium'),
    status: 'expired',
    expiresAt: past,
  }
  assert.equal(effectivePlan(expired), 'free')
  assert.equal(hasEntitlement(expired, 'statistics'), false)
})

check('G – canceled before expiry → stále aktivní do expiresAt', () => {
  const canceledGrace: SubscriptionRecord = {
    ...activeSub('premium'),
    status: 'canceled',
    expiresAt: future,
  }
  assert.equal(effectivePlan(canceledGrace), 'premium')
  assert.equal(hasEntitlement(canceledGrace, 'statistics'), true)
})

check('H – canceled after expiry → FREE', () => {
  const canceledDone: SubscriptionRecord = {
    ...activeSub('family'),
    status: 'canceled',
    expiresAt: past,
  }
  assert.equal(effectivePlan(canceledDone), 'free')
  assert.equal(hasEntitlement(canceledDone, 'family_members'), false)
})

check('I – DEMO není trust/paid', () => {
  const demo = demoSub('premium')
  assert.equal(isDemoSubscription(demo), true)
  assert.equal(demo.provider, 'demo')
  assert.equal(demo.status, 'demo')
  assert.equal(effectivePlan(demo), 'premium')
  const summary = toPublicMembershipSummary(demo)
  assert.equal(summary.isDemo, true)
  assertPublicMembershipSafe(summary)
  const text = demoDisclaimer()
  assert.match(text, /DEMO/i)
  assert.doesNotMatch(text, /zaplaceno|Platba proběhla/i)
})

await checkAsync('I2 – billing DEMO rejects checkout / portal / paid change', async () => {
  const provider = new DemoSubscriptionProvider()
  const checkout = await provider.createCheckoutSession({
    accountId: SELF_OWNER_ID,
    plan: 'premium',
  })
  assert.equal(checkout.ok, false)
  if (!checkout.ok) {
    assert.equal(checkout.code, 'demo_only')
    assert.doesNotMatch(checkout.message, /stripe|card|zaplaceno/i)
  }
  const portal = await provider.getBillingPortal(SELF_OWNER_ID)
  assert.equal(portal.ok, false)
  const changePaid = await provider.changePlan({
    accountId: SELF_OWNER_ID,
    plan: 'premium',
    demo: false,
  })
  assert.equal(changePaid.ok, false)
})

check('J – safety entitlements vždy dostupné', () => {
  for (const feature of SAFETY_FEATURES) {
    assert.equal(hasEntitlement('free', feature), true, feature)
    assert.equal(hasEntitlement(createDefaultSubscription(), feature), true, feature)
    assert.equal(
      hasEntitlement({ ...activeSub('premium'), status: 'expired' }, feature),
      true,
      feature,
    )
  }
})

check('K – breeder gating', () => {
  const ownerOnly = {
    id: SELF_OWNER_ID,
    kind: 'consumer',
    roles: ['owner'],
    displayName: 'Owner',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as Account
  assert.equal(canSelectBreederPro(ownerOnly, []), false)
  assert.equal(canSelectBreederPro(ownerOnly, [{ neutered: true, breedingProfile: true }]), false)
  assert.equal(
    canSelectBreederPro(ownerOnly, [{ neutered: false, breedingProfile: true }]),
    true,
  )

  const breeder = {
    ...ownerOnly,
    roles: ['owner', 'breeder'],
  } as Account
  assert.equal(canSelectBreederPro(breeder, []), true)
  assert.match(BREEDER_PRO_INELIGIBLE_MESSAGE, /chovné/i)
})

check('L – privacy subscription fields', () => {
  const sub: SubscriptionRecord = {
    ...activeSub('premium'),
    providerCustomerId: 'cus_secret',
    expiresAt: future,
  }
  const summary = toPublicMembershipSummary(sub)
  assertPublicMembershipSafe(summary)
  const rec = summary as unknown as Record<string, unknown>
  for (const key of PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS) {
    assert.equal(key in rec, false, `must not expose ${key}`)
  }
  assert.equal(typeof summary.plan, 'string')
  assert.equal(summary.isDemo, false)
})

check('M – upgrade prompt suggested plans', () => {
  assert.equal(suggestedPlanForFeature('statistics'), 'premium')
  assert.equal(suggestedPlanForFeature('family_members'), 'family')
  assert.equal(suggestedPlanForFeature('breeding_pedigree'), 'breeder_pro')
  assert.equal(suggestedPlanForFeature('lost_pet'), 'free')
  assert.equal(getPlanMeta('premium').label, 'Premium')
  assert.doesNotMatch(getPlanMeta('premium').label, /health_advanced|statistics/)
})

check('N – reload persistence (normalize round-trip)', () => {
  const raw = {
    accountId: SELF_OWNER_ID,
    plan: 'family',
    status: 'demo',
    provider: 'demo',
    startedAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }
  const a = normalizeSubscription(raw)
  const b = normalizeSubscription(JSON.parse(JSON.stringify(a)))
  assert.deepEqual(a, b)
  assert.equal(effectivePlan(b), 'family')
})

check('O – pricing config consistency', () => {
  const list = listPlanPricing()
  assert.equal(list.length, 4)
  assert.equal(PLAN_PRICING.free.monthlyPrice, 0)
  assert.equal(PLAN_PRICING.premium.monthlyPrice, 149)
  assert.equal(PLAN_PRICING.family.monthlyPrice, 249)
  assert.equal(PLAN_PRICING.breeder_pro.monthlyPrice, 499)
  assert.equal(PLAN_PRICING.premium.recommended, true)
  assert.equal(PLAN_PRICING.premium.currency, 'CZK')
  assert.equal(PLAN_PRICING.premium.active, true)
  assert.ok(PLAN_PRICING.premium.features.length > 0)
  assert.match(formatMonthlyPrice(PLAN_PRICING.premium), /149/)
  assert.match(formatMonthlyPrice(PLAN_PRICING.free), /0 Kč/)
  for (const p of list) {
    for (const f of p.features) {
      assert.doesNotMatch(f, /^(health_advanced|breeding_pedigree|family_shared_health)$/)
    }
  }
})

console.log('')
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
