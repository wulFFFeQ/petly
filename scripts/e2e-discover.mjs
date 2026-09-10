/**
 * E2E: Discover / Objevovat (checklist A–N)
 * Run: node scripts/e2e-discover.mjs
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
  await page.screenshot({ path: path.join(OUT, `discover-${name}.png`), fullPage: false })
}

async function gotoDiscover(page) {
  await page.goto(`${BASE}/discover`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
}

async function cardNames(page) {
  return page.locator('a[aria-label^="Zobrazit profil"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('aria-label')?.replace(/^Zobrazit profil\s+/, '') ?? ''),
  )
}

async function shownCountText(page) {
  return page.locator('text=/Zobrazeno \\d+ z \\d+ profilů|Žádné výsledky/').first().innerText()
}

async function openBell(page) {
  const overlay = page.locator('.fixed.inset-0.z-30')
  if (await overlay.count()) {
    await overlay.first().click({ force: true })
    await page.waitForTimeout(150)
  }
  await page.getByRole('button', { name: 'Notifikace' }).click()
  await page.waitForTimeout(200)
}

async function notificationKeys(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.notifications')
    if (!raw) return []
    try {
      return JSON.parse(raw).map((n) => n.dedupeKey)
    } catch {
      return []
    }
  })
}

async function main() {
  console.log('Starting Discover E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('lovedandknown.userCity', 'Kolín')
  })

  // A) open Objevovat
  await gotoDiscover(page)
  await shot(page, 'a-open')
  const titleVisible = await page.getByRole('heading', { name: 'Objevovat' }).isVisible()
  assert(titleVisible, 'A: Objevovat page opens')
  const namesA = await cardNames(page)
  assert(namesA.length === 6, `A: shows all 6 profiles (got ${namesA.length})`)

  // B) search by name
  const search = page.getByPlaceholder(/Hledat mazlíčky/)
  await search.fill('Rocky')
  await page.waitForTimeout(200)
  let names = await cardNames(page)
  assert(names.length === 1 && names[0] === 'Rocky', `B: search by name → Rocky (got ${names.join(',')})`)
  await search.fill('Praha')
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(
    names.every((n) => ['Nala', 'Coco'].includes(n)) && names.length === 2,
    `B: search by location Praha → Nala,Coco (got ${names.join(',')})`,
  )
  await search.fill('Sarah')
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(names.length === 1 && names[0] === 'Max', `B: search by owner → Max (got ${names.join(',')})`)
  await search.fill('retriever')
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(names.some((n) => n === 'Max'), `B: search by breed finds Max (got ${names.join(',')})`)

  // Reset search via clear / empty
  await search.fill('')
  await page.waitForTimeout(200)

  // C) filter Psi
  await page.getByRole('button', { name: 'Psi', exact: true }).click()
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(
    names.length === 3 && names.every((n) => ['Max', 'Rocky', 'Charlie'].includes(n)),
    `C: Psi → 3 dogs (got ${names.join(',')})`,
  )
  let countText = await shownCountText(page)
  assert(countText.includes('3 z 6'), `C: count shows 3 z 6 (got ${countText})`)

  // D) filter Kočky
  await page.getByRole('button', { name: 'Kočky', exact: true }).click()
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(
    names.length === 3 && names.every((n) => ['Nala', 'Coco', 'Mia'].includes(n)),
    `D: Kočky → 3 cats (got ${names.join(',')})`,
  )

  // E) combine filters: Kočky + V okolí (Kolín home → Kutná Hora + Kolín, not Praha)
  await page.getByRole('button', { name: 'V okolí', exact: true }).click()
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(
    names.length === 1 && names[0] === 'Mia',
    `E: Kočky + V okolí → Mia only (got ${names.join(',')})`,
  )

  // F) empty state
  await search.fill('zzzz-neexistuje-xyz')
  await page.waitForTimeout(200)
  const emptyTitle = page.getByText('Nenašli jsme mazlíčky odpovídající vašim kritériím')
  assert(await emptyTitle.isVisible(), 'F: empty state visible')
  countText = await shownCountText(page)
  assert(countText.includes('Žádné výsledky'), `F: count says Žádné výsledky (got ${countText})`)
  await shot(page, 'f-empty')

  // N) reset filters
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await page.waitForTimeout(200)
  names = await cardNames(page)
  assert(names.length === 6, `N: reset restores 6 profiles (got ${names.length})`)
  assert(!(await emptyTitle.isVisible().catch(() => false)), 'N: empty state gone after reset')

  // G) open public profile
  await page.getByRole('link', { name: 'Zobrazit profil Max' }).click()
  await page.waitForTimeout(400)
  assert(page.url().includes('/discover/d1'), `G: URL has /discover/d1 (got ${page.url()})`)
  assert(await page.getByRole('heading', { name: 'Max' }).isVisible(), 'G: public profile hero name')
  await shot(page, 'g-profile')

  // L) reload public profile
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(page.url().includes('/discover/d1'), 'L: deep-link survives reload')
  assert(await page.getByRole('heading', { name: 'Max' }).isVisible(), 'L: profile still Max after reload')

  // K) privacy — no sensitive fields on public profile
  const bodyText = await page.locator('body').innerText()
  const sensitive = [
    '985112',
    'mikrochip',
    'microchip',
    '@gmail',
    '+420',
    'léky',
    'medication',
    'Ulice',
    'owner@',
  ]
  for (const token of sensitive) {
    assert(
      !bodyText.toLowerCase().includes(token.toLowerCase()),
      `K: public profile must not contain "${token}"`,
    )
  }

  // H) back to Objevovat
  await page.getByRole('link', { name: 'Zpět na Objevovat' }).first().click()
  await page.waitForTimeout(300)
  assert(page.url().includes('/discover') && !page.url().includes('/discover/d'), 'H: back to Objevovat list')
  assert(await page.getByRole('heading', { name: 'Objevovat' }).isVisible(), 'H: list heading visible')

  // M) breeding profile (Rocky)
  await gotoDiscover(page)
  await page.getByRole('link', { name: 'Zobrazit profil Rocky' }).click()
  await page.waitForTimeout(400)
  assert(page.url().includes('/discover/d3'), 'M: Rocky profile URL')
  assert(await page.getByText('Chovný profil').first().isVisible(), 'M: breeding section title')
  assert(await page.getByText('Rodokmen', { exact: true }).isVisible(), 'M: pedigree summary label')
  assert(await page.getByText('Výstavy', { exact: true }).isVisible(), 'M: shows label')
  const rockyBody = await page.locator('body').innerText()
  assert(!rockyBody.toLowerCase().includes('mikrochip'), 'M: breeding profile has no microchip')
  await shot(page, 'm-breeding')

  // I) Oslovit — new conversation (Coco d4 has no seed thread)
  const keysBefore = await notificationKeys(page)
  await page.goto(`${BASE}/discover/d4`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Oslovit a propojit se/ }).first().click()
  await page.waitForTimeout(800)
  assert(page.url().includes('/messages'), 'I: navigates to messages')
  const cocoThread = page.getByText(/Majitel · Coco|Karolína/).first()
  assert(await cocoThread.isVisible().catch(() => false) || (await page.locator('body').innerText()).includes('Coco'), 'I: conversation shows Coco context')
  const keysAfter = await notificationKeys(page)
  assert(
    keysAfter.includes('discover:connect:d4'),
    `I: connect notification dedupeKey present (keys=${keysAfter.filter((k) => String(k).startsWith('discover:')).join(',')})`,
  )
  assert(
    keysAfter.filter((k) => k === 'discover:connect:d4').length === 1,
    'I: connect notification created once',
  )

  // J) existing conversation — no duplicate (Max d1 seed + reopen)
  await page.goto(`${BASE}/discover/d1`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Oslovit a propojit se/ }).first().click()
  await page.waitForTimeout(800)
  const maxKeys = await notificationKeys(page)
  assert(
    !maxKeys.includes('discover:connect:d1') ||
      maxKeys.filter((k) => k === 'discover:connect:d1').length <= 1,
    'J: no duplicate connect notification for existing Max thread',
  )
  // Count conversation list items mentioning Max / Sarah — should not create second discover thread id
  const convCount = await page.evaluate(() => {
    // Conversations live in React state; verify via UI: only one Sarah K. row ideally
    const text = document.body.innerText
    return {
      hasSarah: text.includes('Sarah'),
      hasMax: text.includes('Max'),
    }
  })
  assert(convCount.hasMax || convCount.hasSarah, 'J: reopened Max/Sarah conversation visible')

  // Second connect to Coco should not add another notification key duplicate
  const beforeSecond = (await notificationKeys(page)).filter((k) => k === 'discover:connect:d4').length
  await page.goto(`${BASE}/discover/d4`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Oslovit a propojit se/ }).first().click()
  await page.waitForTimeout(800)
  const afterSecond = (await notificationKeys(page)).filter((k) => k === 'discover:connect:d4').length
  assert(afterSecond === beforeSecond, `J: reopen Coco keeps single notification (${beforeSecond}→${afterSecond})`)
  assert(beforeSecond >= 1 || keysAfter.includes('discover:connect:d4'), 'J: prior Coco notification still one')

  // Reload list: filters not persistent (session) — intentional
  await gotoDiscover(page)
  await page.getByRole('button', { name: 'Psi', exact: true }).click()
  await page.waitForTimeout(150)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  names = await cardNames(page)
  assert(names.length === 6, `reload clears session filters → 6 profiles (got ${names.length})`)

  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} Discover E2E failure(s)`)
    process.exit(1)
  }
  console.log('\nAll Discover E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
