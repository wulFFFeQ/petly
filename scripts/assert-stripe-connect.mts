/**
 * Assert Stripe Connect architecture (KROK 34).
 * Run: npx tsx scripts/assert-stripe-connect.mts
 *
 * A – ProfessionalPaymentAccount
 * B – connected account lifecycle
 * C – onboarding abstraction
 * D – provider abstraction
 * E – Demo provider
 * F – Payment → Booking
 * G – platform fee
 * H – professional amount
 * I – refund
 * J – partial refund
 * K – cancellation fee
 * L – webhook event mapping
 * M – webhook deduplication
 * N – webhook signature abstraction
 * O – payout separation
 * P – privacy
 * Q – secret-key safety
 * R – membership separation
 * S – regression payment
 * T – regression booking
 * U – regression booking rules
 * V – regression reviews
 * W – regression notifications
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  createProfessionalService,
  ensureDefaultBookingPolicy,
  saveBookings,
  createBookingId,
  canOwnerCancelByPolicy,
} from '../src/lib/booking/index.ts'
import {
  assertAmountMinor,
  assertNoSecretKeysInObject,
  assertNoSensitivePaymentData,
  assertPaymentPayloadSafe,
  calculateCancellationFee,
  calculatePaymentRouting,
  clearProcessedProviderEvents,
  createDemoPayoutDraft,
  createDemoWebhookEvent,
  createLocalConnectedAccountRecord,
  createPaymentRecord,
  createRefund,
  DEFAULT_CHARGE_PATTERN,
  DEFAULT_PLATFORM_FEE_BPS,
  DemoPaymentProvider,
  demoProviderNeverCharges,
  ensureDemoProfessionalPaymentAccount,
  FORBIDDEN_CLIENT_SECRET_PATTERNS,
  FORBIDDEN_PAYMENT_PUBLIC_KEYS,
  getPaymentProvider,
  getPaymentProviderConfig,
  getProfessionalPaymentAccountByProfessional,
  handlePaymentWebhook,
  hasProcessedProviderEvent,
  isPayoutIndependentOfPayment,
  isStripeConnectReady,
  listPaymentsForBooking,
  mapStripeEventToPaymentStatus,
  planRefundForPayment,
  planRefundRouting,
  resetPaymentProvider,
  SERVER_ONLY_SECRET_ENV_NAMES,
  setPaymentProvider,
  StripeConnectPaymentProvider,
  toPublicPayment,
  toPublicProfessionalPaymentAccount,
  updatePaymentStatus,
} from '../src/lib/payments/index.ts'
import { getSubscriptionProvider } from '../src/lib/billing/index.ts'
import {
  buildPaymentNotification,
  isSafePaymentNotificationPayload,
  NOTIFICATION_TYPES,
} from '../src/lib/notifications/index.ts'
import { canCreateReview } from '../src/lib/reviews/index.ts'
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
const PRO_ACCOUNT = 'pro_account_connect'
const PRO_ID = 'pro_connect_vet'
const PET_ID = 'pet_connect_luna'

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
      id: PRO_ACCOUNT,
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'MVDr. Connect',
      createdAt: now,
      updatedAt: now,
    },
  ]
  const profiles: ProfessionalProfile[] = [
    {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      type: 'veterinarian',
      displayName: 'MVDr. Connect',
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

async function main() {
  seedBase()

  console.log('\n=== KROK 34 — Stripe Connect Architecture ===\n')

  check('A – ProfessionalPaymentAccount model', () => {
    seedBase()
    const account = ensureDemoProfessionalPaymentAccount(PRO_ID)
    assert.equal(account.professionalId, PRO_ID)
    assert.equal(account.provider, 'demo')
    assert.equal(account.status, 'not_started')
    assert.equal(account.chargesEnabled, false)
    assert.equal(account.payoutsEnabled, false)
    assert.equal(account.detailsSubmitted, false)
    assert.ok(account.id)
    assert.ok(account.createdAt)
    assert.ok(account.updatedAt)
    const profilesRaw = localStorage.getItem('lovedandknown.professionalProfiles')
    assert.ok(profilesRaw)
    assert.ok(!profilesRaw.includes('stripeAccountId'))
    assert.ok(!profilesRaw.includes('providerAccountId'))
  })

  await checkAsync('B – connected account lifecycle (DEMO)', async () => {
    seedBase()
    const provider = getPaymentProvider()
    const created = await provider.createConnectedAccount(PRO_ID)
    assert.ok(created.ok)
    assert.equal(created.value.status, 'not_started')
    assert.equal(created.value.chargesEnabled, false)
    assert.equal(isStripeConnectReady(created.value), false)

    const status = await provider.getAccountStatus(created.value.id)
    assert.ok(status.ok)
    assert.equal(status.value.provider, 'demo')

    const again = createLocalConnectedAccountRecord(PRO_ID)
    assert.ok(again.ok)
    assert.equal(again.value.id, created.value.id)
  })

  await checkAsync('C – onboarding abstraction (DEMO preparing)', async () => {
    seedBase()
    const provider = getPaymentProvider()
    const created = await provider.createConnectedAccount(PRO_ID)
    assert.ok(created.ok)
    const link = await provider.createOnboardingLink(created.value.id)
    assert.ok(link.ok)
    assert.equal(link.value.mode, 'demo_preparing')
    assert.equal(link.value.url, undefined)
    assert.ok(
      link.value.message.toLowerCase().includes('ostré') ||
        link.value.message.toLowerCase().includes('dostupné'),
    )

    const login = await provider.createLoginLink(created.value.id)
    assert.ok(login.ok)
    assert.equal(login.value.mode, 'demo_preparing')
    assert.equal(login.value.url, undefined)
  })

  await checkAsync('D – provider abstraction + Stripe stub', async () => {
    seedBase()
    assert.ok(getPaymentProvider() instanceof DemoPaymentProvider)
    const stub = new StripeConnectPaymentProvider()
    setPaymentProvider(stub)
    const pay = await stub.createPayment({
      bookingId: 'b1',
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 10000,
      paymentType: 'full',
    })
    assert.equal(pay.ok, false)
    if (!pay.ok) assert.equal(pay.error, 'not_implemented')

    const checkout = await stub.createCheckoutSession('missing')
    assert.equal(checkout.ok, false)
    if (!checkout.ok) assert.equal(checkout.error, 'not_implemented')

    resetPaymentProvider()
    assert.ok(getPaymentProvider() instanceof DemoPaymentProvider)
  })

  await checkAsync('E – Demo provider never charges / no fake paid', async () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_demo' })
    saveBookings([booking])
    const provider = getPaymentProvider()
    const created = await provider.createPayment({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 100000,
      currency: 'CZK',
      paymentType: 'full',
    })
    assert.ok(created.ok)
    assert.equal(created.value.status, 'pending')
    assert.equal(created.value.isDemoPayment, true)
    assert.ok(demoProviderNeverCharges(created))

    const auth = await provider.authorizePayment(created.value.id)
    assert.ok(demoProviderNeverCharges(auth))
    const capture = await provider.capturePayment(created.value.id)
    assert.ok(demoProviderNeverCharges(capture))

    const blocked = updatePaymentStatus(created.value.id, 'paid')
    assert.equal(blocked.ok, false)

    const session = await provider.createCheckoutSession(created.value.id)
    assert.ok(session.ok)
    assert.equal(session.value.mode, 'demo_preparing')
    assert.equal(session.value.url, undefined)
  })

  check('F – Payment → Booking link', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_link' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 100000,
      currency: 'CZK',
      paymentType: 'full',
    })
    assert.ok(pay.ok)
    assert.equal(pay.value.bookingId, booking.id)
    assert.equal(listPaymentsForBooking(booking.id).length, 1)
    assert.equal(pay.value.chargePattern, DEFAULT_CHARGE_PATTERN)
  })

  check('G – platform fee explicit (10% of 1000 Kč)', () => {
    const routing = calculatePaymentRouting(100000, { currency: 'CZK' })
    assert.equal(DEFAULT_PLATFORM_FEE_BPS, 1000)
    assert.equal(routing.amountMinor, 100000)
    assert.equal(routing.platformFeeMinor, 10000)
    assert.equal(routing.professionalAmountMinor, 90000)
    assert.equal(routing.chargePattern, 'destination_charge')
    assert.equal(assertAmountMinor(routing.platformFeeMinor), true)
    assert.equal(Number.isInteger(routing.platformFeeMinor), true)
  })

  check('H – professional amount on Payment record', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_fee' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 100000,
      currency: 'CZK',
      paymentType: 'full',
    })
    assert.ok(pay.ok)
    assert.equal(pay.value.platformFeeMinor, 10000)
    assert.equal(pay.value.professionalAmountMinor, 90000)
    assert.equal(
      pay.value.amountMinor,
      (pay.value.platformFeeMinor ?? 0) + (pay.value.professionalAmountMinor ?? 0),
    )
  })

  check('I – full refund keeps original payment', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_ref' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 100000,
      currency: 'CZK',
      paymentType: 'full',
    })
    assert.ok(pay.ok)
    const refund = createRefund(pay.value.id)
    assert.ok(refund.ok)
    assert.equal(refund.value.paymentType, 'refund')
    assert.equal(refund.value.refundOfPaymentId, pay.value.id)
    assert.equal(refund.value.amountMinor, 100000)
    assert.equal(refund.value.status, 'pending')
    assert.equal(listPaymentsForBooking(booking.id).length, 2)
    const plan = planRefundForPayment(pay.value)
    assert.equal(plan.reversePlatformFeeMinor, 10000)
    assert.equal(plan.reverseProfessionalTransferMinor, 90000)
  })

  check('J – partial refund', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_pref' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 100000,
      currency: 'CZK',
      paymentType: 'full',
    })
    assert.ok(pay.ok)
    const refund = createRefund(pay.value.id, 40000)
    assert.ok(refund.ok)
    assert.equal(refund.value.amountMinor, 40000)
    const plan = planRefundRouting(
      {
        amountMinor: 100000,
        platformFeeMinor: 10000,
        professionalAmountMinor: 90000,
      },
      40000,
    )
    assert.equal(plan.refundCustomerMinor, 40000)
    assert.equal(
      plan.reversePlatformFeeMinor + plan.reverseProfessionalTransferMinor,
      40000,
    )
  })

  check('K – cancellation fee inactive', () => {
    seedBase()
    const policy = ensureDefaultBookingPolicy(PRO_ID)
    const booking = makeBooking({ serviceId: 'svc_cancel', status: 'confirmed' })
    const fee = calculateCancellationFee(booking, policy)
    assert.equal(fee.amountMinor, 0)
    assert.equal(fee.reason, 'provider_inactive')
  })

  check('L – webhook event mapping', () => {
    assert.equal(mapStripeEventToPaymentStatus('payment_intent.succeeded'), 'paid')
    assert.equal(mapStripeEventToPaymentStatus('payment_intent.payment_failed'), 'failed')
    assert.equal(mapStripeEventToPaymentStatus('payment_intent.canceled'), 'cancelled')
    assert.equal(mapStripeEventToPaymentStatus('charge.refunded'), 'refunded')
    assert.equal(mapStripeEventToPaymentStatus('account.updated'), null)
  })

  await checkAsync('M – webhook deduplication', async () => {
    seedBase()
    clearProcessedProviderEvents()
    const event = createDemoWebhookEvent({
      type: 'payment_intent.succeeded',
      providerEventId: 'demo_evt_dedupe_1',
    })
    const first = await handlePaymentWebhook(event)
    assert.ok(first.ok)
    assert.equal(hasProcessedProviderEvent('demo_evt_dedupe_1'), true)
    const second = await handlePaymentWebhook(event)
    assert.ok(second.ok)
    assert.equal(second.duplicate, true)
    assert.equal(first.skipped, true)
  })

  await checkAsync('N – webhook signature abstraction', async () => {
    seedBase()
    const provider = getPaymentProvider()
    const ok = await provider.verifyWebhookSignature(
      JSON.stringify({
        type: 'payment_intent.payment_failed',
        providerEventId: 'demo_evt_sig',
      }),
      'demo_sig_test',
      'DEMO_WEBHOOK_SECRET',
    )
    assert.ok(ok.ok)
    assert.equal(ok.value.isDemo, true)
    assert.equal(ok.value.verified, true)

    const bad = await provider.verifyWebhookSignature('{}', null, 'whsec_fake')
    assert.equal(bad.ok, false)

    const stub = new StripeConnectPaymentProvider()
    const stripeVerify = await stub.verifyWebhookSignature(
      '{}',
      't=1',
      'STRIPE_WEBHOOK_SECRET',
    )
    assert.equal(stripeVerify.ok, false)
    if (!stripeVerify.ok) assert.equal(stripeVerify.error, 'not_implemented')
  })

  check('O – payout separation from Payment', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_payout' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 100000,
      currency: 'CZK',
      paymentType: 'full',
    })
    assert.ok(pay.ok)
    const payout = createDemoPayoutDraft(pay.value)
    assert.equal(payout.paymentId, pay.value.id)
    assert.equal(payout.amountMinor, 90000)
    assert.equal(payout.status, 'pending')
    assert.equal(payout.isDemoPayout, true)
    assert.ok(isPayoutIndependentOfPayment('paid', 'pending'))
    // Customer payment pending ≠ implies professional payout paid
    assert.notEqual(payout.status, 'paid')
    assert.equal(pay.value.status, 'pending')
  })

  check('P – privacy (no card / provider internals on public)', () => {
    seedBase()
    const account = ensureDemoProfessionalPaymentAccount(PRO_ID)
    const pubAcc = toPublicProfessionalPaymentAccount(account)
    assert.ok(!('providerAccountId' in pubAcc))
    assert.ok(assertPaymentPayloadSafe(pubAcc))

    const booking = makeBooking({ serviceId: 'svc_priv' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 50000,
      paymentType: 'full',
    })
    assert.ok(pay.ok)
    const pub = toPublicPayment(pay.value)
    assert.ok(!('providerPaymentId' in pub))
    assert.ok(!('ownerAccountId' in pub))
    assert.ok(FORBIDDEN_PAYMENT_PUBLIC_KEYS.includes('providerAccountId'))
    assert.ok(FORBIDDEN_PAYMENT_PUBLIC_KEYS.includes('stripeSecretKey'))
    assert.equal(assertNoSensitivePaymentData({ cardNumber: '4111', cvv: '123' }), false)
    assert.equal(assertNoSensitivePaymentData({ amountMinor: 100 }), true)
  })

  check('Q – secret-key safety', () => {
    const config = getPaymentProviderConfig()
    assert.equal(config.provider, 'demo')
    assert.equal(config.isDemo, true)
    assert.ok(SERVER_ONLY_SECRET_ENV_NAMES.includes('STRIPE_SECRET_KEY'))
    assert.ok(FORBIDDEN_CLIENT_SECRET_PATTERNS.some((p) => p.includes('SECRET')))
    assert.equal(assertNoSecretKeysInObject({ provider: 'demo' }), true)
    assert.equal(assertNoSecretKeysInObject({ key: 'sk_live_abc' }), false)

    const configSrc = readFileSync(join(process.cwd(), 'src/lib/payments/config.ts'), 'utf8')
    assert.ok(!configSrc.includes('sk_live_'))
    assert.ok(!/whsec_[a-zA-Z0-9]/.test(configSrc))
    assert.ok(configSrc.includes('SERVER_ONLY_SECRET_ENV_NAMES'))
  })

  check('R – membership separation', () => {
    const sub = getSubscriptionProvider()
    const pay = getPaymentProvider()
    assert.notEqual(sub.constructor.name, pay.constructor.name)
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_mem' })
    saveBookings([booking])
    const created = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 1000,
      paymentType: 'full',
    })
    assert.ok(created.ok)
    assert.equal(created.value.purpose, 'BOOKING_PAYMENT')
  })

  check('S – regression payment (DEMO pending)', () => {
    seedBase()
    const booking = makeBooking({ serviceId: 'svc_reg_pay' })
    saveBookings([booking])
    const pay = createPaymentRecord({
      bookingId: booking.id,
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      amountMinor: 25000,
      paymentType: 'deposit',
    })
    assert.ok(pay.ok)
    assert.equal(pay.value.status, 'pending')
    assert.equal(pay.value.isDemoPayment, true)
  })

  check('T – regression booking', () => {
    seedBase()
    const svc = createProfessionalService({
      professionalId: PRO_ID,
      name: 'Kontrola',
      durationMinutes: 30,
      price: 500,
      currency: 'CZK',
      priceType: 'fixed',
    })
    assert.ok(svc.ok)
    const booking = makeBooking({ serviceId: svc.value.id, status: 'requested' })
    saveBookings([booking])
    assert.equal(booking.status, 'requested')
  })

  check('U – regression booking rules', () => {
    seedBase()
    const policy = ensureDefaultBookingPolicy(PRO_ID)
    assert.ok(policy)
    const booking = makeBooking({
      serviceId: 'svc_rules',
      status: 'confirmed',
      startAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    })
    const can = canOwnerCancelByPolicy(booking, policy)
    assert.equal(typeof can.allowed, 'boolean')
  })

  check('V – regression reviews', () => {
    assert.equal(typeof canCreateReview, 'function')
  })

  check('W – regression notifications', () => {
    assert.ok(NOTIFICATION_TYPES.includes('booking_requested'))
    const draft = buildPaymentNotification({
      event: 'payment_required',
      paymentId: 'pay_x',
      bookingId: 'bkg_x',
      recipientAccountId: OWNER_ID,
      amountLabel: '300 Kč',
    })
    assert.ok(draft)
    assert.ok(isSafePaymentNotificationPayload(draft))
  })

  check('extra – public account never claims Stripe connected', () => {
    seedBase()
    const account = ensureDemoProfessionalPaymentAccount(PRO_ID)
    const pub = toPublicProfessionalPaymentAccount(account)
    assert.notEqual(pub.status, 'active')
    assert.equal(pub.chargesEnabled, false)
    assert.equal(getProfessionalPaymentAccountByProfessional(PRO_ID)?.provider, 'demo')
  })

  check('extra – separate_charge_and_transfer modeled', () => {
    const routing = calculatePaymentRouting(100000, {
      chargePattern: 'separate_charge_and_transfer',
    })
    assert.equal(routing.chargePattern, 'separate_charge_and_transfer')
    assert.equal(routing.platformFeeMinor, 10000)
  })

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main()
