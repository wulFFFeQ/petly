/**
 * E2E: Booking payments UI (KROK 33)
 * Run: node scripts/e2e-payments.mjs
 * Requires: npm run dev
 *
 * U – owner flow (booking detail payment section, no Pay button)
 * V – professional flow (service payment settings)
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
    path: path.join(OUT, `payments-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ID = 'e2e_pay_pro'
const PET_ID = 'e2e_pay_luna'
const SVC_ONSITE = 'e2e_pay_svc_onsite'
const SVC_DEPOSIT = 'e2e_pay_svc_deposit'
const BOOKING_NOPAY = 'e2e_pay_bkg_nopay'
const BOOKING_DEPOSIT = 'e2e_pay_bkg_deposit'
const PAY_DEPOSIT = 'e2e_pay_deposit_1'

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
  displayName: 'E2E Pay Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'groomer',
  displayName: 'E2E Pay Groomer',
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
    professionalName: 'E2E Pay Groomer',
    serviceNameSnapshot: 'Základní stříhání',
    priceSnapshot: 800,
    currencySnapshot: 'CZK',
    ownerDisplayName: 'E2E Pay Owner',
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
    professionalName: 'E2E Pay Groomer',
    serviceNameSnapshot: 'Kompletní grooming',
    priceSnapshot: 1000,
    currencySnapshot: 'CZK',
    ownerDisplayName: 'E2E Pay Owner',
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
      if (sessionStorage.getItem('lovedandknown.e2eSeeded') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
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
    // U – owner: booking without payment
    await page.goto(`${BASE}/bookings/${BOOKING_NOPAY}`, { waitUntil: 'networkidle' })
    await shot(page, 'owner-nopay')
    assert(await page.getByTestId('booking-payment-section').isVisible(), 'U payment section visible')
    assert(await page.getByTestId('booking-payment-none').isVisible(), 'U no payment records')
    assert(
      await page.getByTestId('booking-payment-disclaimer').isVisible(),
      'U disclaimer visible',
    )
    const payBtn = page.getByRole('button', { name: /zaplatit/i })
    assert((await payBtn.count()) === 0, 'U no Zaplatit button')

    // U – owner: DEMO deposit pending
    await page.goto(`${BASE}/bookings/${BOOKING_DEPOSIT}`, { waitUntil: 'networkidle' })
    await shot(page, 'owner-deposit')
    assert(await page.getByTestId('booking-payment-list').isVisible(), 'U deposit list visible')
    const summary = await page.getByTestId('booking-payment-summary').innerText()
    assert(!/proběhla|zaplaceno$/i.test(summary.toLowerCase()) || /záloha|demo/i.test(summary), 'U no fake paid claim')
    assert(await page.getByText('DEMO').first().isVisible(), 'U DEMO badge on payment')

    // Public profile deposit label
    await page.goto(`${BASE}/professionals/${PRO_ID}`, { waitUntil: 'networkidle' })
    await shot(page, 'public-service')
    const depositLabel = page.getByTestId(`service-deposit-label-${SVC_DEPOSIT}`)
    assert(await depositLabel.isVisible(), 'U public deposit label')
    assert((await depositLabel.innerText()).includes('30'), 'U deposit shows 30%')

    // V – professional services payment settings
    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
    })
    await page.goto(`${BASE}/professional/services`, { waitUntil: 'networkidle' })
    await shot(page, 'pro-services')
    await page.getByTestId('add-service').click()
    assert(await page.getByTestId('service-payment-section').isVisible(), 'V payment section in form')
    assert(await page.getByTestId('service-payment-collection').isVisible(), 'V payment collection select')
    await page.getByTestId('service-payment-collection').selectOption('deposit')
    assert(await page.getByTestId('service-deposit-type').isVisible(), 'V deposit type visible')
    assert(await page.getByTestId('service-deposit-value').isVisible(), 'V deposit value visible')
    assert(await page.getByTestId('service-payment-hint').isVisible(), 'V preparing payments hint')

    // V – professional booking detail
    await page.goto(`${BASE}/professional/bookings/${BOOKING_DEPOSIT}`, {
      waitUntil: 'networkidle',
    })
    await shot(page, 'pro-booking')
    assert(
      await page.getByTestId('booking-payment-section').isVisible(),
      'V payment section on pro booking',
    )
    assert(
      (await page.getByRole('button', { name: /zaplatit/i }).count()) === 0,
      'V no Zaplatit button',
    )
  } catch (err) {
    failures.push(String(err))
    console.error(err)
    await shot(page, 'error')
  } finally {
    await browser.close()
  }

  console.log(
    `\nE2E payments: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${failures.length} failures)`,
  )
  if (failures.length) process.exit(1)
}

main()
