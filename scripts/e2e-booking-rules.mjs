/**
 * E2E: Booking rules (KROK 31)
 * Run: node scripts/e2e-booking-rules.mjs
 * Requires: npm run dev
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
    path: path.join(OUT, `booking-rules-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ID = 'e2e_rules_vet'
const PET_ID = 'e2e_rules_luna'
const SERVICE_ID = 'e2e_rules_svc'

function daysFromNow(offset, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function endOf(startIso, minutes = 30) {
  const d = new Date(startIso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

const confirmedStart = daysFromNow(10, 11)
const pastStart = daysFromNow(-1, 9)

const SEED_ACCOUNT = {
  id: OWNER_ID,
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Rules Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'veterinarian',
  displayName: 'E2E Rules Vet',
  city: 'Praha',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PET = {
  id: PET_ID,
  name: 'Luna Rules',
  type: 'dog',
  breed: 'Pudel',
  age: 3,
  image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=200',
  gender: 'Fena',
  weight: 12,
  healthStatus: 'healthy',
}

const SEED_SERVICE = {
  id: SERVICE_ID,
  professionalId: PRO_ID,
  name: 'E2E Rules Service',
  description: 'Demo service',
  category: 'veterinary',
  durationMinutes: 30,
  price: 600,
  currency: 'CZK',
  priceType: 'fixed',
  publicVisibility: 'public',
  active: true,
  bookingEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_BOOKINGS = [
  {
    id: 'e2e_bkg_confirmed',
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: SERVICE_ID,
    petId: PET_ID,
    startAt: confirmedStart,
    endAt: endOf(confirmedStart),
    status: 'confirmed',
    serviceName: 'E2E Rules Service',
    serviceNameSnapshot: 'E2E Rules Service',
    petName: 'Luna Rules',
    professionalName: 'E2E Rules Vet',
    confirmedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'e2e_bkg_past',
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: SERVICE_ID,
    petId: PET_ID,
    startAt: pastStart,
    endAt: endOf(pastStart),
    status: 'confirmed',
    serviceName: 'E2E Rules Service',
    serviceNameSnapshot: 'E2E Rules Service',
    petName: 'Luna Rules',
    professionalName: 'E2E Rules Vet',
    confirmedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_POLICY = {
  professionalId: PRO_ID,
  cancellationNoticeHours: 24,
  allowReschedule: true,
  confirmMode: 'manual',
  noShowMode: 'after_start',
}

const SEED_AVAILABILITY = [0, 1, 2, 3, 4].map((weekday) => ({
  id: `e2e_av_${weekday}`,
  professionalId: PRO_ID,
  weekday,
  startTime: '09:00',
  endTime: '17:00',
  active: true,
}))

async function seed(page) {
  await page.addInitScript(
    ({ account, profile, pet, service, bookings, policy, availability }) => {
      if (sessionStorage.getItem('lovedandknown.e2eSeeded') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([service]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify(bookings))
      localStorage.setItem(
        'lovedandknown.professionalBookingPolicies',
        JSON.stringify([policy]),
      )
      localStorage.setItem(
        'lovedandknown.professionalAvailability',
        JSON.stringify(availability),
      )
      localStorage.setItem('lovedandknown.professionalAvailabilityExceptions', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
    },
    {
      account: SEED_ACCOUNT,
      profile: SEED_PROFILE,
      pet: SEED_PET,
      service: SEED_SERVICE,
      bookings: SEED_BOOKINGS,
      policy: SEED_POLICY,
      availability: SEED_AVAILABILITY,
    },
  )
}

async function main() {
  console.log(`Starting booking-rules E2E against ${BASE}`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await seed(page)

  try {
    await page.goto(`${BASE}/professional/booking-rules`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="professional-booking-rules-page"]', {
      timeout: 15000,
    })
    await shot(page, 'rules-page')
    assert(
      (await page.getByTestId('professional-booking-rules-page').count()) > 0,
      'rules page renders',
    )

    await page.getByTestId('booking-rules-cancel-hours').selectOption('48')
    await page.getByTestId('booking-rules-save').click()
    await page.waitForTimeout(400)
    assert((await page.getByTestId('booking-rules-saved').count()) > 0, 'rules save feedback')

    await page.goto(`${BASE}/professional/bookings/e2e_bkg_confirmed`, {
      waitUntil: 'networkidle',
    })
    await page.waitForSelector('[data-testid="professional-booking-detail-page"]')
    await shot(page, 'pro-booking-detail')
    assert(
      (await page.getByTestId('booking-cancel').count()) > 0,
      'cancel action visible on confirmed',
    )
    assert(
      (await page.getByTestId('booking-reschedule').count()) > 0,
      'reschedule action visible',
    )
    assert(
      (await page.getByTestId('booking-complete').isDisabled()) === true,
      'complete disabled before start',
    )

    await page.getByTestId('booking-cancel').click()
    await page.waitForTimeout(200)
    assert(
      (await page.getByTestId('cancel-confirm-question').count()) > 0,
      'cancel dialog question',
    )
    assert(
      (await page.getByTestId('cancel-reason-code').count()) > 0,
      'professional reason select required',
    )
    await page.getByTestId('cancel-reason-code').selectOption('operational')
    await page.getByTestId('booking-cancel-confirm').click()
    await page.waitForTimeout(500)
    const cancelledStatus = await page.evaluate(() => {
      const raw = localStorage.getItem('lovedandknown.bookings')
      const list = raw ? JSON.parse(raw) : []
      const b = list.find((x) => x.id === 'e2e_bkg_confirmed')
      return b?.status
    })
    assert(cancelledStatus === 'cancelled_by_professional', 'professional cancel persists')

    await page.goto(`${BASE}/professional/bookings/e2e_bkg_past`, {
      waitUntil: 'networkidle',
    })
    await page.waitForSelector('[data-testid="professional-booking-detail-page"]')
    await shot(page, 'pro-past-booking')
    assert(
      (await page.getByTestId('booking-no-show').count()) > 0,
      'no-show visible after start',
    )
    assert(
      (await page.getByTestId('booking-complete').isDisabled()) === false,
      'complete enabled after start',
    )

    await page.goto(`${BASE}/professionals/${PRO_ID}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await shot(page, 'public-policy')
    const policyEl = page.getByTestId('public-cancellation-policy')
    const policyCount = await policyEl.count()
    assert(policyCount > 0, 'public cancellation policy visible')
    if (policyCount > 0) {
      const policyText = (await policyEl.textContent()) || ''
      assert(policyText.includes('48 hodin'), 'public profile shows updated cancellation policy')
      assert(!/operational|cancellationReason|microchip/i.test(policyText), 'privacy')
    }

    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
    })
    await page.goto(`${BASE}/bookings/e2e_bkg_past`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await shot(page, 'owner-detail')
    assert(
      (await page.getByTestId('booking-no-show').count()) === 0,
      'owner cannot mark no-show',
    )
  } catch (err) {
    failures.push(String(err))
    console.error(err)
    await shot(page, 'error')
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\nE2E failed: ${failures.length}`)
    process.exit(1)
  }
  console.log('\nE2E booking-rules passed')
}

main()
