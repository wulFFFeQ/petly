/**
 * E2E: Professional catalog (KROK 20)
 * Run: node scripts/e2e-professional-catalog.mjs
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
    path: path.join(OUT, `pro-catalog-${name}.png`),
    fullPage: false,
  })
}

const SEED_PROFILES = [
  {
    id: 'e2e_pro_public_vet',
    accountId: 'e2e_acc_1',
    type: 'veterinarian',
    displayName: 'MUDr. Catalog Vet',
    organizationName: 'Catalog Clinic',
    description: 'Preventivní péče a chirurgie',
    address: 'Tajná Ulice 99',
    phone: '+420999888777',
    email: 'secret-vet@example.com',
    city: 'Praha 2',
    services: ['chirurgie', 'dermatologie'],
    specializations: ['preventivní péče'],
    professionalCredentials: { licenseNumber: 'E2E-SECRET-LIC' },
    verificationStatus: 'verified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'e2e_pro_private_vet',
    accountId: 'e2e_acc_2',
    type: 'veterinarian',
    displayName: 'Hidden Private Vet',
    address: 'Soukromá 1',
    city: 'Brno',
    verificationStatus: 'unverified',
    publicVisibility: 'private',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'e2e_pro_public_groomer',
    accountId: 'e2e_acc_3',
    type: 'groomer',
    displayName: 'Salon Catalog Groom',
    city: 'Praha 5',
    services: ['střih', 'koupel'],
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_VERIFICATIONS = [
  {
    id: 'e2e_trust_vet',
    subjectType: 'professional',
    subjectId: 'e2e_pro_public_vet',
    type: 'veterinary',
    status: 'verified',
    source: 'vet_attestation',
    presentation: 'trust',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'e2e_demo_groomer',
    subjectType: 'professional',
    subjectId: 'e2e_pro_public_groomer',
    type: 'veterinary',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  },
]

async function seedCatalog(page) {
  await page.evaluate(
    ({ profiles, verifications }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify(profiles))
      localStorage.setItem('lovedandknown.verifications', JSON.stringify(verifications))
    },
    { profiles: SEED_PROFILES, verifications: SEED_VERIFICATIONS },
  )
}

async function runDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seedCatalog(page)

  // L – empty state when no public profiles
  await page.evaluate(() => {
    localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([]))
  })
  await page.goto(`${BASE}/professionals`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="professional-catalog-page"]').isVisible(),
    'catalog page visible',
  )
  assert(
    await page.locator('[data-testid="professional-catalog-empty-none"]').isVisible(),
    'L – empty none-public state',
  )

  // Restore seed
  await seedCatalog(page)
  await page.goto(`${BASE}/professionals`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // A – public professional visible
  assert(
    await page.locator('[data-testid="professional-catalog-card-e2e_pro_public_vet"]').isVisible(),
    'A – public professional card visible',
  )

  // B – private not visible
  assert(
    (await page.locator('[data-testid="professional-catalog-card-e2e_pro_private_vet"]').count()) ===
      0,
    'B – private professional not in catalog',
  )
  const bodyText = await page.locator('body').innerText()
  assert(!bodyText.includes('Hidden Private Vet'), 'B – private displayName not in body')
  assert(!bodyText.includes('Tajná Ulice'), 'F – street address not in catalog')
  assert(!bodyText.includes('secret-vet@example.com'), 'G – email not in catalog cards')
  assert(!bodyText.includes('E2E-SECRET-LIC'), 'G – license not in catalog')
  assert(!bodyText.includes('+420999888777'), 'G – phone not in catalog cards')

  // H – trust badge on verified vet
  assert(
    await page.locator('[data-testid="professional-catalog-verified-e2e_pro_public_vet"]').isVisible(),
    'H – verified trust badge on public vet',
  )

  // I – DEMO groomer has no trust badge
  assert(
    (await page
      .locator('[data-testid="professional-catalog-verified-e2e_pro_public_groomer"]')
      .count()) === 0,
    'I – DEMO verification has no trust badge',
  )

  // D – role filter
  await page.locator('[data-testid="professional-catalog-role-groomer"]').click()
  await page.waitForTimeout(200)
  assert(page.url().includes('role=groomer'), 'D – role query param set')
  assert(
    await page.locator('[data-testid="professional-catalog-card-e2e_pro_public_groomer"]').isVisible(),
    'D – groomer visible after filter',
  )
  assert(
    (await page.locator('[data-testid="professional-catalog-card-e2e_pro_public_vet"]').count()) ===
      0,
    'D – vet hidden when groomer filter active',
  )

  // M – query param survives reload
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(page.url().includes('role=groomer'), 'M – role filter survives reload')
  assert(
    await page.locator('[data-testid="professional-catalog-card-e2e_pro_public_groomer"]').isVisible(),
    'M – filtered results after reload',
  )

  // Clear role, E – search
  await page.locator('[data-testid="professional-catalog-role-all"]').click()
  await page.waitForTimeout(150)
  await page.locator('[data-testid="professional-catalog-search"]').fill('Catalog Vet')
  await page.waitForTimeout(200)
  assert(
    await page.locator('[data-testid="professional-catalog-card-e2e_pro_public_vet"]').isVisible(),
    'E – search finds public name',
  )
  assert(
    (await page.locator('[data-testid="professional-catalog-card-e2e_pro_public_groomer"]').count()) ===
      0,
    'E – search hides non-matching',
  )

  // Search must not find by email
  await page.locator('[data-testid="professional-catalog-search"]').fill('secret-vet@example.com')
  await page.waitForTimeout(200)
  assert(
    await page.locator('[data-testid="professional-catalog-empty-filtered"]').isVisible(),
    'E/G – search by email yields empty (not indexed)',
  )

  await page.locator('[data-testid="professional-catalog-clear"]').click()
  await page.waitForTimeout(150)

  // J – click opens detail
  await page.locator('[data-testid="professional-catalog-open-e2e_pro_public_vet"]').click()
  await page.waitForTimeout(400)
  assert(page.url().includes('/professionals/e2e_pro_public_vet'), 'J – detail URL')
  assert(
    await page.locator('[data-testid="professional-public-page"]').isVisible(),
    'J – public detail page',
  )
  // K – same projection (verified badge + city, no street)
  assert(
    await page.locator('[data-testid="professional-verified-badge"]').isVisible(),
    'K – detail shows verified badge',
  )
  const detailText = await page.locator('[data-testid="professional-public-page"]').innerText()
  assert(detailText.includes('Praha 2'), 'K – detail shows public city')
  assert(!detailText.includes('Tajná Ulice'), 'K/F – detail has no street address')
  await shot(page, 'detail')

  // Discover CTA
  await page.goto(`${BASE}/discover`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="discover-find-professional"]').isVisible(),
    'Discover CTA visible',
  )
  await page.locator('[data-testid="discover-find-professional"]').click()
  await page.waitForTimeout(300)
  assert(page.url().includes('/professionals'), 'Discover CTA opens catalog')

  // Contacts deep-link
  await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.locator('[data-testid="contacts-find-veterinarian"]').click()
  await page.waitForTimeout(300)
  assert(page.url().includes('role=veterinarian'), 'Contacts deep-link role=veterinarian')

  await shot(page, 'catalog-filtered')
  await context.close()
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seedCatalog(page)
  await page.goto(`${BASE}/professionals`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    }
  })
  assert(
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `N – no horizontal overflow (${overflow.scrollWidth} <= ${overflow.clientWidth})`,
  )

  const cta = page.locator('[data-testid="professional-catalog-open-e2e_pro_public_vet"]').first()
  assert(await cta.isVisible(), 'N – CTA visible on mobile')
  const box = await cta.boundingBox()
  assert(box != null && box.y + box.height <= 844 + 200, 'N – CTA not wildly off-screen')
  await shot(page, 'mobile')
  await context.close()
}

async function main() {
  console.log('Starting Professional Catalog E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  await runDesktop(browser)
  await runMobile(browser)
  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`Professional Catalog E2E FAILED (${failures.length})`)
    process.exit(1)
  }
  console.log('Professional Catalog E2E passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
