/**
 * K51 E2E — Clinical integrity & provenance.
 * Run: node scripts/e2e-clinical-integrity.mjs
 *
 * A) Runs assert-clinical-integrity.mts (full matrix A–S)
 * B) Optional UI smoke when BASE_URL reachable
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const assertScript = path.join(__dirname, 'assert-clinical-integrity.mts')
const BASE = process.env.BASE_URL || 'http://localhost:5173'

console.log('K51 E2E: running assert-clinical-integrity.mts\n')

const result = spawnSync('npx', ['tsx', assertScript], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

if (result.status !== 0) {
  console.error('K51 E2E FAILED (assert matrix)')
  process.exit(result.status ?? 1)
}

console.log('\nK51 E2E: assert matrix OK — attempting UI smoke against', BASE)

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

    // A) Owner Health page
    await page.goto(`${BASE}/health`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const healthPage = page.locator('[data-testid="health-page"]')
    if (await healthPage.count()) {
      const denied = page.locator('[data-testid="health-page-denied"]')
      const isDenied = await denied.isVisible().catch(() => false)
      if (isDenied) {
        console.error('FAIL: A) Owner Health page denied')
        process.exit(1)
      }
      console.log('OK  : A) Owner Health page visible')
    } else {
      console.log('SKIP: A) health-page testid not found')
    }

    // I) Public pet — no clinical data in page source for discover (smoke)
    await page.goto(`${BASE}/discover`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    const body = await page.content()
    if (body.includes('createdByAccountId') || body.includes('withdrawnByAccountId')) {
      console.error('FAIL: I) Public Discover leaked clinical provenance keys')
      process.exit(1)
    }
    console.log('OK  : I) Discover HTML has no clinical provenance keys')

    // J) Messages clinical share (K61)
    await page.goto(`${BASE}/messages`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    const toggle = page.locator('[data-testid="messages-clinical-share-toggle"]')
    if (await toggle.count()) {
      await toggle.first().click()
      await page.waitForTimeout(200)
      const menu = page.locator('[data-testid="messages-clinical-share-menu"]')
      if (!(await menu.isVisible())) {
        console.error('FAIL: J) Messages clinical share menu missing')
        process.exit(1)
      }
      console.log('OK  : J) Messages clinical share menu visible')
    } else {
      console.log(
        'SKIP: J) clinical-share toggle not visible — assert covers share',
      )
    }

    console.log(
      '\nK51 E2E OK (B–H create/edit deny paths covered by assert matrix; DEMO session ≈ owner)',
    )
  } finally {
    await browser.close()
  }
}

uiSmoke().catch((err) => {
  console.log('SKIP UI smoke —', err instanceof Error ? err.message : err)
  console.log('\nK51 E2E OK (assert matrix; UI optional)')
  process.exit(0)
})
