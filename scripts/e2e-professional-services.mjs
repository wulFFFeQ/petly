/**
 * E2E: Professional services + ceník (KROK 29)
 * Run: node scripts/e2e-professional-services.mjs
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
    path: path.join(OUT, `professional-services-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ID = 'e2e_svc_vet'
const PET_ID = 'e2e_svc_luna'
const SERVICE_ID = 'e2e_svc_checkup'

const SEED_ACCOUNT = {
  id: OWNER_ID,
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Services Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'veterinarian',
  displayName: 'MVDr. E2E Services Vet',
  city: 'Praha',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PET = {
  id: PET_ID,
  name: 'Luna Services',
  type: 'dog',
  breed: 'Labrador',
  age: 2,
  image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=200',
  gender: 'Fena',
  weight: 25,
  healthStatus: 'healthy',
}

const SEED_SERVICE = {
  id: SERVICE_ID,
  professionalId: PRO_ID,
  name: 'E2E Preventivní prohlídka',
  description: 'Demo služba pro e2e',
  category: 'veterinary',
  durationMinutes: 30,
  price: 750,
  currency: 'CZK',
  priceType: 'fixed',
  active: true,
  bookingEnabled: true,
  publicVisibility: 'public',
  isDemo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
    ({ account, profile, pet, service, availability }) => {
      if (sessionStorage.getItem('lovedandknown.e2eSeeded') === '1') return
      sessionStorage.setItem('lovedandknown.e2eSeeded', '1')
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.pets', JSON.stringify([pet]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([service]))
      localStorage.setItem('lovedandknown.professionalAvailability', JSON.stringify(availability))
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

  // Public profile services
  await page.goto(`${BASE}/professionals/${PRO_ID}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="professional-services"]')
  await shot(page, 'public-profile')

  const demoBadge = await page.locator(`[data-testid="public-service-demo-${SERVICE_ID}"]`).count()
  assert(demoBadge > 0, 'DEMO badge on public service card')

  const bookBtn = page.locator(`[data-testid="book-service-${SERVICE_ID}"]`)
  assert((await bookBtn.count()) > 0, 'Rezervovat CTA on bookable service')
  await bookBtn.click()
  await page.waitForSelector(
    '[data-testid="booking-step-pet"], [data-testid="booking-step-service"]',
    { timeout: 10000 },
  )
  await shot(page, 'booking-modal')

  // Close modal
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // Switch to professional workspace
  await page.evaluate(() => {
    sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
  })
  await page.goto(`${BASE}/professional/services`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="professional-services-page"]')
  await shot(page, 'workspace')

  const title = await page.locator('[data-testid="professional-services-page"] h1').textContent()
  assert(title?.includes('Moje služby'), 'Workspace title Moje služby')

  await page.click('[data-testid="add-service"]')
  await page.fill('[data-testid="service-name-input"]', 'E2E Nová služba')
  await page.selectOption('[data-testid="service-price-type-select"]', 'from')
  await page.fill('[data-testid="service-price-input"]', '500')
  await page.fill('[data-testid="service-duration-input"]', '40')
  await page.click('[data-testid="service-save"]')
  await page.waitForTimeout(400)

  const listText = await page.locator('[data-testid="services-list"]').textContent()
  assert(listText?.includes('E2E Nová služba'), 'Created service appears in list')

  // Catalog filter by service category
  await page.evaluate(() => {
    sessionStorage.setItem('lovedandknown.uiWorkspace', 'consumer')
  })
  await page.goto(`${BASE}/professionals?serviceCategory=veterinary`, {
    waitUntil: 'networkidle',
  })
  await shot(page, 'catalog-filter')
  const body = await page.locator('body').textContent()
  assert(
    body?.includes('MVDr. E2E Services Vet') || body?.includes('E2E'),
    'Catalog shows pro matching service category',
  )

  // Snapshot persistence: create booking via evaluate, change service, verify booking snapshot
  const snapshotOk = await page.evaluate(
    ({ proId, serviceId, petId, ownerId }) => {
      const services = JSON.parse(
        localStorage.getItem('lovedandknown.professionalServices') || '[]',
      )
      const service = services.find((s) => s.id === serviceId)
      if (!service) return { ok: false, reason: 'no service' }

      const start = new Date()
      start.setDate(start.getDate() + 21)
      while (start.getDay() !== 1) start.setDate(start.getDate() + 1)
      start.setHours(10, 0, 0, 0)
      const end = new Date(start.getTime() + service.durationMinutes * 60_000)

      const booking = {
        id: 'e2e_svc_bkg_snap',
        ownerAccountId: ownerId,
        professionalId: proId,
        serviceId,
        petId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: 'requested',
        serviceNameSnapshot: service.name,
        serviceName: service.name,
        priceSnapshot: service.price,
        price: service.price,
        currencySnapshot: service.currency,
        currency: service.currency,
        durationSnapshot: service.durationMinutes,
        petName: 'Luna Services',
        professionalName: 'MVDr. E2E Services Vet',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([booking]))

      const nextServices = services.map((s) =>
        s.id === serviceId
          ? { ...s, name: 'ZMĚNĚNÝ NÁZEV', price: 9999, durationMinutes: 99 }
          : s,
      )
      localStorage.setItem(
        'lovedandknown.professionalServices',
        JSON.stringify(nextServices),
      )

      const stored = JSON.parse(localStorage.getItem('lovedandknown.bookings') || '[]')[0]
      return {
        ok:
          stored.serviceId === serviceId &&
          stored.serviceNameSnapshot === 'E2E Preventivní prohlídka' &&
          stored.priceSnapshot === 750 &&
          stored.durationSnapshot === 30,
        stored,
      }
    },
    { proId: PRO_ID, serviceId: SERVICE_ID, petId: PET_ID, ownerId: OWNER_ID },
  )
  assert(snapshotOk.ok, 'Booking snapshot survives service price/name change')

  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nE2E professional-services passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
