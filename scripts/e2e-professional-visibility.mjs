/**
 * E2E: Professional public visibility toggle (KROK 19.1)
 * Run: node scripts/e2e-professional-visibility.mjs
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
    path: path.join(OUT, `pro-visibility-${name}.png`),
    fullPage: false,
  })
}

async function main() {
  console.log('Starting Professional Visibility E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
  })
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // Ensure owner account exists via bootstrap; add breeder role
  await page.locator('[data-testid="add-role-button"]').click()
  await page.waitForTimeout(200)
  await page.locator('[data-testid="add-role-option-breeder"]').click()
  await page.waitForTimeout(200)
  await page.locator('#add-role-display-name').fill('Stanice Visibility')
  await page.locator('[data-testid="add-role-confirm"]').click()
  await page.waitForTimeout(300)

  const status = page.locator('[data-testid^="pro-visibility-status-"]').first()
  assert(await status.isVisible(), 'visibility status visible')
  assert(((await status.textContent()) || '').includes('Soukromý'), 'default status Soukromý')

  const toggle = page.locator('[data-testid^="pro-visibility-toggle-"]').first()
  assert(await toggle.isVisible(), 'visibility toggle visible')
  assert(!(await toggle.isChecked()), 'toggle unchecked by default')

  await toggle.check()
  await page.waitForTimeout(200)
  assert(((await status.textContent()) || '').includes('Veřejný'), 'status Veřejný after toggle')

  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.professionalProfiles')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    Array.isArray(stored) && stored.some((p) => p.publicVisibility === 'public'),
    'publicVisibility persisted as public',
  )

  const viewLink = page.locator('[data-testid^="pro-view-public-"]').first()
  assert(await viewLink.isVisible(), 'view public profile link visible')
  await viewLink.click()
  await page.waitForTimeout(500)
  assert(page.url().includes('/professionals/'), 'navigated to public profile route')
  assert(
    await page.locator('[data-testid="professional-public-page"]').isVisible(),
    'public profile page shown when public',
  )
  await shot(page, 'public-page')

  // Back to settings, set private, confirm missing page
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const toggle2 = page.locator('[data-testid^="pro-visibility-toggle-"]').first()
  const href = await page.locator('[data-testid^="pro-view-public-"]').first().getAttribute('href')
  await toggle2.uncheck()
  await page.waitForTimeout(200)

  await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="professional-public-missing"]').isVisible(),
    'private profile not publicly available',
  )
  await shot(page, 'private-missing')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(200)
  const afterReload = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.professionalProfiles')
    return raw ? JSON.parse(raw) : []
  })
  assert(
    afterReload.some((p) => p.publicVisibility === 'private'),
    'private visibility survives reload',
  )

  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`Professional Visibility E2E FAILED (${failures.length})`)
    process.exit(1)
  }
  console.log('Professional Visibility E2E passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
