/**
 * E2E: Professional dashboard (KROK 23)
 * Run: node scripts/e2e-professional-dashboard.mjs
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
    path: path.join(OUT, `pro-dashboard-${name}.png`),
    fullPage: false,
  })
}

const PRO_ID = 'e2e_dash_vet'
const PET_ID = 'luna'

const SEED_PROFILES = [
  {
    id: PRO_ID,
    accountId: 'owner_self',
    type: 'veterinarian',
    displayName: 'MUDr. Dashboard Vet',
    organizationName: 'Dash Clinic',
    city: 'Praha',
    services: ['kontroly'],
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
  displayName: 'E2E Pro',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_ACCESS = [
  {
    id: 'ppa_dash_active',
    petId: PET_ID,
    professionalId: PRO_ID,
    permissions: ['viewHealth', 'viewVaccinations', 'addVisit', 'addNote'],
    status: 'active',
    grantedAt: '2026-08-01T10:00:00.000Z',
    grantedByAccountId: 'owner_self',
  },
  {
    id: 'ppa_dash_pending',
    petId: 'milo',
    professionalId: PRO_ID,
    permissions: [],
    status: 'pending',
    requestedAt: '2026-08-15T10:00:00.000Z',
    grantedAt: '2026-08-15T10:00:00.000Z',
    grantedByAccountId: 'owner_self',
  },
]

const SEED_LOGS = [
  {
    id: 'pal_dash_1',
    petId: PET_ID,
    professionalId: PRO_ID,
    action: 'access_granted',
    timestamp: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'pal_dash_2',
    petId: PET_ID,
    professionalId: PRO_ID,
    action: 'record_viewed',
    timestamp: '2026-09-01T09:14:00.000Z',
  },
]

const SEED_NOTIFICATIONS = [
  {
    id: 'notif_dash_1',
    type: 'professional_access_approved',
    title: 'Přístup schválen',
    message: 'Přístup k Luně byl schválen.',
    petName: 'Luna',
    petId: PET_ID,
    createdAt: '2026-08-01T10:05:00.000Z',
    unread: true,
    recipientAccountId: 'owner_self',
    relatedProfessionalId: PRO_ID,
    relatedAccessId: 'ppa_dash_active',
  },
]

async function seed(page, { access = SEED_ACCESS, account = SEED_ACCOUNT } = {}) {
  await page.evaluate(
    ({ profiles, account, access, logs, notifications }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify(profiles))
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify(access))
      localStorage.setItem('lovedandknown.professionalAccessLogs', JSON.stringify(logs))
      localStorage.setItem('lovedandknown.notifications', JSON.stringify(notifications))
      sessionStorage.setItem('lovedandknown.uiWorkspace', 'professional')
    },
    {
      profiles: SEED_PROFILES,
      account,
      access,
      logs: SEED_LOGS,
      notifications: SEED_NOTIFICATIONS,
    },
  )
}

async function main() {
  console.log('Starting Professional Dashboard E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  // A) owner without professional role → denied
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seed(page, {
    account: {
      ...SEED_ACCOUNT,
      roles: ['owner'],
      kind: 'consumer',
    },
    access: [],
  })
  await page.goto(`${BASE}/professional`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    await page.locator('[data-testid="professional-gate-denied"]').isVisible(),
    'A – owner without pro role denied',
  )
  await shot(page, 'gate-denied')

  // Hybrid pro account — dashboard
  await seed(page)
  await page.goto(`${BASE}/professional`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  assert(
    await page.locator('[data-testid="professional-layout"]').isVisible(),
    '1 – professional layout',
  )
  assert(
    await page.locator('[data-testid="professional-overview-page"]').isVisible(),
    '2 – overview page',
  )
  assert(
    await page.locator('[data-testid="professional-role-label"]').innerText(),
    '3 – role header label present',
  )
  const roleText = await page.locator('[data-testid="professional-role-label"]').innerText()
  assert(roleText.includes('Veterinář'), `3b – role label Veterinář (got ${roleText})`)

  const activeStat = await page.locator('[data-testid="stat-active"]').innerText()
  assert(activeStat.includes('1'), `5 – active connections = 1 (got ${activeStat})`)
  const pendingStat = await page.locator('[data-testid="stat-pending"]').innerText()
  assert(pendingStat.includes('1'), `5b – pending = 1 (got ${pendingStat})`)

  assert(
    await page.locator('[data-testid="professional-pending-requests"]').isVisible(),
    '6 – pending requests section',
  )
  assert(
    await page.locator('[data-testid="quick-action-addVisit"]').isVisible(),
    '10 – quick action addVisit (has WRITE)',
  )
  assert(
    (await page.locator('[data-testid="quick-action-addHealthRecord"]').count()) === 0,
    '10b – addHealthRecord hidden without permission',
  )
  await shot(page, 'overview')

  // Pets list
  await page.goto(`${BASE}/professional/pets`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="professional-pets-page"]').isVisible(),
    '4 – pets page',
  )
  assert(
    await page.locator(`[data-testid="pro-dash-pet-${PET_ID}"]`).isVisible(),
    '4b – Luna card',
  )

  // Open pet with health
  await page.locator(`[data-testid="open-pet-${PET_ID}"]`).click()
  await page.waitForTimeout(400)
  assert(
    await page.locator('[data-testid="pro-dash-pet-page"]').isVisible(),
    '7 – pet projection page',
  )
  assert(
    await page.locator('[data-testid="pro-dash-pet-health"]').isVisible(),
    '8 – health visible with viewHealth',
  )
  assert(
    await page.locator('[data-testid="pro-dash-add-visit"]').isVisible(),
    '9 – write addVisit visible',
  )
  assert(
    (await page.locator('[data-testid="pro-dash-add-health"]').count()) === 0,
    '9b – add health hidden without permission',
  )
  await shot(page, 'pet-view')

  // Direct URL denial — foreign pet without access
  await page.goto(`${BASE}/professional/pets/bella`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="pro-dash-pet-denied"]').isVisible(),
    'N – direct URL without access denied',
  )

  // Pending cancel
  await page.goto(`${BASE}/professional/access`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.locator('[data-testid="access-tab-pending"]').click()
  await page.waitForTimeout(200)
  const cancelBtn = page.locator('[data-testid^="access-cancel-"]').first()
  if (await cancelBtn.count()) {
    await cancelBtn.click()
    await page.waitForTimeout(300)
  }
  const afterCancel = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.petProfessionalAccess') || '[]')
    return list.find((a) => a.id === 'ppa_dash_pending')?.status
  })
  assert(afterCancel === 'revoked', `pending cancel → revoked (got ${afterCancel})`)

  // Revoke active → hide data
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.petProfessionalAccess') || '[]')
    const next = list.map((a) =>
      a.id === 'ppa_dash_active'
        ? { ...a, status: 'revoked', revokedAt: new Date().toISOString() }
        : a,
    )
    localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify(next))
  })
  await page.goto(`${BASE}/professional/pets/${PET_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="pro-dash-pet-denied"]').isVisible(),
    '12 – revoked access hides pet data',
  )

  // Reload persistence
  await seed(page)
  await page.goto(`${BASE}/professional`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    await page.locator('[data-testid="professional-overview-page"]').isVisible(),
    '13 – reload keeps dashboard',
  )
  const activeAfterReload = await page.locator('[data-testid="stat-active"]').innerText()
  assert(activeAfterReload.includes('1'), '13b – stats survive reload')

  // Consumer dashboard still works
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    (await page.locator('[data-testid="professional-layout"]').count()) === 0,
    '14 – consumer home is not professional layout',
  )
  assert(
    await page.locator('[data-testid="header-switch-to-professional"]').isVisible(),
    '14b – switch to professional visible on consumer',
  )

  // Profile unverified
  await page.goto(`${BASE}/professional/profile`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="pro-profile-unverified"]').isVisible(),
    '19 – unverified trust status',
  )

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/professional`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    await page.locator('[data-testid="professional-bottom-nav"]').isVisible(),
    '26 – mobile bottom nav',
  )
  await shot(page, 'mobile')

  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nAll professional dashboard E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
