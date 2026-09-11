/**
 * E2E: Professional reviews (KROK 28)
 * Run: node scripts/e2e-professional-reviews.mjs
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
    path: path.join(OUT, `professional-reviews-${name}.png`),
    fullPage: true,
  })
}

const VET_ID = 'e2e_review_vet'
const PET_ID = 'e2e_review_luna'
const BOOKING_ID = 'e2e_review_bkg_completed'
const OWNER_ID = 'owner_self'

const SEED_ACCOUNT = {
  id: OWNER_ID,
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Review Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: VET_ID,
  accountId: OWNER_ID,
  type: 'veterinarian',
  displayName: 'MVDr. E2E Review Vet',
  city: 'Praha',
  services: ['Preventivní péče'],
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PET = {
  id: PET_ID,
  name: 'Luna Review',
  type: 'dog',
  breed: 'Labrador',
  age: 2,
  image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=200',
  gender: 'Fena',
  weight: 25,
  healthStatus: 'healthy',
}

const SEED_COMPLETED_BOOKING = {
  id: BOOKING_ID,
  ownerAccountId: OWNER_ID,
  professionalId: VET_ID,
  serviceId: 'e2e_review_svc',
  petId: PET_ID,
  startAt: '2026-05-01T10:00:00.000Z',
  endAt: '2026-05-01T10:30:00.000Z',
  status: 'completed',
  serviceName: 'Preventivní péče',
  petName: 'Luna Review',
  professionalName: 'MVDr. E2E Review Vet',
  createdAt: '2026-05-01T09:00:00.000Z',
  updatedAt: '2026-05-01T11:00:00.000Z',
  completedAt: '2026-05-01T11:00:00.000Z',
}

async function seed(page) {
  await page.addInitScript(
    ({ account, profile, pet, booking }) => {
      if (sessionStorage.getItem('lovedandknown.e2eSeeded') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([booking]))
      localStorage.setItem('lovedandknown.professionalReviews', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
    },
    {
      account: SEED_ACCOUNT,
      profile: SEED_PROFILE,
      pet: SEED_PET,
      booking: SEED_COMPLETED_BOOKING,
    },
  )
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(
    ({ account, profile, pet, booking }) => {
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([booking]))
      localStorage.setItem('lovedandknown.professionalReviews', JSON.stringify([]))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify([]))
    },
    {
      account: SEED_ACCOUNT,
      profile: SEED_PROFILE,
      pet: SEED_PET,
      booking: SEED_COMPLETED_BOOKING,
    },
  )
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await seed(page)

    // Catalog: empty rating (no fake 5.0)
    await page.goto(`${BASE}/professionals`, { waitUntil: 'networkidle' })
    await page.waitForSelector(`[data-testid="professional-catalog-card-${VET_ID}"]`)
    const catalogRating = await page
      .locator(`[data-testid="professional-catalog-rating-${VET_ID}"]`)
      .textContent()
    assert(
      catalogRating?.includes('Zatím bez hodnocení'),
      'catalog shows empty rating without fake stars',
    )
    assert(!catalogRating?.includes('5,0'), 'catalog must not show fake 5,0')
    await shot(page, 'catalog-empty')

    // Public profile empty
    await page.goto(`${BASE}/professionals/${VET_ID}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="professional-reviews-empty"]')
    assert(
      (await page.locator('[data-testid="professional-reviews-empty"]').count()) === 1,
      'public profile empty reviews',
    )

    // Booking detail → review CTA
    await page.goto(`${BASE}/bookings/${BOOKING_ID}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="booking-review-cta"]')
    assert(
      (await page.locator('[data-testid="booking-review-open"]').count()) === 1,
      'review CTA visible on completed booking',
    )
    await page.click('[data-testid="booking-review-open"]')
    await page.waitForSelector('[data-testid="review-booking-modal"]')
    await page.click('[data-testid="review-star-5"]')
    await page.click('[data-testid="review-step-to-text"]')
    await page.fill('[data-testid="review-title-input"]', 'Skvělá péče')
    await page.fill('[data-testid="review-text-input"]', 'Luna byla v dobrých rukou.')
    await page.click('[data-testid="review-step-to-summary"]')
    await page.click('[data-testid="review-publish"]')
    await page.waitForSelector('[data-testid="review-thanks"]')
    assert(
      (await page.locator('[data-testid="review-thanks"]').count()) === 1,
      'thanks after publish',
    )
    await page.click('[data-testid="review-done-close"]')
    await shot(page, 'after-publish')

    // Already reviewed
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="booking-review-already"]')
    assert(
      (await page.locator('[data-testid="booking-review-already"]').count()) === 1,
      'already reviewed message',
    )

    // Profile shows real rating
    await page.goto(`${BASE}/professionals/${VET_ID}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="professional-reviews-summary"]')
    const avg = await page.locator('[data-testid="professional-reviews-average"]').textContent()
    assert(avg?.includes('5'), 'profile shows real average')
    assert(
      (await page.locator('[data-testid^="review-verified-experience-"]').count()) >= 1,
      'verified experience badge on review',
    )
    await shot(page, 'profile-with-review')

    // Catalog updated
    await page.goto(`${BASE}/professionals`, { waitUntil: 'networkidle' })
    const ratingAfter = await page
      .locator(`[data-testid="professional-catalog-rating-${VET_ID}"]`)
      .textContent()
    assert(ratingAfter?.includes('5'), 'catalog shows real rating after review')
    assert(!ratingAfter?.includes('Zatím bez hodnocení'), 'catalog no longer empty')

    // Rating filter UI present
    await page.click('[data-testid="professional-catalog-advanced-toggle"]')
    await page.waitForSelector('[data-testid="professional-catalog-rating-filter"]')
    assert(
      (await page.locator('[data-testid="professional-catalog-rating-filter"]').count()) === 1,
      'rating filter in catalog',
    )
    assert(
      (await page.locator('[data-testid="professional-catalog-sort"]').count()) === 1,
      'sort control in catalog',
    )
    await shot(page, 'catalog-filters')
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

  console.log(`\nE2E professional-reviews: ${failures.length === 0 ? 'PASS' : 'FAIL'}`)
  if (failures.length) {
    for (const f of failures) console.error(' -', f)
    process.exit(1)
  }
}

main()
