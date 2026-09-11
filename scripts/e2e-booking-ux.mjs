/**
 * E2E: Booking UX (KROK 26)
 * Run: node scripts/e2e-booking-ux.mjs
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
    path: path.join(OUT, `booking-ux-${name}.png`),
    fullPage: true,
  })
}

const VET_ID = 'e2e_ux_vet'
const PET_ID = 'e2e_ux_luna'

const SEED_ACCOUNT = {
  id: 'owner_self',
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E UX Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: VET_ID,
  accountId: 'owner_self',
  type: 'veterinarian',
  displayName: 'MVDr. E2E UX Vet',
  city: 'Praha',
  services: ['Preventivní péče'],
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PET = {
  id: PET_ID,
  name: 'Luna UX',
  type: 'dog',
  breed: 'Labrador',
  age: 2,
  image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=200',
  gender: 'Fena',
  weight: 25,
  healthStatus: 'healthy',
}

async function seed(page) {
  await page.addInitScript(
    ({ account, profile, pet }) => {
      // Only bootstrap once per browser context — never wipe live booking data on SPA navigations.
      if (sessionStorage.getItem('lovedandknown.e2eSeeded') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalAvailability', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
      localStorage.setItem('lovedandknown.calendarEvents', JSON.stringify([]))
    },
    { account: SEED_ACCOUNT, profile: SEED_PROFILE, pet: SEED_PET },
  )
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(
    ({ account, profile, pet }) => {
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalAvailability', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
      localStorage.setItem('lovedandknown.calendarEvents', JSON.stringify([]))
    },
    { account: SEED_ACCOUNT, profile: SEED_PROFILE, pet: SEED_PET },
  )
  await page.reload({ waitUntil: 'networkidle' })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  try {
    await seed(page)

    // Empty state
    await page.goto(`${BASE}/bookings`)
    await page.waitForSelector('[data-testid="my-bookings-page"]')
    assert(
      (await page.locator('[data-testid="bookings-empty-all"]').count()) > 0,
      'Empty state on /bookings',
    )
    await shot(page, 'empty')

    // Request flow
    await page.goto(`${BASE}/professionals/${VET_ID}`)
    await page.waitForSelector('[data-testid="professional-public-page"]')
    const bookBtn = page.locator('[data-testid^="book-service-"]').first()
    const anyBook = page.locator('[data-testid="book-any-service"]')
    if ((await bookBtn.count()) > 0) await bookBtn.click()
    else await anyBook.click()

    await page.waitForSelector('[data-testid="booking-step-pet"], [data-testid="booking-step-service"]', {
      timeout: 10000,
    })
    if (await page.locator('[data-testid="booking-step-service"]').count()) {
      await page.locator('[data-testid="booking-step-service"] [data-testid^="book-service-"]').first().click()
    }

    await page.waitForSelector('[data-testid="booking-step-pet"]', { timeout: 10000 })
    const petBtn = page.locator(`[data-testid="booking-pet-${PET_ID}"]`)
    if ((await petBtn.count()) === 0) {
      const empty = await page.locator('[data-testid="booking-add-pet-cta"]').count()
      throw new Error(`Pet not listed in booking modal (add-pet CTA visible: ${empty > 0})`)
    }
    assert((await petBtn.textContent())?.includes('Luna UX'), 'Pet card shows name')
    await petBtn.click()

    await page.waitForSelector('[data-testid="booking-step-slot"]')
    const dayButtons = page.locator('[data-testid^="booking-day-"]')
    const dayCount = await dayButtons.count()
    let found = false
    for (let i = 0; i < dayCount; i++) {
      await dayButtons.nth(i).click()
      await page.waitForTimeout(80)
      const slots = page.locator('[data-testid^="booking-time-"]')
      if ((await slots.count()) > 0) {
        await slots.first().click()
        found = true
        break
      }
    }
    assert(found, 'Available slot selectable')
    await page.locator('[data-testid="booking-slot-continue"]').click()
    await page.locator('[data-testid="booking-note-continue"]').click()

    await page.waitForSelector('[data-testid="booking-step-summary"]')
    const summary = await page.locator('[data-testid="booking-step-summary"]').textContent()
    assert(summary?.includes('Rezervace bude potvrzena až profesionálem'), 'Summary disclaimer')
    await page.locator('[data-testid="booking-submit"]').click()

    await page.waitForSelector('[data-testid="booking-confirmation"]')
    await page.locator('[data-testid="booking-confirmation-view"]').click()
    await page.waitForSelector('[data-testid="my-booking-detail-page"]')
    assert(
      (await page.locator('[data-testid="booking-detail"]').count()) > 0,
      'Owner booking detail',
    )
    await shot(page, 'owner-detail')

    const bookingId = await page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem('lovedandknown.bookings') || '[]')
      return list[0]?.id
    })
    assert(Boolean(bookingId), 'Booking id exists')

    // Owner list
    await page.goto(`${BASE}/bookings`)
    await page.waitForSelector('[data-testid="my-bookings-list"]')
    assert(
      (await page.locator(`[data-testid="my-booking-card-${bookingId}"]`).count()) > 0,
      'Owner sees booking card',
    )

    // Denied foreign URL simulation: clear owner mismatch by navigating with wrong id
    await page.goto(`${BASE}/bookings/not_mine`)
    await page.waitForSelector('[data-testid="my-booking-denied"]')
    assert(
      (await page.locator('[data-testid="my-booking-denied"]').count()) > 0,
      'Denied for unknown booking',
    )

    // Pro confirm
    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE}/professional/bookings`)
    await page.waitForSelector('[data-testid="professional-bookings-stats"]')
    assert(
      (await page.locator('[data-testid="professional-bookings-stats"]').count()) > 0,
      'Pro stats visible',
    )
    await page.goto(`${BASE}/professional/bookings/${bookingId}`)
    await page.waitForSelector('[data-testid="new-booking-request-banner"]')
    await page.locator('[data-testid="booking-confirm"]').click()
    await page.waitForTimeout(250)

    const status = await page.evaluate((id) => {
      const list = JSON.parse(localStorage.getItem('lovedandknown.bookings') || '[]')
      return list.find((b) => b.id === id)?.status
    }, bookingId)
    assert(status === 'confirmed', 'Confirmed after pro action')

    const notifs = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]'),
    )
    assert(
      notifs.some((n) => n.type === 'booking_requested' || n.type === 'booking_confirmed'),
      'Notifications present',
    )
  } catch (err) {
    failures.push(String(err))
    console.error(err)
    try {
      await shot(page, 'error')
    } catch {
      /* ignore */
    }
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nE2E booking UX OK')
}

main()
