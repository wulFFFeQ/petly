/**
 * E2E: Stripe Connect UI (KROK 34)
 * Run: node scripts/e2e-stripe-connect.mjs
 * Requires: npm run dev
 *
 * X – professional payments page (disabled CTA, DEMO copy)
 * Y – owner booking payment (no fake pay, preparing copy)
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
    path: path.join(OUT, `stripe-connect-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ID = 'e2e_connect_pro'
const PET_ID = 'e2e_connect_luna'
const SVC_ONSITE = 'e2e_connect_svc_onsite'
const SVC_DEPOSIT = 'e2e_connect_svc_deposit'
const BOOKING_NOPAY = 'e2e_connect_bkg_nopay'
const BOOKING_DEPOSIT = 'e2e_connect_bkg_deposit'
const PAY_DEPOSIT = 'e2e_connect_deposit_1'

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
  displayName: 'E2E Connect Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'groomer',
  displayName: 'E2E Connect Groomer',
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
    professionalName: 'E2E Connect Groomer',
    serviceNameSnapshot: 'Základní stříhání',
    priceSnapshot: 800,
    currencySnapshot: 'CZK',
    ownerDisplayName: 'E2E Connect Owner',
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
    professionalName: 'E2E Connect Groomer',
    serviceNameSnapshot: 'Kompletní grooming',
    priceSnapshot: 1000,
    currencySnapshot: 'CZK',
    ownerDisplayName: 'E2E Connect Owner',
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
      if (sessionStorage.getItem('lovedandknown.e2eSeededConnect') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeededConnect', '1')
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
    // Y – owner: no payment required
    await page.goto(`${BASE}/bookings/${BOOKING_NOPAY}`, { waitUntil: 'networkidle' })
    await shot(page, 'owner-nopay')
    assert(await page.getByTestId('booking-payment-section').isVisible(), 'Y payment section')
    assert(await page.getByTestId('booking-payment-provider-inactive').isVisible(), 'Y online later')
    const nopaySummary = await page.getByTestId('booking-payment-summary').innerText()
    assert(/není vyžadována/i.test(nopaySummary), 'Y platba není vyžadována')
    assert((await page.getByRole('button', { name: /zaplatit|checkout/i }).count()) === 0, 'Y no checkout')

    // Y – owner: waiting for payment (DEMO)
    await page.goto(`${BASE}/bookings/${BOOKING_DEPOSIT}`, { waitUntil: 'networkidle' })
    await shot(page, 'owner-deposit')
    const depSummary = await page.getByTestId('booking-payment-summary').innerText()
    assert(/čeká na platbu/i.test(depSummary), 'Y čeká na platbu')
    assert(!(await page.getByText('Stripe připojeno').count()), 'Y no fake Stripe connected')
    assert(await page.getByText('DEMO').first().isVisible(), 'Y DEMO badge')
    assert(
      (await page.getByTestId('booking-payment-disclaimer').innerText()).toLowerCase().includes('připravujeme') ||
        (await page.getByTestId('booking-payment-disclaimer').innerText()).toLowerCase().includes('demo'),
      'Y DEMO / Připravujeme disclaimer',
    )

    // X – professional payments
    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
    })
    await page.goto(`${BASE}/professional/payments`, { waitUntil: 'networkidle' })
    await shot(page, 'pro-payments')
    assert(await page.getByTestId('professional-payments-page').isVisible(), 'X payments page')
    assert(await page.getByTestId('professional-payments-section').isVisible(), 'X payments section')
    const status = await page.getByTestId('professional-payments-status').innerText()
    assert(/nepřipojen/i.test(status), 'X Stripe účet nepřipojen')
    assert(await page.getByTestId('professional-payments-demo-badge').isVisible(), 'X DEMO badge')
    assert(
      (await page.getByTestId('professional-payments-copy').innerText()).includes('ostré verzi'),
      'X preparing copy',
    )
    const cta = page.getByTestId('professional-payments-connect-cta')
    assert(await cta.isVisible(), 'X CTA visible')
    assert(await cta.isDisabled(), 'X CTA disabled')
    assert(!(await page.getByText('Stripe připojeno').count()), 'X never Stripe připojeno')
    assert(await page.getByTestId('ppa-charges').innerText().then((t) => /nedostupné/i.test(t)), 'X charges unavailable')
    assert(await page.getByTestId('ppa-payouts').innerText().then((t) => /nedostupné/i.test(t)), 'X payouts unavailable')

    // Membership remains separate
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
    await shot(page, 'settings-membership')
    assert(
      (await page.getByText(/členství/i).count()) > 0 ||
        (await page.locator('#membership, [data-testid*="membership"]').count()) > 0,
      'X/Y membership still on settings',
    )
  } catch (err) {
    failures.push(String(err))
    console.error(err)
    await shot(page, 'error')
  } finally {
    await browser.close()
  }

  console.log(
    `\nE2E stripe-connect: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${failures.length} failures)`,
  )
  if (failures.length) process.exit(1)
}

main()
