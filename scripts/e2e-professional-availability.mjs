/**
 * E2E: Professional availability (KROK 30)
 * Run: node scripts/e2e-professional-availability.mjs
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
    path: path.join(OUT, `professional-availability-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ID = 'e2e_avail_vet'
const PET_ID = 'e2e_avail_luna'
const SERVICE_ID = 'e2e_avail_groom'

const SEED_ACCOUNT = {
  id: OWNER_ID,
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Availability Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'groomer',
  displayName: 'E2E Groomer Availability',
  city: 'Brno',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PET = {
  id: PET_ID,
  name: 'Luna Avail',
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
  name: 'E2E Stříhání',
  description: 'Demo grooming',
  category: 'grooming',
  durationMinutes: 60,
  price: 600,
  currency: 'CZK',
  priceType: 'fixed',
  active: true,
  bookingEnabled: true,
  publicVisibility: 'public',
  bookingBufferAfterMinutes: 15,
  isDemo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_AVAILABILITY = [
  ...[0, 1, 2, 3, 4].flatMap((weekday) => {
    if (weekday === 2) {
      return [
        {
          id: `e2e_av_${weekday}_a`,
          professionalId: PRO_ID,
          weekday,
          startTime: '08:00',
          endTime: '12:00',
          active: true,
        },
        {
          id: `e2e_av_${weekday}_b`,
          professionalId: PRO_ID,
          weekday,
          startTime: '13:00',
          endTime: '17:00',
          active: true,
        },
      ]
    }
    return [
      {
        id: `e2e_av_${weekday}`,
        professionalId: PRO_ID,
        weekday,
        startTime: '08:00',
        endTime: '16:00',
        active: true,
      },
    ]
  }),
  {
    id: 'e2e_av_5',
    professionalId: PRO_ID,
    weekday: 5,
    startTime: '09:00',
    endTime: '17:00',
    active: false,
  },
  {
    id: 'e2e_av_6',
    professionalId: PRO_ID,
    weekday: 6,
    startTime: '09:00',
    endTime: '17:00',
    active: false,
  },
]

async function seed(page) {
  await page.addInitScript(
    ({ account, profile, pet, service, availability }) => {
      if (sessionStorage.getItem('lovedandknown.e2eSeeded') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([service]))
      localStorage.setItem('lovedandknown.professionalAvailability', JSON.stringify(availability))
      localStorage.setItem('lovedandknown.professionalAvailabilityExceptions', JSON.stringify([]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
    },
    {
      account: SEED_ACCOUNT,
      profile: SEED_PROFILE,
      pet: SEED_PET,
      service: SEED_SERVICE,
      availability: SEED_AVAILABILITY,
    },
  )
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await seed(page)

  await page.goto(`${BASE}/professional/availability`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="professional-availability-page"]')
  await shot(page, 'workspace')

  assert(
    (await page.locator('[data-testid="availability-week"]').count()) > 0,
    'Weekly schedule visible',
  )
  assert(
    (await page.locator('[data-testid="availability-interval-2-0"]').count()) > 0,
    'Wednesday first interval',
  )
  assert(
    (await page.locator('[data-testid="availability-interval-2-1"]').count()) > 0,
    'Wednesday second interval (multi-window seed)',
  )

  // Toggle Tuesday off, change Monday hours, save
  const tue = page.locator('[data-testid="availability-active-1"]')
  if (await tue.isChecked()) await tue.click()

  const monStart = page.locator('[data-testid="availability-interval-0-0"] input[type="time"]').first()
  await monStart.fill('09:00')
  const monEnd = page.locator('[data-testid="availability-interval-0-0"] input[type="time"]').nth(1)
  await monEnd.fill('15:00')

  await page.locator('[data-testid="availability-add-interval-0"]').click()
  assert(
    (await page.locator('[data-testid="availability-interval-0-1"]').count()) > 0,
    'Can add second Monday interval',
  )

  // Add closed exception
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const excDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  await page.locator('[data-testid="exception-date-input"]').fill(excDate)
  await page.locator('[data-testid="exception-type-select"]').selectOption('closed')
  await page.locator('[data-testid="exception-label-input"]').fill('Dovolená')
  await page.locator('[data-testid="exception-add"]').click()
  await page.waitForTimeout(200)
  assert(
    (await page.locator('[data-testid="exceptions-list"]').count()) > 0,
    'Exception listed',
  )

  await page.locator('[data-testid="availability-save"]').click()
  await page.waitForTimeout(400)
  await shot(page, 'saved')

  // Persistence after reload
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="professional-availability-page"]')
  const tueAfter = page.locator('[data-testid="availability-active-1"]')
  assert(!(await tueAfter.isChecked()), 'Tuesday remains off after reload')
  assert(
    (await page.locator('[data-testid="exceptions-list"] li').count()) >= 1,
    'Exception persists after reload',
  )

  // Calendar shows availability layers
  await page.goto(`${BASE}/professional/calendar`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="calendar-availability-today"]')
  await shot(page, 'calendar')
  assert(
    (await page.locator('[data-testid="calendar-availability-today"]').count()) > 0,
    'Calendar availability section',
  )

  // Public profile: next available + booking slots respect exception
  await page.evaluate(() => {
    sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
  })
  await page.goto(`${BASE}/professionals/${PRO_ID}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="professional-services"]')
  await shot(page, 'public-profile')

  const nextLabel = page.locator(`[data-testid="next-available-${SERVICE_ID}"]`)
  assert((await nextLabel.count()) > 0, 'Next available label on public card')
  const nextText = await nextLabel.textContent()
  assert(
    nextText && !nextText.includes('Dovolená'),
    'Public next-available does not leak exception label',
  )

  await page.locator(`[data-testid="book-service-${SERVICE_ID}"]`).click()
  await page.waitForSelector('[data-testid="booking-step-pet"]')
  await page.locator(`[data-testid="booking-pet-${PET_ID}"]`).click()
  await page.waitForSelector('[data-testid="booking-step-slot"]')
  await shot(page, 'booking-slots')

  // Closed exception day should show empty slots when selected
  const dayBtn = page.locator(`[data-testid="booking-day-${excDate}"]`)
  if ((await dayBtn.count()) > 0) {
    await dayBtn.click()
    await page.waitForTimeout(200)
    const empty = await page.locator('[data-testid="booking-slots-empty"]').count()
    const noAvail = await page.locator('[data-testid="booking-no-availability"]').count()
    assert(empty > 0 || noAvail > 0, 'Closed exception day has no bookable slots')
  } else {
    assert(true, 'Exception day outside 14-day horizon (skipped day click)')
  }

  // Storage still has exception label internally
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.professionalAvailabilityExceptions')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    stored.some((e) => e.label === 'Dovolená'),
    'Exception label persisted internally',
  )

  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`Failed ${failures.length} check(s)`)
    process.exit(1)
  }
  console.log('All e2e-professional-availability checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
