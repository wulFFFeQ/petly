/**
 * Assert Stripe Checkout + Payment Lifecycle (KROK 35).
 * Run: npx tsx scripts/assert-stripe-checkout.mts
 *
 * 1–28 checklist from KROK 35
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  createBookingId,
  saveBookings,
  confirmBooking,
  getBooking,
} from '../src/lib/booking/index.ts'
import {
  applyVerifiedPaymentSuccessToBooking,
  assertNoSecretKeysInObject,
  assertNoSensitivePaymentData,
  assertPaymentPayloadSafe,
  calculatePaymentRouting,
  canTransitionPaymentStatus,
  clearProcessedProviderEvents,
  createDemoPayoutDraft,
  createDemoWebhookEvent,
  createPaymentRecord,
  createRefund,
  DEFAULT_PLATFORM_FEE_BPS,
  DemoPaymentProvider,
  frontendMustNotConfirmBookingAfterPayment,
  getCheckoutAmountFromPayment,
  getPayment,
  getPaymentProvider,
  getPaymentProviderConfig,
  handlePaymentWebhook,
  hasProcessedProviderEvent,
  initiateCheckoutSession,
  isPaymentEligibleForRefund,
  mapStripeEventToInternal,
  mapStripeEventToPaymentStatus,
  planPayoutAfterPaymentSuccess,
  resolveBackendStripeConfig,
  resetPaymentProvider,
  toPublicCheckoutSession,
  toPublicPayment,
  transitionPaymentStatus,
  updatePaymentStatus,
  SERVER_ONLY_SECRET_ENV_NAMES,
} from '../src/lib/payments/index.ts'
import { getSubscriptionProvider } from '../src/lib/billing/index.ts'
import {
  buildPaymentNotification,
  isSafePaymentNotificationPayload,
  paymentDedupeKey,
} from '../src/lib/notifications/fromPayment.ts'
import type { Account, ProfessionalProfile } from '../src/types/professional.ts'
import type { Booking } from '../src/lib/booking/types.ts'

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

const OWNER_ID = 'owner_self'
const OTHER_OWNER = 'owner_other'
const PRO_ACCOUNT = 'pro_account_checkout'
const PRO_ID = 'pro_checkout_vet'
const PET_ID = 'pet_checkout_luna'

function seedBase() {
  memory.clear()
  resetPaymentProvider()
  clearProcessedProviderEvents()
  const now = '2026-09-01T10:00:00.000Z'
  const accounts: Account[] = [
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Majitel',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: OTHER_OWNER,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Jiný majitel',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: PRO_ACCOUNT,
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'MVDr. Checkout',
      createdAt: now,
      updatedAt: now,
    },
  ]
  const profiles: ProfessionalProfile[] = [
    {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      type: 'veterinarian',
      displayName: 'MVDr. Checkout',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: now,
      updatedAt: now,
    },
  ]
  saveAccounts(accounts)
  saveProfessionalProfiles(profiles)
  localStorage.setItem('lovedandknown.selfAccountId', OWNER_ID)
}

function makeBooking(overrides: Partial<Booking> & { serviceId: string }): Booking {
  const now = new Date().toISOString()
  return {
    id: createBookingId('bkg'),
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    petId: PET_ID,
    startAt: '2026-11-01T10:00:00.000Z',
    endAt: '2026-11-01T11:00:00.000Z',
    status: 'requested',
    serviceNameSnapshot: 'Kontrola',
    priceSnapshot: 1000,
    currencySnapshot: 'CZK',
    durationSnapshot: 60,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makePayment(booking: Booking, amountMinor = 100000) {
  return createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: booking.ownerAccountId,
    professionalId: booking.professionalId,
    amountMinor,
    currency: 'CZK',
    paymentType: 'full',
    serviceNameSnapshot: booking.serviceNameSnapshot,
    currencySnapshot: 'CZK',
    priceSnapshotMajor: booking.priceSnapshot,
  })
}

async function main() {
  seedBase()
  console.log('\n=== KROK 35 — Stripe Checkout + Payment Lifecycle ===\n')

  await checkAsync('1 – Demo checkout does not create URL', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_1' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const session = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OWNER_ID,
    })
    assert.ok(session.ok)
    assert.equal(session.value.status, 'demo_preparing')
    assert.equal(session.value.isDemo, true)
    assert.equal(session.value.checkoutUrl, undefined)
    assert.equal(session.value.url, undefined)
    assert.equal(session.value.providerCheckoutSessionId, undefined)
    const pub = toPublicCheckoutSession(session.value)
    assert.equal(pub.checkoutUrl, undefined)
  })

  await checkAsync('2 – Demo checkout does not create paid payment', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_2' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OWNER_ID,
    })
    assert.equal(getPayment(pay.value.id)!.status, 'pending')
    assert.equal(getPayment(pay.value.id)!.isDemoPayment, true)
  })

  check('3 – Payment state transitions', () => {
    assert.equal(canTransitionPaymentStatus('pending', 'paid'), true)
    assert.equal(canTransitionPaymentStatus('pending', 'cancelled'), true)
    assert.equal(canTransitionPaymentStatus('paid', 'refunded'), true)
    assert.equal(canTransitionPaymentStatus('paid', 'partially_refunded'), true)
    assert.equal(canTransitionPaymentStatus('partially_refunded', 'refunded'), true)
  })

  check('4 – Invalid payment transitions rejected', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_4' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    // Force cancelled via cancel path then reject paid
    const cancelled = transitionPaymentStatus(pay.value.id, 'cancelled')
    assert.ok(cancelled.ok)
    const bad = transitionPaymentStatus(pay.value.id, 'paid')
    assert.equal(bad.ok, false)
    assert.equal(canTransitionPaymentStatus('cancelled', 'paid'), false)
    assert.equal(canTransitionPaymentStatus('refunded', 'paid'), false)
    assert.equal(canTransitionPaymentStatus('failed', 'paid'), false)
  })

  await checkAsync('5 – Checkout amount comes from Payment snapshot', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_5' })
    saveBookings([booking])
    const pay = makePayment(booking, 55500)
    assert.ok(pay.ok)
    const snap = getCheckoutAmountFromPayment(pay.value)
    assert.equal(snap.amountMinor, 55500)
    assert.equal(snap.currency, 'CZK')
    const session = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OWNER_ID,
    })
    assert.ok(session.ok)
    assert.equal(session.value.amountMinor, 55500)
  })

  await checkAsync('6 – Frontend cannot override amount', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_6' })
    saveBookings([booking])
    const pay = makePayment(booking, 100000)
    assert.ok(pay.ok)
    const bad = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OWNER_ID,
      claimedAmountMinor: 1,
    })
    assert.equal(bad.ok, false)
  })

  await checkAsync('7 – Currency mismatch rejected', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_7' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const bad = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OWNER_ID,
      claimedCurrency: 'EUR',
    })
    assert.equal(bad.ok, false)
  })

  await checkAsync('8 – Owner can initiate own payment', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_8' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const ok = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OWNER_ID,
    })
    assert.ok(ok.ok)
  })

  await checkAsync('9 – Other owner cannot initiate payment', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_9' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const bad = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: OTHER_OWNER,
    })
    assert.equal(bad.ok, false)
    if (!bad.ok) assert.equal(bad.error, 'forbidden')
  })

  await checkAsync('10 – Professional cannot initiate owner checkout', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_10' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const bad = await initiateCheckoutSession({
      paymentId: pay.value.id,
      actorAccountId: PRO_ACCOUNT,
    })
    assert.equal(bad.ok, false)
    if (!bad.ok) assert.equal(bad.error, 'forbidden')
  })

  check('11 – Stripe event mapping', () => {
    const m = mapStripeEventToInternal('payment_intent.succeeded')
    assert.equal(m.internalEventType, 'payment.succeeded')
    assert.equal(m.paymentStatus, 'paid')
  })

  await checkAsync('12 – Webhook idempotence', async () => {
    seedBase()
    const event = createDemoWebhookEvent({
      type: 'payment_intent.payment_failed',
      providerEventId: 'demo_evt_idem_1',
    })
    const first = await handlePaymentWebhook(event)
    assert.ok(first.ok)
    assert.equal(first.duplicate, undefined)
    const second = await handlePaymentWebhook(event)
    assert.ok(second.ok)
    assert.equal(second.duplicate, true)
  })

  await checkAsync('13 – Duplicate providerEventId ignored', async () => {
    seedBase()
    const event = createDemoWebhookEvent({
      type: 'checkout.session.expired',
      providerEventId: 'demo_evt_dup_2',
    })
    await handlePaymentWebhook(event)
    assert.ok(hasProcessedProviderEvent('demo_evt_dup_2'))
    const again = await handlePaymentWebhook(event)
    assert.ok(again.ok && again.duplicate)
  })

  await checkAsync('14 – Signature verification abstraction', async () => {
    seedBase()
    const provider = getPaymentProvider()
    const rawBody = JSON.stringify({
      type: 'payment_intent.payment_failed',
      providerEventId: 'demo_sig_1',
    })
    const verified = await provider.verifyWebhookSignature(
      rawBody,
      'demo_sig_header',
      'DEMO_WEBHOOK_SECRET',
    )
    assert.ok(verified.ok)
    assert.equal(verified.value.isDemo, true)
    assert.equal(verified.value.verified, true)

    const rejectProd = await provider.verifyWebhookSignature(
      rawBody,
      't=1,v1=abc',
      'STRIPE_WEBHOOK_SECRET',
    )
    assert.equal(rejectProd.ok, false)
  })

  check('15 – payment_intent.succeeded mapping', () => {
    assert.equal(mapStripeEventToPaymentStatus('payment_intent.succeeded'), 'paid')
    assert.equal(
      mapStripeEventToInternal('payment_intent.succeeded').internalEventType,
      'payment.succeeded',
    )
  })

  check('16 – payment_intent.payment_failed mapping', () => {
    assert.equal(
      mapStripeEventToPaymentStatus('payment_intent.payment_failed'),
      'failed',
    )
  })

  check('17 – payment_intent.canceled mapping', () => {
    assert.equal(mapStripeEventToPaymentStatus('payment_intent.canceled'), 'cancelled')
  })

  check('18 – checkout.session.completed mapping', () => {
    const m = mapStripeEventToInternal('checkout.session.completed')
    assert.equal(m.internalEventType, 'checkout.completed')
    assert.equal(m.checkoutStatus, 'completed')
  })

  check('19 – checkout.session.expired mapping', () => {
    const m = mapStripeEventToInternal('checkout.session.expired')
    assert.equal(m.internalEventType, 'checkout.expired')
    assert.equal(m.checkoutStatus, 'expired')
  })

  check('20 – refund mapping', () => {
    assert.equal(mapStripeEventToPaymentStatus('charge.refunded'), 'refunded')
    assert.equal(
      mapStripeEventToInternal('charge.refunded').internalEventType,
      'payment.refunded',
    )
  })

  check('21 – partial refund validation', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_21' })
    saveBookings([booking])
    const pay = makePayment(booking, 100000)
    assert.ok(pay.ok)
    const partial = createRefund(pay.value.id, 25000)
    assert.ok(partial.ok)
    assert.equal(partial.value.amountMinor, 25000)
    assert.equal(partial.value.refundOfPaymentId, pay.value.id)
    assert.ok(getPayment(pay.value.id))
    const over = createRefund(pay.value.id, 90000)
    assert.equal(over.ok, false)
  })

  check('22 – full refund validation', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_22' })
    saveBookings([booking])
    const pay = makePayment(booking, 100000)
    assert.ok(pay.ok)
    const full = createRefund(pay.value.id)
    assert.ok(full.ok)
    assert.equal(full.value.amountMinor, 100000)
    const zero = createRefund(pay.value.id, 0)
    assert.equal(zero.ok, false)
    const mismatch = createRefund(pay.value.id, 1000, { currency: 'EUR' })
    assert.equal(mismatch.ok, false)
  })

  check('23 – payout separation', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_23' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const payout = planPayoutAfterPaymentSuccess(pay.value)
    assert.equal(payout.status, 'pending')
    assert.equal(payout.isDemoPayout, true)
    assert.notEqual(payout.status, 'paid')
    assert.equal(payout.paymentId, pay.value.id)
  })

  check('24 – platform fee calculation', () => {
    const routing = calculatePaymentRouting(100000, { currency: 'CZK' })
    assert.equal(DEFAULT_PLATFORM_FEE_BPS, 1000)
    assert.equal(routing.platformFeeMinor, 10000)
    assert.equal(routing.professionalAmountMinor, 90000)
    assert.equal(
      routing.amountMinor,
      routing.professionalAmountMinor + routing.platformFeeMinor,
    )
  })

  check('25 – membership remains separate', () => {
    seedBase()
    const pay = getPaymentProvider()
    const sub = getSubscriptionProvider()
    assert.notEqual(pay.constructor, sub.constructor)
    const booking = makeBooking({ serviceId: 'svc_25' })
    saveBookings([booking])
    const created = makePayment(booking)
    assert.ok(created.ok)
    assert.equal(created.value.purpose, 'BOOKING_PAYMENT')
  })

  check('26 – privacy projection', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_26' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const pub = toPublicPayment({
      ...pay.value,
      providerPaymentId: 'pi_secret',
    })
    assert.ok(!('providerPaymentId' in pub))
    assert.ok(!('ownerAccountId' in pub))
    assert.ok(assertPaymentPayloadSafe(pub))
    assert.equal(assertNoSensitivePaymentData({ cardNumber: '4111' }), false)
  })

  await checkAsync('27 – DEMO never claims paid', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_27' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const blocked = updatePaymentStatus(pay.value.id, 'paid')
    assert.equal(blocked.ok, false)
    const event = createDemoWebhookEvent({
      type: 'payment_intent.succeeded',
      paymentId: pay.value.id,
      providerEventId: 'demo_paid_skip',
    })
    const handled = await handlePaymentWebhook(event)
    assert.ok(handled.ok)
    assert.equal(handled.skipped, true)
    assert.equal(getPayment(pay.value.id)!.status, 'pending')

    const policy = applyVerifiedPaymentSuccessToBooking({
      paymentId: pay.value.id,
      providerEventId: 'demo_paid_skip',
    })
    assert.ok(policy.ok)
    assert.equal(policy.value.skipped, true)
    assert.equal(policy.value.reason, 'demo_only')
    assert.equal(getBooking(booking.id)!.status, 'requested')
    assert.ok(frontendMustNotConfirmBookingAfterPayment())
  })

  check('28 – DEMO never claims payout paid', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_28' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const draft = createDemoPayoutDraft(pay.value)
    assert.equal(draft.status, 'pending')
    assert.equal(draft.isDemoPayout, true)
    assert.notEqual(draft.status, 'paid')
  })

  check('config – backend stripe secrets never in client config', () => {
    const config = getPaymentProviderConfig()
    assert.equal(config.isDemo, true)
    assert.equal(config.provider, 'demo')
    assert.ok(assertNoSecretKeysInObject(config))
    assert.ok(SERVER_ONLY_SECRET_ENV_NAMES.includes('STRIPE_SECRET_KEY'))
    assert.equal(resolveBackendStripeConfig({}), null)
    assert.equal(resolveBackendStripeConfig(undefined), null)
    assert.equal(
      resolveBackendStripeConfig({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_WEBHOOK_SECRET: 'whsec_x',
      })?.secretKey,
      'sk_test_x',
    )
  })

  check('notifications – checkout + cancelled types + dedupe', () => {
    const draft = buildPaymentNotification({
      event: 'payment_checkout_created',
      paymentId: 'pay_x',
      bookingId: 'bkg_x',
      recipientAccountId: OWNER_ID,
      amountLabel: '1000 Kč',
      providerEventId: 'evt_1',
    })
    assert.ok(draft)
    assert.equal(draft!.dedupeKey, paymentDedupeKey('payment_checkout_created', 'pay_x', 'evt_1'))
    assert.ok(isSafePaymentNotificationPayload(draft))
    const cancelled = buildPaymentNotification({
      event: 'payment_cancelled',
      paymentId: 'pay_x',
      bookingId: 'bkg_x',
      recipientAccountId: OWNER_ID,
    })
    assert.ok(cancelled)
  })

  check('booking – pro cannot confirm payment_pending via confirmBooking', () => {
    seedBase()
    const booking = makeBooking({
      serviceId: 'svc_pp',
      status: 'payment_pending',
    })
    saveBookings([booking])
    const result = confirmBooking(booking.id, PRO_ID)
    assert.equal(result.ok, false)
  })

  check('eligibility – refund helpers', () => {
    assert.equal(isPaymentEligibleForRefund('paid'), true)
    assert.equal(isPaymentEligibleForRefund('pending'), false)
  })

  check('source – no Stripe SDK / secrets in payment lib', () => {
    const root = join(process.cwd(), 'src', 'lib', 'payments')
    for (const file of [
      'demoProvider.ts',
      'stripeConnectProvider.ts',
      'checkout.ts',
      'config.ts',
    ]) {
      const src = readFileSync(join(root, file), 'utf8')
      assert.ok(!src.includes("from 'stripe'"))
      assert.ok(!src.includes('sk_live_'))
      assert.ok(!src.includes('whsec_live'))
    }
  })

  await checkAsync('DemoPaymentProvider implements checkout preparing', async () => {
    const provider = new DemoPaymentProvider()
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_demo' })
    saveBookings([booking])
    const pay = makePayment(booking)
    assert.ok(pay.ok)
    const session = await provider.createCheckoutSession(pay.value.id)
    assert.ok(session.ok)
    assert.equal(session.value.status, 'demo_preparing')
    assert.equal(session.value.provider, 'demo')
  })

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
