/**
 * E2E: Professional pet access (KROK 21)
 * Run: node scripts/e2e-professional-access.mjs
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
    path: path.join(OUT, `pro-access-${name}.png`),
    fullPage: false,
  })
}

const PRO_ID = 'e2e_access_vet'
const PET_ID = 'luna'

const SEED_PROFILES = [
  {
    id: PRO_ID,
    accountId: 'owner_self',
    type: 'veterinarian',
    displayName: 'MUDr. Access Vet',
    organizationName: 'Access Clinic',
    city: 'Praha 2',
    services: ['chirurgie'],
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_ACCOUNT = {
  id: 'owner_self',
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

async function seed(page) {
  await page.evaluate(
    ({ profiles, account }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify(profiles))
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalAccessLogs', JSON.stringify([]))
    },
    { profiles: SEED_PROFILES, account: SEED_ACCOUNT },
  )
}

async function main() {
  console.log('Starting Professional Access E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seed(page)
  await page.goto(`${BASE}/professionals/${PRO_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  assert(
    await page.locator('[data-testid="professional-public-page"]').isVisible(),
    '1 – public professional page',
  )
  assert(
    await page.locator('[data-testid="pro-connect-with-pet"]').isVisible(),
    '4 – connect CTA visible',
  )

  await page.locator('[data-testid="pro-connect-with-pet"]').click()
  await page.waitForTimeout(200)
  assert(
    await page.locator('[data-testid="connect-professional-modal"]').isVisible(),
    '5 – connect modal open',
  )

  // Select Luna if present
  const lunaBtn = page.locator(`[data-testid="connect-pet-${PET_ID}"]`)
  if (await lunaBtn.count()) {
    // ensure selected
    const cls = (await lunaBtn.getAttribute('class')) || ''
    if (!cls.includes('bg-[#2C4A3E]')) await lunaBtn.click()
  } else {
    // pick first available pet
    await page.locator('[data-testid^="connect-pet-"]').first().click()
  }

  await page.locator('[data-testid="connect-perm-viewHealth"]').check()
  await page.locator('[data-testid="connect-perm-viewVaccinations"]').check()
  await page.locator('[data-testid="connect-perm-addVisit"]').check()
  await page.locator('[data-testid="connect-continue"]').click()
  await page.waitForTimeout(200)
  assert(await page.locator('[data-testid="connect-summary"]').isVisible(), '7 – summary step')
  await page.locator('[data-testid="connect-confirm"]').click()
  await page.waitForTimeout(400)

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.petProfessionalAccess')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    Array.isArray(stored) &&
      stored.some((a) => a.professionalId === PRO_ID && a.status === 'active'),
    '8/9 – access saved as active',
  )
  const access = stored.find((a) => a.professionalId === PRO_ID && a.status === 'active')
  const petId = access?.petId
  assert(Boolean(petId), 'access has petId')

  // Owner who-has-access section
  await page.goto(`${BASE}/pets/${petId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  assert(
    await page.locator(`[data-testid="who-has-access-${petId}"]`).isVisible(),
    '13 – who has access section',
  )
  assert(
    await page.locator(`[data-testid="access-card-${access.id}"]`).isVisible(),
    '13 – access card visible',
  )

  // Professional view
  await page.goto(`${BASE}/professionals/${PRO_ID}/pets/${petId}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(400)
  assert(
    await page.locator('[data-testid="pro-pet-access-page"]').isVisible(),
    '10 – professional pet view',
  )
  assert(await page.locator('[data-testid="pro-pet-health"]').isVisible(), '10 – health section')
  assert(await page.locator('[data-testid="pro-add-visit"]').isVisible(), '11 – add visit allowed')
  assert(
    (await page.locator('[data-testid="pro-add-health"]').count()) === 0,
    '11 – add health not granted',
  )

  const body = await page.locator('[data-testid="pro-pet-access-page"]').innerText()
  assert(!body.includes('985112'), 'privacy – no microchip')
  assert(!/ownerContacts|\+420\d{6}/i.test(body), 'privacy – no owner phone pattern forced')

  await page.locator('[data-testid="pro-add-visit"]').click()
  await page.waitForTimeout(300)

  const logs = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.professionalAccessLogs')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    logs.some((l) => l.action === 'record_added' || l.action === 'record_viewed'),
    '12 – audit log has view/add action',
  )

  // Revoke from pet overview
  await page.goto(`${BASE}/pets/${petId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.locator(`[data-testid="access-revoke-${access.id}"]`).click()
  await page.waitForTimeout(150)
  await page.locator('[data-testid="access-revoke-confirm"]').click()
  await page.waitForTimeout(300)

  const afterRevoke = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.petProfessionalAccess')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    afterRevoke.some((a) => a.id === access.id && a.status === 'revoked'),
    '14 – access revoked',
  )

  await page.goto(`${BASE}/professionals/${PRO_ID}/pets/${petId}`, {
    waitUntil: 'networkidle',
  })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="pro-pet-access-denied"]').isVisible(),
    '15 – professional denied after revoke',
  )

  // Reload persistence of revoked
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
  const afterReload = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.petProfessionalAccess')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    afterReload.some((a) => a.id === access.id && a.status === 'revoked'),
    '16 – revoked survives reload',
  )

  // Duplicate blocked
  await page.goto(`${BASE}/professionals/${PRO_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)

  async function ensurePetSelected(id) {
    const btn = page.locator(`[data-testid="connect-pet-${id}"]`)
    if ((await btn.count()) === 0) {
      await page.locator('[data-testid^="connect-pet-"]').first().click()
      return
    }
    const cls = (await btn.getAttribute('class')) || ''
    if (!cls.includes('bg-[#2C4A3E]')) await btn.click()
  }

  // Re-grant then try duplicate
  await page.locator('[data-testid="pro-connect-with-pet"]').click()
  await page.waitForTimeout(200)
  await ensurePetSelected(petId)
  await page.locator('[data-testid="connect-perm-viewHealth"]').check()
  await page.locator('[data-testid="connect-continue"]').click()
  await page.waitForTimeout(200)
  assert(await page.locator('[data-testid="connect-summary"]').isVisible(), 're-grant summary visible')
  await page.locator('[data-testid="connect-confirm"]').click()
  await page.waitForTimeout(300)

  await page.locator('[data-testid="pro-connect-with-pet"]').click()
  await page.waitForTimeout(200)
  await ensurePetSelected(petId)
  await page.locator('[data-testid="connect-continue"]').click()
  await page.waitForTimeout(200)
  assert(
    await page.locator('[data-testid="connect-error"]').isVisible(),
    'L – duplicate open access blocked in UI',
  )

  await shot(page, 'done')
  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`Professional Access E2E FAILED (${failures.length})`)
    process.exit(1)
  }
  console.log('Professional Access E2E passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
