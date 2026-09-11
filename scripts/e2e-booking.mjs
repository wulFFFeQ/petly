/**
 * E2E: Booking flow (KROK 25)
 * Run: node scripts/e2e-booking.mjs
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
    path: path.join(OUT, `booking-${name}.png`),
    fullPage: true,
  })
}

const VET_ID = 'e2e_booking_vet'
const PET_ID = 'e2e_booking_luna'

const SEED_ACCOUNT = {
  id: 'owner_self',
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Booking Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: VET_ID,
  accountId: 'owner_self',
  type: 'veterinarian',
  displayName: 'MVDr. E2E Booking Vet',
  city: 'Praha',
  services: ['Preventivní péče'],
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PET = {
  id: PET_ID,
  name: 'Luna Booking',
  type: 'Pes',
  breed: 'Labrador',
  age: 2,
  image: '',
  gender: 'female',
}

async function seed(page) {
  await page.goto(BASE)
  await page.evaluate(
    ({ account, profile, pet }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalAvailability', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
      localStorage.setItem('lovedandknown.calendarEvents', JSON.stringify([]))
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
    },
    { account: SEED_ACCOUNT, profile: SEED_PROFILE, pet: SEED_PET },
  )
  await page.reload()
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  try {
    await seed(page)

    await page.goto(`${BASE}/professionals/${VET_ID}`)
    await page.waitForSelector('[data-testid="professional-public-page"]')
    await shot(page, 'public-profile')

    const bookBtn = page.locator('[data-testid^="book-service-"]').first()
    const anyBook = page.locator('[data-testid="book-any-service"]')
    const hasBook =
      (await bookBtn.count()) > 0 || (await anyBook.count()) > 0
    assert(hasBook, 'Rezervovat CTA visible on public profile')

    if ((await bookBtn.count()) > 0) await bookBtn.click()
    else await anyBook.click()

    await page.waitForSelector('[data-testid="booking-step-pet"], [data-testid="booking-step-service"]')
    // if service step, pick first service
    if (await page.locator('[data-testid="booking-step-service"]').count()) {
      await page.locator('[data-testid^="book-service-"]').first().click()
    }

    await page.waitForSelector('[data-testid="booking-step-pet"]')
    await page.locator(`[data-testid="booking-pet-${PET_ID}"]`).click()

    await page.waitForSelector('[data-testid="booking-step-slot"]')
    // pick a day with slots — click through days until slots appear
    let foundSlot = false
    const dayButtons = page.locator('[data-testid^="booking-day-"]')
    const dayCount = await dayButtons.count()
    for (let i = 0; i < dayCount; i++) {
      await dayButtons.nth(i).click()
      await page.waitForTimeout(100)
      const slots = page.locator('[data-testid^="booking-slot-"]')
      if ((await slots.count()) > 0) {
        await slots.first().click()
        foundSlot = true
        break
      }
    }
    assert(foundSlot, 'Found an available slot')
    await page.locator('[data-testid="booking-slot-continue"]').click()

    await page.waitForSelector('[data-testid="booking-step-note"]')
    await page.locator('[data-testid="booking-note-input"]').fill('E2E test note')
    await page.locator('[data-testid="booking-note-continue"]').click()

    await page.waitForSelector('[data-testid="booking-step-summary"]')
    await page.locator('[data-testid="booking-submit"]').click()

    await page.waitForSelector('[data-testid="booking-confirmation"]')
    assert(
      (await page.locator('[data-testid="booking-confirmation"]').count()) > 0,
      'Confirmation shown',
    )
    await shot(page, 'confirmation')
    await page.locator('[data-testid="booking-confirmation-close"]').click()

    const stored = await page.evaluate(() => {
      const bookings = JSON.parse(localStorage.getItem('lovedandknown.bookings') || '[]')
      const notifs = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
      const events = JSON.parse(localStorage.getItem('lovedandknown.calendarEvents') || '[]')
      return { bookings, notifs, events }
    })
    assert(stored.bookings.length >= 1, 'Booking persisted')
    assert(stored.bookings[0].status === 'requested', 'Status requested')
    assert(
      stored.notifs.some((n) => n.type === 'booking_requested'),
      'booking_requested notification',
    )
    assert(
      stored.events.some((e) => e.type === 'booking' || e.sourceBookingId),
      'Calendar booking event synced',
    )

    // Professional workspace – confirm
    await page.evaluate(() => {
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
    })
    await page.goto(`${BASE}/professional/bookings`)
    await page.waitForSelector('[data-testid="professional-bookings-page"]')
    await shot(page, 'pro-bookings')

    const bookingId = stored.bookings[0].id
    await page.goto(`${BASE}/professional/bookings/${bookingId}`)
    await page.waitForSelector('[data-testid="professional-booking-detail-page"]')
    await page.locator('[data-testid="booking-confirm"]').click()
    await page.waitForTimeout(300)

    const after = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('lovedandknown.bookings') || '[]')
    })
    const updated = after.find((b) => b.id === bookingId)
    assert(updated?.status === 'confirmed', 'Professional confirmed booking')

    await page.goto(`${BASE}/professional/services`)
    await page.waitForSelector('[data-testid="professional-services-page"]')
    assert(
      (await page.locator('[data-testid="professional-services-page"]').count()) > 0,
      'Services page loads',
    )

    await page.goto(`${BASE}/professional/availability`)
    await page.waitForSelector('[data-testid="professional-availability-page"]')
    assert(
      (await page.locator('[data-testid="availability-week"]').count()) > 0,
      'Availability page loads',
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
  console.log('\nE2E booking OK')
}

main()
