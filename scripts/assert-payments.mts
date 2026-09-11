/**
 * Assert booking payments (KROK 33).
 * Run: npx tsx scripts/assert-payments.mts
 *
 * A – payment belongs to booking
 * B – multiple payments per booking
 * C – integer money handling
 * D – CZK currency
 * E – price snapshot
 * F – deposit calculation
 * G – fixed deposit
 * H – percentage deposit
 * I – payment summary derived correctly
 * J – cancellation fee extension point
 * K – refund extension point
 * L – DemoPaymentProvider never charges
 * M – no fake paid state
 * N – membership payment remains separate
 * O – privacy
 * P – persistence
 * Q – regression booking
 * R – regression booking rules
 * S – regression reviews
 * T – regression notifications
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  createProfessionalService,
  ensureDefaultBookingPolicy,
  getBooking,
  saveBookings,
  createBookingId,
  canOwnerCancelByPolicy,
  updateProfessionalService,
} from '../src/lib/booking/index.ts'
import {
  assertAmountMinor,
  assertNoSensitivePaymentData,
  assertPaymentPayloadSafe,
  calculateCancellationFee,
  calculateDeposit,
  createPaymentRecord,
  createRefund,
  DEFAULT_CURRENCY,
  DemoPaymentProvider,
  demoProviderNeverCharges,
  deriveBookingPaymentSummary,
  formatMinorMoney,
  fromMinorUnits,
  getPayment,
  getPaymentProvider,
  listPaymentsForBooking,
  loadPayments,
  preparePaymentIntent,
  preparePaymentIntentForBooking,
  resetPaymentProvider,
  savePayments,
  suggestedPaymentDefaults,
  toMinorUnits,
  toPublicPayment,
  updatePaymentStatus,
  upsertPayment,
  type Payment,
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
const PRO_ACCOUNT = 'pro_account_pay'
const PRO_ID = 'pro_pay_vet'
const PET_ID = 'pet_pay_luna'

function seedBase() {
  memory.clear()
  resetPaymentProvider()
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
      displayName: 'MVDr. Pay',
      createdAt: now,
      updatedAt: now,
    },
  ]
  const profiles: ProfessionalProfile[] = [
    {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      type: 'veterinarian',
      displayName: 'MVDr. Pay',
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

seedBase()

console.log('\n=== KROK 33 — Payments ===\n')

check('C – integer money: 250 Kč → 25000 minor', () => {
  const minor = toMinorUnits(250, 'CZK')
  assert.equal(minor, 25000)
  assert.equal(assertAmountMinor(minor), true)
  assert.equal(fromMinorUnits(minor, 'CZK'), 250)
  assert.equal(Number.isInteger(minor), true)
})

check('D – CZK default currency', () => {
  assert.equal(DEFAULT_CURRENCY, 'CZK')
  assert.equal(toMinorUnits(1000), 100000)
  const label = formatMinorMoney(100000, 'CZK')
  assert.ok(label.includes('1') && (label.includes('000') || label.includes('1\u00a0000') || label.includes('1000')))
})

check('G – fixed deposit', () => {
  const d = calculateDeposit({
    priceMajor: 1000,
    requiresDeposit: true,
    depositType: 'fixed',
    depositValue: 300,
    currency: 'CZK',
  })
  assert.ok(d)
  assert.equal(d!.amountMinor, 30000)
})

check('H – percentage deposit', () => {
  const d = calculateDeposit({
    priceMajor: 1000,
    requiresDeposit: true,
    depositType: 'percentage',
    depositValue: 30,
    currency: 'CZK',
  })
  assert.ok(d)
  assert.equal(d!.amountMinor, 30000)
})

check('F – deposit calculation returns null when disabled', () => {
  assert.equal(
    calculateDeposit({
      requiresDeposit: false,
      depositType: 'fixed',
      depositValue: 100,
    }),
    null,
  )
})

check('A – payment belongs to booking', () => {
  seedBase()
  const svc = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Kontrola',
    durationMinutes: 60,
    price: 1000,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'full_prepay',
  })
  assert.ok(svc.ok)
  const booking = makeBooking({ serviceId: svc.value.id })
  saveBookings([booking])
  const pay = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: toMinorUnits(1000, 'CZK'),
    currency: 'CZK',
    paymentType: 'full',
    isDemoPayment: true,
  })
  assert.ok(pay.ok)
  assert.equal(pay.value.bookingId, booking.id)
  assert.equal(listPaymentsForBooking(booking.id).length, 1)
})

check('B – multiple payments per booking', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_multi' })
  saveBookings([booking])
  const d = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 30000,
    currency: 'CZK',
    paymentType: 'deposit',
    isDemoPayment: true,
  })
  const rest = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 70000,
    currency: 'CZK',
    paymentType: 'full',
    isDemoPayment: true,
  })
  assert.ok(d.ok && rest.ok)
  assert.equal(listPaymentsForBooking(booking.id).length, 2)
})

check('E – price snapshot isolated from live service', () => {
  seedBase()
  const svc = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Stříhání',
    durationMinutes: 60,
    price: 1000,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'full_prepay',
  })
  assert.ok(svc.ok)
  const booking = makeBooking({
    serviceId: svc.value.id,
    priceSnapshot: 1000,
    serviceNameSnapshot: 'Stříhání',
  })
  saveBookings([booking])
  const intent = preparePaymentIntent(booking, { paymentType: 'full' })
  assert.ok(intent.ok)
  assert.equal(intent.value.priceSnapshotMajor, 1000)
  assert.equal(intent.value.amountMinor, 100000)

  // Change live service price — payment snapshot must stay
  updateProfessionalService(svc.value.id, { price: 9999 }, PRO_ID)
  const again = getPayment(intent.value.id)
  assert.ok(again)
  assert.equal(again!.priceSnapshotMajor, 1000)
  assert.equal(again!.amountMinor, 100000)
})

check('I – payment summary derived (DEMO never paid)', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_sum' })
  saveBookings([booking])
  assert.equal(deriveBookingPaymentSummary([]), 'unpaid')
  const deposit = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 30000,
    paymentType: 'deposit',
    isDemoPayment: true,
  })
  assert.ok(deposit.ok)
  assert.equal(
    deriveBookingPaymentSummary(listPaymentsForBooking(booking.id)),
    'deposit_pending',
  )
  assert.notEqual(
    deriveBookingPaymentSummary(listPaymentsForBooking(booking.id)),
    'paid',
  )
})

check('J – cancellation fee always 0 while provider inactive', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_fee' })
  const policy = ensureDefaultBookingPolicy(PRO_ID)
  const fee = calculateCancellationFee(booking, policy)
  assert.equal(fee.amountMinor, 0)
  assert.equal(fee.reason, 'provider_inactive')
})

check('K – refund creates linked Payment without deleting original', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_ref' })
  saveBookings([booking])
  const original = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 100000,
    paymentType: 'full',
    isDemoPayment: true,
  })
  assert.ok(original.ok)
  const partial = createRefund(original.value.id, 40000)
  assert.ok(partial.ok)
  assert.equal(partial.value.paymentType, 'refund')
  assert.equal(partial.value.refundOfPaymentId, original.value.id)
  assert.equal(partial.value.amountMinor, 40000)
  assert.equal(partial.value.status, 'pending')
  assert.ok(getPayment(original.value.id))
  const full = createRefund(original.value.id)
  assert.ok(full.ok)
  assert.equal(full.value.amountMinor, 100000)
})

await checkAsync('L – DemoPaymentProvider never charges', async () => {
  seedBase()
  const provider = new DemoPaymentProvider()
  const created = await provider.createPayment({
    bookingId: 'bkg_demo',
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 50000,
    paymentType: 'full',
  })
  assert.ok(demoProviderNeverCharges(created))
  assert.ok(created.ok)
  assert.equal(created.value.status, 'pending')
  assert.equal(created.value.isDemoPayment, true)

  const auth = await provider.authorizePayment(created.value.id)
  assert.ok(demoProviderNeverCharges(auth))
  assert.equal(auth.ok, false)

  const cap = await provider.capturePayment(created.value.id)
  assert.ok(demoProviderNeverCharges(cap))
  assert.equal(cap.ok, false)
})

check('M – no fake paid state via updatePaymentStatus', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_nopaid' })
  saveBookings([booking])
  const pay = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 10000,
    paymentType: 'full',
    isDemoPayment: true,
  })
  assert.ok(pay.ok)
  const blocked = updatePaymentStatus(pay.value.id, 'paid')
  assert.equal(blocked.ok, false)
  assert.equal(getPayment(pay.value.id)!.status, 'pending')
})

check('N – membership billing remains separate', () => {
  const sub = getSubscriptionProvider()
  const pay = getPaymentProvider()
  assert.ok(sub)
  assert.ok(pay)
  assert.notEqual(sub.constructor.name, pay.constructor.name)
  // Purpose reserved but unused for membership
  const booking = makeBooking({ serviceId: 'svc_mem' })
  saveBookings([booking])
  const p = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 1000,
    paymentType: 'full',
    isDemoPayment: true,
  })
  assert.ok(p.ok)
  assert.equal(p.value.purpose, 'BOOKING_PAYMENT')
  assert.notEqual(p.value.purpose, 'MEMBERSHIP_PAYMENT')
})

check('O – privacy strips providerPaymentId and account', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_priv' })
  saveBookings([booking])
  const pay = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 10000,
    paymentType: 'full',
    isDemoPayment: true,
  })
  assert.ok(pay.ok)
  const withSecret: Payment = {
    ...pay.value,
    providerPaymentId: 'pi_secret_123',
  }
  upsertPayment(withSecret)
  const pub = toPublicPayment(getPayment(pay.value.id)!)
  assert.equal('providerPaymentId' in pub, false)
  assert.equal('ownerAccountId' in pub, false)
  assert.ok(assertPaymentPayloadSafe(pub))
  assert.ok(assertNoSensitivePaymentData(pay.value))
  assert.equal(assertNoSensitivePaymentData({ cardNumber: '4111' }), false)
})

check('P – persistence round-trip', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_pers' })
  saveBookings([booking])
  const pay = createPaymentRecord({
    bookingId: booking.id,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 12300,
    paymentType: 'deposit',
    isDemoPayment: true,
    serviceNameSnapshot: 'Persist',
    priceSnapshotMajor: 123,
    currencySnapshot: 'CZK',
  })
  assert.ok(pay.ok)
  const reloaded = loadPayments()
  const found = reloaded.find((p) => p.id === pay.value.id)
  assert.ok(found)
  assert.equal(found!.amountMinor, 12300)
  assert.equal(found!.currency, 'CZK')
  assert.equal(found!.isDemoPayment, true)
})

check('Q – regression booking status untouched by payment', () => {
  seedBase()
  const svc = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Reg booking',
    durationMinutes: 30,
    price: 500,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'deposit',
    requiresDeposit: true,
    depositType: 'percentage',
    depositValue: 30,
  })
  assert.ok(svc.ok)
  const booking = makeBooking({
    serviceId: svc.value.id,
    priceSnapshot: 500,
    status: 'requested',
  })
  saveBookings([booking])
  const intent = preparePaymentIntentForBooking(booking.id)
  assert.ok(intent && intent.ok)
  const after = getBooking(booking.id)
  assert.ok(after)
  assert.equal(after!.status, 'requested')
})

check('R – regression booking rules / policy', () => {
  seedBase()
  const policy = ensureDefaultBookingPolicy(PRO_ID)
  assert.equal(policy.cancellationNoticeHours, 24)
  const booking = makeBooking({
    serviceId: 'svc_rules',
    status: 'confirmed',
    startAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
    endAt: new Date(Date.now() + 49 * 3600_000).toISOString(),
  })
  const checkCancel = canOwnerCancelByPolicy(booking, policy)
  assert.equal(checkCancel.allowed, true)
})

check('S – regression reviews still require completed', () => {
  seedBase()
  const booking = makeBooking({ serviceId: 'svc_rev', status: 'requested' })
  assert.equal(canCreateReview(booking, OWNER_ID, []).ok, false)
  booking.status = 'completed'
  booking.completedAt = new Date().toISOString()
  assert.equal(canCreateReview(booking, OWNER_ID, []).ok, true)
})

check('T – payment notification types registered; builders safe; no fake received required', () => {
  for (const t of [
    'payment_required',
    'payment_received',
    'payment_failed',
    'payment_refunded',
  ] as const) {
    assert.ok(NOTIFICATION_TYPES.includes(t))
  }
  const draft = buildPaymentNotification({
    event: 'payment_required',
    paymentId: 'pay_x',
    bookingId: 'bkg_x',
    recipientAccountId: OWNER_ID,
    amountLabel: '300 Kč',
  })
  assert.ok(draft)
  assert.equal(draft!.type, 'payment_required')
  assert.ok(isSafePaymentNotificationPayload(draft))
  // Builders exist for received but DEMO must not auto-emit — just verify builder works
  const received = buildPaymentNotification({
    event: 'payment_received',
    paymentId: 'pay_y',
    bookingId: 'bkg_y',
    recipientAccountId: OWNER_ID,
  })
  assert.ok(received)
})

check('professional defaults do not force online payment for vet', () => {
  const vet = suggestedPaymentDefaults('veterinarian')
  assert.equal(vet.paymentCollection, 'pay_on_site')
  const groomer = suggestedPaymentDefaults('groomer')
  assert.equal(groomer.paymentCollection, 'deposit')
})

check('pay_on_site creates no payment intent', () => {
  seedBase()
  const svc = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Na místě',
    durationMinutes: 30,
    price: 400,
    currency: 'CZK',
    priceType: 'fixed',
    paymentCollection: 'pay_on_site',
  })
  assert.ok(svc.ok)
  const booking = makeBooking({ serviceId: svc.value.id, priceSnapshot: 400 })
  saveBookings([booking])
  const intent = preparePaymentIntentForBooking(booking.id)
  assert.equal(intent, null)
  assert.equal(listPaymentsForBooking(booking.id).length, 0)
})

check('savePayments clears / empty array', () => {
  savePayments([])
  assert.equal(loadPayments().length, 0)
})

console.log(`\nassert-payments: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed} ok, ${failed} fail)\n`)
if (failed) process.exit(1)
