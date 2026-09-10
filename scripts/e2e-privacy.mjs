/**
 * E2E: Central privacy UI (KROK 15) — D reload persistence, H desktop+mobile
 * Run: node scripts/e2e-privacy.mjs
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
    path: path.join(OUT, `privacy-${name}.png`),
    fullPage: false,
  })
}

async function gotoSettings(page) {
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
}

async function readPrivacyStorage(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.privacySettings')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
}

async function runViewportSuite(browser, label, viewport) {
  console.log(`\n--- ${label} (${viewport.width}×${viewport.height}) ---`)
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('lovedandknown.privacySettings')
  })

  await gotoSettings(page)

  const section = page.locator('[data-testid="privacy-overview-section"]')
  assert(await section.isVisible(), `${label}: privacy overview section visible`)

  const heading = page.getByText('Co o mně a mých mazlíčcích ostatní vidí')
  assert(await heading.isVisible(), `${label}: section heading visible`)

  // Change account ownerContacts private → connections
  const contactsRow = page.locator('[data-privacy-row="account:ownerContacts"]')
  assert(await contactsRow.isVisible(), `${label}: ownerContacts row visible`)

  const connectionsBtn = contactsRow.locator(
    'button[data-privacy-level="connections"]',
  )
  await connectionsBtn.click()
  await page.waitForTimeout(200)

  assert(
    (await connectionsBtn.getAttribute('aria-pressed')) === 'true',
    `${label}: ownerContacts set to connections`,
  )

  // Hard ceiling: public button for microchip must be disabled
  const microchipRow = page.locator('[data-privacy-row^="pet:"][data-privacy-row$=":microchip"]').first()
  if (await microchipRow.count()) {
    const publicChipBtn = microchipRow.locator('button[data-privacy-level="public"]')
    assert(
      await publicChipBtn.isDisabled(),
      `${label}: microchip cannot be set public`,
    )
    const connectionsChipBtn = microchipRow.locator(
      'button[data-privacy-level="connections"]',
    )
    await connectionsChipBtn.click()
    await page.waitForTimeout(150)
    assert(
      (await connectionsChipBtn.getAttribute('aria-pressed')) === 'true',
      `${label}: microchip set to connections`,
    )
  } else {
    assert(false, `${label}: microchip row present`)
  }

  // D: change name visibility and verify survives reload
  const nameRow = page.locator('[data-privacy-row^="pet:"][data-privacy-row$=":name"]').first()
  assert(await nameRow.count(), `${label}: name row present`)
  const publicNameBtn = nameRow.locator('button[data-privacy-level="public"]')
  await publicNameBtn.click()
  await page.waitForTimeout(200)
  assert(
    (await publicNameBtn.getAttribute('aria-pressed')) === 'true',
    `${label}: name set to public before reload`,
  )

  const before = await readPrivacyStorage(page)
  assert(before && before.account?.ownerContacts === 'connections', `${label}: D storage has ownerContacts=connections`)
  const petEntries = before?.pets ? Object.values(before.pets) : []
  assert(
    petEntries.some((p) => p.name === 'public'),
    `${label}: D storage has pet name=public`,
  )

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  assert(
    await page.locator('[data-testid="privacy-overview-section"]').isVisible(),
    `${label}: D section visible after reload`,
  )

  const after = await readPrivacyStorage(page)
  assert(
    after && after.account?.ownerContacts === 'connections',
    `${label}: D ownerContacts survives reload`,
  )
  const afterPets = after?.pets ? Object.values(after.pets) : []
  assert(
    afterPets.some((p) => p.name === 'public'),
    `${label}: D pet name=public survives reload`,
  )

  const nameRowAfter = page
    .locator('[data-privacy-row^="pet:"][data-privacy-row$=":name"]')
    .first()
  assert(
    (await nameRowAfter
      .locator('button[data-privacy-level="public"]')
      .getAttribute('aria-pressed')) === 'true',
    `${label}: D UI shows name=public after reload`,
  )

  await shot(page, `${label.toLowerCase()}-settings`)
  await context.close()
}

async function main() {
  console.log('Starting Privacy E2E against', BASE)
  const browser = await chromium.launch({ headless: true })

  await runViewportSuite(browser, 'Desktop', { width: 1280, height: 900 })
  await runViewportSuite(browser, 'Mobile', { width: 390, height: 844 })

  await browser.close()

  console.log('\n--- Summary ---')
  if (failures.length) {
    console.error(`${failures.length} failure(s):`)
    for (const f of failures) console.error(' -', f)
    process.exit(1)
  }
  console.log('All privacy E2E checks passed (D, H)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
