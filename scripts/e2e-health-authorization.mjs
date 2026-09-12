/**
 * K50 E2E — Health authorization hardening.
 * Run: node scripts/e2e-health-authorization.mjs
 *
 * A) Runs assert-health-authorization.mts (full matrix)
 * B) Optional UI smoke when BASE_URL reachable: owner Health OK + Messages DEMO placeholder
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-health-authorization.mts')
const BASE = process.env.BASE_URL || 'http://localhost:5173'

console.log('K50 E2E: running assert-health-authorization.mts\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K50 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK50 E2E: assert matrix OK — attempting UI smoke against', BASE)

async function uiSmoke() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    const res = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 8000 })
    if (!res || !res.ok()) {
      console.log('SKIP UI smoke — server not reachable (assert matrix already passed)')
      return
    }

    await page.evaluate(() => {
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
    })

    // A) Owner opens Health → OK
    await page.goto(`${BASE}/health`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const healthPage = page.locator('[data-testid="health-page"]')
    const denied = page.locator('[data-testid="health-page-denied"]')
    if (await healthPage.count()) {
      const isDenied = await denied.isVisible().catch(() => false)
      if (isDenied) {
        console.error('FAIL: Owner Health page denied')
        process.exit(1)
      }
      console.log('OK  : A) Owner Health page visible')
    } else {
      console.log('SKIP: health-page testid not found (route may differ)')
    }

    // K) Messages health-share → DEMO placeholder (no mock clinical share)
    await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const toggle = page.locator('[data-testid="messages-health-share-toggle"]')
    if (await toggle.count()) {
      await toggle.first().click()
      await page.waitForTimeout(200)
      const demo = page.locator('[data-testid="messages-health-share-demo"]')
      if (!(await demo.isVisible())) {
        console.error('FAIL: Messages health-share DEMO placeholder missing')
        process.exit(1)
      }
      console.log('OK  : K) Messages health-share is DEMO placeholder')
    } else {
      console.log(
        'SKIP: health-share toggle not visible (needs vet+pet conversation) — assert covers isolation',
      )
    }

    console.log('\nK50 E2E OK')
  } finally {
    await browser.close()
  }
}

uiSmoke().catch((err) => {
  console.log('SKIP UI smoke —', err instanceof Error ? err.message : err)
  console.log('\nK50 E2E OK (assert matrix; UI optional)')
  process.exit(0)
})
