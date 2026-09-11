/**
 * E2E: Stripe Checkout UI (KROK 35)
 * Run: node scripts/e2e-stripe-checkout.mjs
 * Requires: npm run dev
 *
 * - owner opens booking with payment section
 * - DEMO CTA shows preparing
 * - no fake checkout URL / card form / paid state
 * - privacy-safe payment detail
 * - professional sees payment without owner secrets
 * - booking / messaging / membership remain functional
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = path.join(process.cwd(), 'scripts', 'e2e-artifacts')
const failures = []

function assert(cond, msg) {
  if (!cond) {
    failures.push(msg)
    console.error('FAIL:', msg)
  } else {
    console.log('OK  :', msg)
  }
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({
    path: path.join(OUT, `stripe-checkout-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ID = 'e2e_co_pro'
const PET_ID = 'e2e_co_luna'
const SVC_ONSITE = 'e2e_co_svc_onsite'
const SVC_DEPOSIT = 'e2e_co_svc_deposit'
const BOOKING_NOPAY = 'e2e_co_bkg_nopay'
const BOOKING_DEPOSIT = 'e2e_co_bkg_deposit'
const PAY_DEPOSIT = 'e2e_co_deposit_1'

function daysFromNow(offset, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function endOf(startIso, minutes = 60) {
  const d = new Date(startIso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

const startNoPay = daysFromNow(5, 11)
const startDeposit = daysFromNow(7, 14)

const SEED_ACCOUNT = {
  id: OWNER_ID,
  kind: 'consumer',
  roles: ['owner', 'groomer'],
  displayName: 'E2E Checkout Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'groomer',
  displayName: 'E2E Checkout Groomer',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_SERVICES = [
  {
    id: SVC_ONSITE,
    professionalId: PRO_ID,
    name: 'Základní stříhání',
    durationMinutes: 60,
    category: 'grooming',
    priceType: 'fixed',
    price: 800,
    currency: 'CZK',
    publicVisibility: 'public',
    active: true,
    bookingEnabled: true,
    paymentCollection: 'pay_on_site',
    requiresDeposit: false,
    isDemo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: SVC_DEPOSIT,
    professionalId: PRO_ID,
    name: 'Kompletní grooming',
    durationMinutes: 90,
    category: 'grooming',
    priceType: 'fixed',
    price: 1000,
    currency: 'CZK',
    publicVisibility: 'public',
    active: true,
    bookingEnabled: true,
    paymentCollection: 'deposit',
    requiresDeposit: true,
    depositType: 'percentage',
    depositValue: 30,
    isDemo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_BOOKINGS = [
  {
    id: BOOKING_NOPAY,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: SVC_ONSITE,
    petId: PET_ID,
    startAt: startNoPay,
    endAt: endOf(startNoPay, 60),
    status: 'requested',
    petName: 'Luna',
    professionalName: 'E2E Checkout Groomer',
    serviceNameSnapshot: 'Základní stříhání',
    priceSnapshot: 800,
    currencySnapshot: 'CZK',
    ownerDisplayName: 'E2E Checkout Owner',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: BOOKING_DEPOSIT,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: SVC_DEPOSIT,
    petId: PET_ID,
    startAt: startDeposit,
    endAt: endOf(startDeposit, 90),
    status: 'requested',
    petName: 'Luna',
    professionalName: 'E2E Checkout Groomer',
    serviceNameSnapshot: 'Kompletní grooming',
    priceSnapshot: 1000,
    currencySnapshot: 'CZK',
    ownerDisplayName: 'E2E Checkout Owner',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_PAYMENTS = [
  {
    id: PAY_DEPOSIT,
    bookingId: BOOKING_DEPOSIT,
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    amountMinor: 30000,
    platformFeeMinor: 3000,
    professionalAmountMinor: 27000,
    chargePattern: 'destination_charge',
    currency: 'CZK',
    paymentType: 'deposit',
    status: 'pending',
    purpose: 'BOOKING_PAYMENT',
    provider: 'demo',
    isDemoPayment: true,
    serviceNameSnapshot: 'Kompletní grooming',
    priceSnapshotMajor: 1000,
    currencySnapshot: 'CZK',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.addInitScript(
    ({ account, profile, services, bookings, payments, petId }) => {
      if (sessionStorage.getItem('lovedandknown.e2eSeededCheckout') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeededCheckout', '1')
      sessionStorage.setItem('lovedandknown.e2e', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.selfAccountId', account.id)
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify(services))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify(bookings))
      localStorage.setItem('lovedandknown.payments', JSON.stringify(payments))
      localStorage.setItem(
        'lovedandknown.pets',
        JSON.stringify([
          {
            id: petId,
            name: 'Luna',
            type: 'dog',
            breed: 'Pudl',
            age: 2,
            gender: 'female',
            weight: 8,
            avatar:
              'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=200&q=80',
          },
        ]),
      )
    },
    {
      account: SEED_ACCOUNT,
      profile: SEED_PROFILE,
      services: SEED_SERVICES,
      bookings: SEED_BOOKINGS,
      payments: SEED_PAYMENTS,
      petId: PET_ID,
    },
  )

  try {
    // Owner: deposit booking — payment section + DEMO CTA
    await page.goto(`${BASE}/bookings/${BOOKING_DEPOSIT}`, { waitUntil: 'networkidle' })
    await shot(page, 'owner-deposit')
    assert(await page.getByTestId('booking-payment-section').isVisible(), 'payment section visible')
    assert(await page.getByTestId('booking-payment-checkout-cta').isVisible(), 'DEMO CTA visible')
    const ctaText = await page.getByTestId('booking-payment-checkout-cta').innerText()
    assert(/připravit platbu/i.test(ctaText), 'CTA is Připravit platbu (not Zaplatit)')
    assert((await page.getByRole('button', { name: /^zaplatit$/i }).count()) === 0, 'no Zaplatit')
    assert((await page.locator('input[name="cardNumber"], input[autocomplete="cc-number"]').count()) === 0, 'no card form')

    await page.getByTestId('booking-payment-checkout-cta').click()
    assert(await page.getByTestId('booking-payment-preparing-modal').isVisible(), 'preparing modal')
    const msg = await page.getByTestId('booking-payment-preparing-message').innerText()
    assert(/dostupné později|připrav/i.test(msg), 'preparing message')
    assert(!/https:\/\/checkout\.stripe\.com/i.test(await page.content()), 'no fake Stripe checkout URL')

    const html = await page.content()
    assert(!/providerPaymentId|sk_live|whsec_/i.test(html), 'privacy-safe (no secrets in DOM)')

    // Success return route — must not claim paid
    await page.goto(`${BASE}/payment/success?paymentId=${PAY_DEPOSIT}`, {
      waitUntil: 'networkidle',
    })
    await shot(page, 'success')
    assert(await page.getByTestId('payment-success-page').isVisible(), 'success page')
    const successText = await page.getByTestId('payment-success-page').locator('h1').innerText()
    assert(/odeslána ke zpracování/i.test(successText), 'processing copy')
    assert(await page.getByTestId('payment-success-demo-note').isVisible(), 'DEMO not paid note')

    await page.goto(`${BASE}/payment/cancel?paymentId=${PAY_DEPOSIT}`, {
      waitUntil: 'networkidle',
    })
    assert(await page.getByTestId('payment-cancel-page').isVisible(), 'cancel page')

    // pay_on_site — no CTA
    await page.goto(`${BASE}/bookings/${BOOKING_NOPAY}`, { waitUntil: 'networkidle' })
    assert((await page.getByTestId('booking-payment-checkout-cta').count()) === 0, 'no CTA on pay_on_site')

    // Professional booking detail — payment visible, no owner checkout CTA
    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
    })
    await page.goto(`${BASE}/professional/bookings/${BOOKING_DEPOSIT}`, {
      waitUntil: 'networkidle',
    })
    await shot(page, 'pro-deposit')
    assert(await page.getByTestId('booking-payment-section').isVisible(), 'pro payment section')
    assert((await page.getByTestId('booking-payment-checkout-cta').count()) === 0, 'pro no checkout CTA')
    const proHtml = await page.content()
    assert(!/providerPaymentId|ownerAccountId|sk_test/i.test(proHtml), 'pro privacy-safe')

    // Messaging still reachable
    await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle' })
    assert(page.url().includes('/messages'), 'messaging route ok')

    // Membership unaffected
    await page.goto(`${BASE}/membership`, { waitUntil: 'networkidle' })
    assert(page.url().includes('/membership'), 'membership route ok')

    // Bookings list still works
    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
    })
    await page.goto(`${BASE}/bookings`, { waitUntil: 'networkidle' })
    assert(page.url().includes('/bookings'), 'bookings list ok')
  } catch (err) {
    failures.push(String(err))
    console.error(err)
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\nE2E failed: ${failures.length}`)
    process.exit(1)
  }
  console.log('\nE2E stripe-checkout passed')
}

main()
