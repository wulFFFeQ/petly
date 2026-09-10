/**
 * E2E: Account roles / onboarding (KROK 19)
 * Run: node scripts/e2e-account-roles.mjs
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
    path: path.join(OUT, `account-roles-${name}.png`),
    fullPage: false,
  })
}

async function readAccounts(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.accounts')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
}

async function main() {
  console.log('Starting Account Roles E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  // Fresh install → onboarding
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  assert(page.url().includes('/onboarding'), 'fresh start redirects to onboarding')
  const onboarding = page.locator('[data-testid="onboarding-page"]')
  assert(await onboarding.isVisible(), 'onboarding page visible')
  await shot(page, 'onboarding')

  await page.locator('[data-testid="onboarding-choice-owner"]').click()
  await page.waitForTimeout(500)

  assert(!page.url().includes('/onboarding'), 'owner path leaves onboarding')
  const accountsAfterOwner = await readAccounts(page)
  assert(Array.isArray(accountsAfterOwner) && accountsAfterOwner.length > 0, 'account persisted')
  const self = accountsAfterOwner.find((a) => a.id === 'owner_self') || accountsAfterOwner[0]
  assert(self?.roles?.includes('owner'), 'account has owner role')

  // Settings → add breeder role
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const section = page.locator('[data-testid="account-roles-section"]')
  assert(await section.isVisible(), 'account roles section visible')
  assert(await page.locator('[data-testid="account-role-owner"]').isVisible(), 'owner role listed')

  await page.locator('[data-testid="add-role-button"]').click()
  await page.waitForTimeout(200)
  assert(await page.locator('[data-testid="add-role-list"]').isVisible(), 'add role list open')
  await page.locator('[data-testid="add-role-option-breeder"]').click()
  await page.waitForTimeout(200)
  assert(
    await page.locator('[data-testid="add-role-profile-form"]').isVisible(),
    'breeder profile form shown',
  )
  await page.locator('#add-role-display-name').fill('Stanice Aurora')
  await page.locator('[data-testid="add-role-confirm"]').click()
  await page.waitForTimeout(300)

  assert(
    await page.locator('[data-testid="account-role-breeder"]').isVisible(),
    'breeder role listed after add',
  )
  await shot(page, 'settings-roles')

  // Persistence after reload
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    await page.locator('[data-testid="account-role-breeder"]').isVisible(),
    'breeder role survives reload',
  )
  const accountsReload = await readAccounts(page)
  const selfReload =
    accountsReload?.find((a) => a.id === 'owner_self') || accountsReload?.[0]
  assert(
    selfReload?.roles?.includes('owner') && selfReload?.roles?.includes('breeder'),
    'roles persisted in localStorage',
  )

  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`Account Roles E2E FAILED (${failures.length})`)
    process.exit(1)
  }
  console.log('Account Roles E2E passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
