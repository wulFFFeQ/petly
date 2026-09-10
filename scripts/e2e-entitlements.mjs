/**
 * E2E: Membership / entitlements UI (KROK 18)
 * Run: node scripts/e2e-entitlements.mjs
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
    path: path.join(OUT, `entitlements-${name}.png`),
    fullPage: false,
  })
}

async function readSubscription(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.subscription')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
}

async function main() {
  console.log('Starting Entitlements E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('lovedandknown.subscription')
  })

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  const section = page.locator('[data-testid="membership-section"]')
  assert(await section.isVisible(), 'membership section visible')

  const heading = page.getByText('Členství / Tarif')
  assert(await heading.isVisible(), 'membership heading visible')

  const planLabel = page.locator('[data-testid="membership-current-plan"]')
  assert(await planLabel.isVisible(), 'current plan label visible')
  assert(
    ((await planLabel.textContent()) || '').includes('Free'),
    'default plan is Free',
  )

  const select = page.locator('[data-testid="membership-demo-select"]')
  assert(await select.isVisible(), 'DEMO plan select visible')

  await select.selectOption('premium')
  await page.waitForTimeout(200)

  assert(
    ((await planLabel.textContent()) || '').includes('Premium'),
    'UI shows Premium after DEMO switch',
  )

  const demoBadge = page.locator('[data-testid="membership-demo-badge"]')
  assert(await demoBadge.isVisible(), 'DEMO badge visible after switch')

  const disclaimer = page.locator('[data-testid="membership-demo-disclaimer"]')
  assert(await disclaimer.isVisible(), 'DEMO disclaimer visible')
  const disclaimerText = (await disclaimer.textContent()) || ''
  assert(/DEMO/i.test(disclaimerText), 'disclaimer mentions DEMO')
  assert(
    /není skutečné předplatné/i.test(disclaimerText),
    'disclaimer says not a real subscription',
  )
  assert(
    !/zaplaceno|Premium aktivováno/i.test(disclaimerText),
    'disclaimer does not claim payment',
  )

  const stored = await readSubscription(page)
  assert(stored != null, 'subscription written to localStorage')
  assert(stored.plan === 'premium', 'storage plan is premium')
  assert(stored.provider === 'demo', 'storage provider is demo')
  assert(stored.status === 'demo', 'storage status is demo')
  assert(
    !stored.providerCustomerId,
    'no fake providerCustomerId on DEMO',
  )

  await select.selectOption('clear')
  await page.waitForTimeout(200)
  assert(
    ((await planLabel.textContent()) || '').includes('Free'),
    'clear DEMO returns to Free',
  )
  const afterClear = await readSubscription(page)
  assert(afterClear?.plan === 'free', 'storage plan free after clear')
  assert(afterClear?.provider === 'none', 'storage provider none after clear')
  assert(afterClear?.status === 'none', 'storage status none after clear')

  await shot(page, 'settings-membership')
  await browser.close()

  console.log('\n--- Summary ---')
  if (failures.length) {
    console.error(`${failures.length} failure(s):`)
    for (const f of failures) console.error(' -', f)
    process.exit(1)
  }
  console.log('All entitlements E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
