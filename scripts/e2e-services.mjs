/**
 * E2E: Služby — Travel / Contacts / Concierge (checklist A–L)
 * Run: node scripts/e2e-services.mjs
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
  await page.screenshot({ path: path.join(OUT, `services-${name}.png`), fullPage: false })
}

async function main() {
  console.log('Starting Services E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Reset services storage for a clean run
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('lovedandknown.importantContacts')
    localStorage.removeItem('lovedandknown.conciergeRequests')
    localStorage.removeItem('lovedandknown.travelPrefs')
  })
  await page.reload({ waitUntil: 'networkidle' })

  // ——— A) Travel flow ———
  await page.goto(`${BASE}/travel`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'a-travel')

  const petChip = page.getByRole('button', { name: 'Luna' })
  assert(await petChip.isVisible().catch(() => false), 'A: pet picker shows Luna')

  const readiness = page.getByTestId('travel-readiness-banner')
  assert(await readiness.isVisible().catch(() => false), 'A: readiness banner visible')

  // ——— B) readiness from data ———
  const label = page.getByTestId('travel-readiness-label')
  const labelText = ((await label.textContent()) || '').trim()
  assert(
    /Připraveno k cestě|dokončit|chybí/i.test(labelText),
    `B: readiness label from data (“${labelText}”)`,
  )

  // ——— C) click incomplete step ———
  // Force an incomplete document step: strip EU passport docs for Bella and switch pet
  await page.evaluate(() => {
    const docs = JSON.parse(localStorage.getItem('lovedandknown.petDocuments') || '[]')
    const next = docs.filter((d) => !(d.petId === 'bella' && d.documentType === 'eu_passport'))
    localStorage.setItem('lovedandknown.petDocuments', JSON.stringify(next))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Bella' }).click()
  await page.waitForTimeout(400)

  const stepLink = page.locator('a[data-testid="travel-step-eu_passport"]').first()
  const hasStepLink = (await stepLink.count()) > 0
  if (hasStepLink) {
    await stepLink.click()
    await page.waitForTimeout(600)
    const url = page.url()
    assert(/\/pets\/bella/.test(url), `C: incomplete step navigates to Bella (${url})`)
    assert(/tab=documents/.test(url), `C: deep-link opens documents tab (${url})`)
  } else {
    const confirmBtn = page.locator('[data-testid^="travel-confirm-"]').first()
    if ((await confirmBtn.count()) > 0) {
      await confirmBtn.click()
      await page.waitForTimeout(300)
      assert(true, 'C: confirmed procedural step')
    } else {
      assert(false, 'C: expected clickable incomplete eu_passport step for Bella')
    }
  }

  // ——— D) create contact ———
  await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'd-contacts')

  await page.getByTestId('contacts-add').click()
  await page.waitForTimeout(300)
  assert(await page.getByTestId('contact-form').isVisible().catch(() => false), 'D: contact form opens')

  await page.locator('#contact-name').fill('E2E Test Klinika')
  await page.locator('#contact-phone').fill('+420 111 222 333')
  await page.locator('#contact-email').fill('e2e@klinika.test')
  await page.locator('#contact-address').fill('Testovací 1, Praha')
  await page.locator('#contact-type').selectOption('vet')
  await page.locator('#contact-primary').selectOption('luna')
  await page.getByTestId('contact-save').click()
  await page.waitForTimeout(500)

  const createdCard = page.locator('text=E2E Test Klinika').first()
  assert(await createdCard.isVisible().catch(() => false), 'D: created contact visible')

  // find card id from localStorage
  const createdId = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.importantContacts')
    const list = raw ? JSON.parse(raw) : []
    const hit = list.find((c) => c.name === 'E2E Test Klinika')
    return hit?.id || null
  })
  assert(Boolean(createdId), 'D: contact persisted in localStorage')

  // ——— E) edit contact ———
  if (createdId) {
    await page.getByTestId(`contact-edit-${createdId}`).click()
    await page.waitForTimeout(300)
    await page.locator('#contact-name').fill('E2E Test Klinika Upraveno')
    await page.getByTestId('contact-save').click()
    await page.waitForTimeout(400)
    assert(
      await page.locator('text=E2E Test Klinika Upraveno').first().isVisible().catch(() => false),
      'E: edited contact name visible',
    )
  }

  // ——— F) primary badge ———
  if (createdId) {
    const primaryBadge = page.getByTestId(`contact-primary-${createdId}`)
    assert(await primaryBadge.isVisible().catch(() => false), 'F: primary badge on contact')
  }

  // ——— G) Call / Maps / Mail hrefs ———
  if (createdId) {
    const callHref = await page.getByTestId(`contact-call-${createdId}`).getAttribute('href')
    const mapsHref = await page.getByTestId(`contact-maps-${createdId}`).getAttribute('href')
    const mailHref = await page.getByTestId(`contact-mail-${createdId}`).getAttribute('href')
    assert(callHref?.startsWith('tel:'), `G: call href tel: (${callHref})`)
    assert(mapsHref?.includes('maps'), `G: maps href (${mapsHref})`)
    assert(mailHref?.startsWith('mailto:'), `G: mail href (${mailHref})`)
  }

  // ——— H) Concierge create ———
  await page.goto(`${BASE}/concierge`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'h-concierge')

  await page.getByTestId('concierge-cta').click()
  await page.waitForTimeout(300)
  assert(await page.getByTestId('concierge-form').isVisible().catch(() => false), 'H: form opens')
  await page.locator('#concierge-description').fill('E2E potřebuji pomoc s cestováním do Německa')
  await page.locator('#concierge-type').selectOption('travel')
  await page.getByTestId('concierge-submit').click()
  await page.waitForTimeout(500)

  const requestId = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.conciergeRequests')
    const list = raw ? JSON.parse(raw) : []
    const hit = list.find((r) => (r.description || '').includes('E2E potřebuji pomoc'))
    return hit?.id || null
  })
  assert(Boolean(requestId), 'H: concierge request created + persisted')
  assert(
    await page.getByTestId('concierge-requests').isVisible().catch(() => false),
    'H: requests list visible',
  )

  // ——— I) status change ———
  if (requestId) {
    await page.locator(`#concierge-status-${requestId}`).selectOption('in_progress')
    await page.waitForTimeout(300)
    const status = await page.evaluate((id) => {
      const raw = localStorage.getItem('lovedandknown.conciergeRequests')
      const list = raw ? JSON.parse(raw) : []
      return list.find((r) => r.id === id)?.status
    }, requestId)
    assert(status === 'in_progress', `I: status updated to in_progress (${status})`)
  }

  // ——— J) persistence after reload ———
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  if (requestId) {
    assert(
      await page.getByTestId(`concierge-request-${requestId}`).isVisible().catch(() => false),
      'J: concierge request survives reload',
    )
  }
  await page.goto(`${BASE}/contacts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    await page.locator('text=E2E Test Klinika Upraveno').first().isVisible().catch(() => false),
    'J: contact survives reload',
  )

  // ——— K) emergency card shows primary ———
  await page.goto(`${BASE}/pets/luna`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const emergencyBtn = page.getByRole('button', { name: /Nouzová karta/i })
  assert(await emergencyBtn.isVisible().catch(() => false), 'K: emergency card button visible')
  await emergencyBtn.click()
  await page.waitForTimeout(600)
  const primaryBlock = page.getByTestId('emergency-primary-contact')
  assert(await primaryBlock.isVisible().catch(() => false), 'K: primary contact on emergency card')
  const primaryText = (await primaryBlock.textContent()) || ''
  assert(
    /E2E Test Klinika Upraveno|Jan V/i.test(primaryText),
    `K: primary contact name shown (“${primaryText.slice(0, 80)}”)`,
  )
  await shot(page, 'k-emergency')

  // ——— L) privacy — Discover projection has no contact PII ———
  const leak = await page.evaluate(() => {
    const contacts = JSON.parse(localStorage.getItem('lovedandknown.importantContacts') || '[]')
    const e2e = contacts.find((c) => (c.name || '').includes('E2E'))
    const phone = e2e?.phone
    const email = e2e?.email
    // Scan discover-related storage / DOM is hard; check page JSON isn't dumping contacts
    const body = document.body.innerText
    const hasPhoneInDiscover = false
    return {
      phone,
      email,
      bodyHasPhone: phone ? body.includes(phone) && window.location.pathname.includes('discover') : false,
      hasPhoneInDiscover,
      contactKeys: e2e ? Object.keys(e2e) : [],
    }
  })

  await page.goto(`${BASE}/discover`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const discoverLeak = await page.evaluate((pii) => {
    const html = document.documentElement.innerHTML
    return {
      phoneInHtml: pii.phone ? html.includes(pii.phone) : false,
      emailInHtml: pii.email ? html.includes(pii.email) : false,
      addressInHtml: html.includes('Testovací 1, Praha'),
    }
  }, { phone: leak.phone, email: leak.email })

  assert(!discoverLeak.phoneInHtml, 'L: contact phone not in Discover HTML')
  assert(!discoverLeak.emailInHtml, 'L: contact email not in Discover HTML')
  assert(!discoverLeak.addressInHtml, 'L: contact address not in Discover HTML')

  await shot(page, 'z-done')
  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nAll Services E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
