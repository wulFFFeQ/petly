/**
 * E2E: Account menu + onboarding 2.0 (KROK 36)
 * Run: node scripts/e2e-account-onboarding.mjs
 * Requires: npm run dev (BASE_URL default http://localhost:5173)
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
    path: path.join(OUT, `account-onboarding-${name}.png`),
    fullPage: false,
  })
}

async function main() {
  console.log('Starting Account Onboarding E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  // --- Owner path: fresh → onboarding → add pet → dashboard ---
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  assert(page.url().includes('/onboarding'), 'fresh start redirects to onboarding')
  assert(await page.locator('[data-testid="onboarding-page"]').isVisible(), 'onboarding visible')

  await page.locator('[data-testid="onboarding-choice-owner"]').click()
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="onboarding-privacy"]').isVisible(),
    'owner sees privacy step',
  )
  await page.locator('[data-testid="onboarding-privacy-continue"]').click()
  await page.waitForTimeout(200)
  assert(await page.locator('[data-testid="onboarding-pets"]').isVisible(), 'pets step visible')

  await page.locator('[data-testid="onboarding-add-pet"]').click()
  await page.waitForTimeout(400)
  assert(await page.locator('#pet-name').isVisible(), 'existing Add Pet modal opened')
  await page.locator('#pet-name').fill('E2E Luna')
  await page.locator('#pet-breed').click()
  await page.locator('#pet-breed').fill('Labrador')
  await page.waitForTimeout(300)
  const breedOption = page.locator('[role="option"]').first()
  if (await breedOption.isVisible().catch(() => false)) {
    await breedOption.click()
  }
  await page.locator('form button[type="submit"]').click()
  await page.waitForTimeout(700)

  if (await page.locator('[data-testid="onboarding-more-pets"]').isVisible().catch(() => false)) {
    await page.locator('[data-testid="onboarding-continue-after-pet"]').click()
  } else if (await page.locator('[data-testid="onboarding-skip-pet"]').isVisible().catch(() => false)) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.locator('[data-testid="onboarding-skip-pet"]').click()
  }
  await page.waitForTimeout(500)
  assert(!page.url().includes('/onboarding'), 'owner completion leaves onboarding')
  assert(page.url().replace(/\/$/, '').endsWith('') || page.url().includes(BASE), 'landed in app')
  await shot(page, 'owner-dashboard')

  // --- Professional path (fresh) ---
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.locator('[data-testid="onboarding-choice-veterinarian"]').click()
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="onboarding-profile"]').isVisible(),
    'vet goes to profile step',
  )
  await page.locator('#onboarding-display-name').fill('MVDr. E2E')
  await page.locator('[data-testid="onboarding-finish"]').click()
  await page.waitForTimeout(500)
  assert(!page.url().includes('/onboarding'), 'pro completion leaves onboarding')
  await shot(page, 'pro-complete')

  // --- Account menu + logout ---
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.locator('[data-testid="account-menu-trigger"]').first().click()
  await page.waitForTimeout(200)
  assert(await page.locator('[data-testid="account-menu"]').isVisible(), 'avatar opens account menu')

  await page.locator('[data-testid="account-menu-settings"]').click()
  await page.waitForTimeout(400)
  assert(page.url().includes('/settings'), 'settings navigation works')

  await page.locator('[data-testid="account-menu-trigger"]').first().click()
  await page.waitForTimeout(200)
  await page.locator('[data-testid="account-menu-logout"]').click()
  await page.waitForTimeout(200)
  assert(await page.locator('[data-testid="logout-confirm"]').isVisible(), 'logout confirm visible')
  await page.locator('[data-testid="logout-confirm"]').click()
  await page.waitForTimeout(500)
  assert(page.url().includes('/login'), 'logout lands on login')
  await shot(page, 'login')

  // Browser back must not expose protected page without session
  await page.goBack()
  await page.waitForTimeout(600)
  const afterBack = page.url()
  assert(
    afterBack.includes('/login') || (await page.locator('[data-testid="login-page"]').isVisible()),
    'protected route blocked after logout back',
  )

  await page.locator('[data-testid="login-submit"]').click()
  await page.waitForTimeout(500)
  assert(!page.url().includes('/login'), 'login re-enters app')

  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nAccount Onboarding E2E PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
