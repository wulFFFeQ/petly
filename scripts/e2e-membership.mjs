/**
 * E2E: Membership / pricing UI (KROK 27)
 * Run: node scripts/e2e-membership.mjs
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
    path: path.join(OUT, `membership-${name}.png`),
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
  console.log('Starting Membership E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('lovedandknown.subscription')
    localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
  })

  // Settings summary + CTA
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  const section = page.locator('[data-testid="membership-section"]')
  assert(await section.isVisible(), 'settings membership section visible')
  assert(await page.getByText('Členství', { exact: true }).first().isVisible(), 'Členství heading')

  const manageCta = page.locator('[data-testid="manage-membership-cta"]')
  assert(await manageCta.isVisible(), 'Spravovat členství CTA visible')

  const upgrade = page.locator('[data-testid="upgrade-prompt"]')
  assert(await upgrade.isVisible(), 'upgrade prompt sample on Free')
  const upgradeCta = page.locator('[data-testid="upgrade-prompt-cta"]')
  assert(await upgradeCta.isVisible(), 'upgrade CTA visible')
  const upgradeText = (await upgradeCta.textContent()) || ''
  assert(/Zobrazit Premium/i.test(upgradeText), 'upgrade CTA says Zobrazit Premium')
  assert(!/health_advanced|statistics/i.test((await upgrade.textContent()) || ''), 'no raw entitlement ids')

  await manageCta.click()
  await page.waitForURL(/\/membership/)
  await page.waitForTimeout(400)

  const membershipPage = page.locator('[data-testid="membership-page"]')
  assert(await membershipPage.isVisible(), '/membership page visible')
  assert(
    await page.getByText(/Členství LOVED/).isVisible(),
    'membership brand title visible',
  )

  for (const plan of ['free', 'premium', 'family', 'breeder_pro']) {
    assert(
      await page.locator(`[data-testid="plan-card-${plan}"]`).isVisible(),
      `plan card ${plan} visible`,
    )
  }

  assert(
    ((await page.locator('[data-testid="plan-price-premium"]').textContent()) || '').includes('149'),
    'Premium price 149',
  )
  assert(
    ((await page.locator('[data-testid="plan-price-family"]').textContent()) || '').includes('249'),
    'Family price 249',
  )
  assert(
    ((await page.locator('[data-testid="plan-price-breeder_pro"]').textContent()) || '').includes('499'),
    'Breeder Pro price 499',
  )

  assert(await page.locator('[data-testid="feature-comparison"]').isVisible(), 'feature comparison')

  // Breeder Pro gating for non-breeder owner
  const breederMsg = page.locator('[data-testid="breeder-pro-ineligible"]')
  // May or may not show depending on pets with breeding profile — CTA should be disabled if ineligible
  const breederCta = page.locator('[data-testid="plan-cta-breeder_pro"]')
  if (await breederMsg.isVisible()) {
    assert(
      /chovné/i.test((await breederMsg.textContent()) || ''),
      'breeder ineligible copy',
    )
    assert(await breederCta.isDisabled(), 'breeder CTA disabled when ineligible')
  }

  // DEMO switch + persistence
  const select = page.locator('[data-testid="membership-demo-select"]')
  assert(await select.isVisible(), 'DEMO select on membership page')

  await select.selectOption('premium')
  await page.waitForTimeout(300)
  assert(
    ((await page.locator('[data-testid="membership-current-plan"]').textContent()) || '').includes(
      'Premium',
    ),
    'UI shows Premium after DEMO',
  )
  assert(await page.locator('[data-testid="membership-demo-badge"]').isVisible(), 'DEMO badge')
  const disclaimer = page.locator('[data-testid="membership-demo-disclaimer"]')
  assert(await disclaimer.isVisible(), 'DEMO disclaimer')
  assert(!/Platba proběhla|zaplaceno/i.test((await disclaimer.textContent()) || ''), 'no paid claim')

  const stored = await readSubscription(page)
  assert(stored?.plan === 'premium', 'storage premium')
  assert(stored?.provider === 'demo', 'storage provider demo')
  assert(stored?.status === 'demo', 'storage status demo')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    ((await page.locator('[data-testid="membership-current-plan"]').textContent()) || '').includes(
      'Premium',
    ),
    'Premium persists after reload',
  )

  await shot(page, 'page-premium-demo')

  // Upgrade CTA navigates to membership
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  // After premium DEMO, upgrade sample for statistics may be hidden
  const planOnSettings = page.locator('[data-testid="membership-current-plan"]')
  assert(
    ((await planOnSettings.textContent()) || '').includes('Premium'),
    'settings reflects DEMO premium',
  )

  await page.locator('[data-testid="manage-membership-cta"]').click()
  await page.waitForURL(/\/membership/)

  await page.locator('[data-testid="membership-demo-select"]').selectOption('clear')
  await page.waitForTimeout(300)
  assert(
    ((await page.locator('[data-testid="membership-current-plan"]').textContent()) || '').includes(
      'Free',
    ),
    'clear → Free',
  )

  await shot(page, 'page-free')
  await browser.close()

  console.log('\n--- Summary ---')
  if (failures.length) {
    console.error(`${failures.length} failure(s):`)
    for (const f of failures) console.error(' -', f)
    process.exit(1)
  }
  console.log('All membership E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
