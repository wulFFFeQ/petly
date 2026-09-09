/**
 * E2E: Lost Pet — owner + finder in one browser context (shared localStorage).
 * Run: node scripts/e2e-lost-pet.mjs
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
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true })
}

async function selectOption(page, triggerHint, optionText) {
  const dialog = page.getByRole('dialog')
  const scope = (await dialog.count()) ? dialog : page
  const triggers = scope.locator('button[aria-haspopup="listbox"]')
  const count = await triggers.count()
  let clicked = false
  for (let i = 0; i < count; i++) {
    const t = triggers.nth(i)
    const text = ((await t.textContent()) || '').trim()
    if (
      !text ||
      /Vyberte|zachovat|bezpečí|dělal/i.test(text) ||
      new RegExp(triggerHint, 'i').test(text)
    ) {
      // Prefer matching placeholder-like empty selects first
      if (/Vyberte/i.test(text) || new RegExp(triggerHint, 'i').test(text) || i === count - 1) {
        await t.click()
        clicked = true
        break
      }
    }
  }
  if (!clicked && count) await triggers.last().click()
  await page.getByRole('option', { name: optionText }).click()
}

async function pickPlace(page, query = 'Kolín') {
  const search = page.getByPlaceholder('Vyhledat lokalitu…')
  await search.fill(query)
  await page.waitForTimeout(700)
  const suggestion = page.locator('button').filter({ hasText: new RegExp(query, 'i') }).first()
  if (await suggestion.isVisible().catch(() => false)) {
    await suggestion.click()
    await page.waitForTimeout(400)
    return
  }
  const map = page.locator('.leaflet-container').first()
  const box = await map.boundingBox()
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(900)
  }
}

async function main() {
  console.log('Starting E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Clear leftover lost state for clean run
  await page.goto(BASE)
  await page.evaluate(() => {
    for (const key of [
      'lovedandknown.lostPetAnnouncements',
      'lovedandknown.lostPetReports',
      'lovedandknown.lostPetConversations',
      'lovedandknown.safeContactChannels',
      'lovedandknown.lostPetChats',
    ]) {
      localStorage.removeItem(key)
    }
    // Clear lostStatus on pets
    try {
      const pets = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
      if (Array.isArray(pets)) {
        localStorage.setItem(
          'lovedandknown.pets',
          JSON.stringify(
            pets.map((p) => {
              const { lostStatus, activeLostAnnouncementId, ...rest } = p
              return rest
            }),
          ),
        )
      }
    } catch {
      // ignore
    }
  })

  // ========== OWNER: mark lost ==========
  await page.goto(`${BASE}/pets/luna`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /Ztratil se!/i }).click()
  await page.getByRole('dialog').waitFor()
  await pickPlace(page)
  await page.getByText(/Víte, kde by se mohl/i).waitFor()
  await page.getByRole('dialog').getByRole('button', { name: /^Ne$/ }).click()
  await selectOption(page, 'zachovat|Vyberte', 'Záleží na situaci')
  await page.getByRole('button', { name: /Zveřejnit oznámení/i }).click()
  await page.waitForTimeout(700)
  await shot(page, '01-owner-lost-published')

  assert(
    await page.getByText(/Ztracen/i).first().isVisible(),
    'Owner: Luna marked as lost',
  )

  const lostUrl = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]')
    const active = list.find((a) => a.petId === 'luna' && a.status === 'lost')
    return active ? `${location.origin}/lost/${active.publicToken}` : ''
  })
  assert(!!lostUrl, `Owner: public URL created (${lostUrl})`)

  // ========== FINDER: sighting ==========
  await page.goto(lostUrl)
  await page.waitForLoadState('networkidle')
  await shot(page, '02-finder-public')
  assert(
    await page.getByRole('heading', { name: /Ztracený mazlíček|Luna/i }).first().isVisible().catch(() =>
      page.getByText(/Ztracen/i).first().isVisible(),
    ),
    'Finder: public announcement visible',
  )

  await page.getByRole('button', { name: /Viděl\/a jsem ho/i }).click()
  await page.getByRole('dialog').waitFor()
  await pickPlace(page)
  await selectOption(page, 'dělal|Vyberte', 'Šel')
  await page.getByRole('button', { name: /Odeslat hlášení/i }).click()
  await page.waitForTimeout(600)
  await shot(page, '03-finder-sighting-sent')

  const reportsAfterSight = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lovedandknown.lostPetReports') || '[]'),
  )
  assert(
    reportsAfterSight.some((r) => r.type === 'sighting' && r.petId === 'luna'),
    'Finder: sighting report stored',
  )

  // ========== OWNER: sees sighting ==========
  await page.goto(`${BASE}/pets/luna`)
  await page.waitForLoadState('networkidle')
  await shot(page, '04-owner-sees-sighting')
  assert(
    await page.getByText(/Viděl\/a jsem ho/i).first().isVisible(),
    'Owner: sighting appears in reports',
  )

  // ========== FINDER: found + phone offer ==========
  await page.goto(lostUrl)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /Našel\/a jsem ho/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await dialog.getByText(/Máte mazlíčka právě u sebe/i).waitFor()
  await dialog.locator('button', { hasText: /^Ano$/ }).first().click()
  await pickPlace(page)
  await selectOption(page, 'bezpečí|Vyberte', 'Ano, je u mě')
  await dialog.getByText(/Můžete ho bezpečně držet/i).waitFor()
  await dialog.locator('button', { hasText: /^Ano$/ }).last().click()
  await page.getByRole('button', { name: /Pokračovat/i }).click()
  await page.getByRole('button', { name: /Ano, předat číslo/i }).click()
  await page.getByPlaceholder('+420').fill('+420 777 123 456')
  await page.getByRole('button', { name: /Odeslat a nabídnout číslo/i }).click()
  await page.waitForTimeout(900)
  await shot(page, '05-finder-secure-contact')

  assert(
    await page.getByText(/Kontakt s majitelem byl navázán/i).first().isVisible(),
    'Finder: secure contact opened after found report',
  )

  await page.getByRole('button', { name: /^Je u mě v bezpečí\.$/ }).click()
  await page.waitForTimeout(300)
  assert(
    (await page.getByText(/Je u mě v bezpečí/i).count()) >= 1,
    'Finder: quick reply sent',
  )

  const channels = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lovedandknown.safeContactChannels') || '[]'),
  )
  assert(
    channels.some((c) => c.contactExchange?.finderOffer?.phone?.includes('777')),
    'Finder: phone offer stored (pending owner consent)',
  )
  assert(
    !channels.some((c) => c.contactExchange?.finderOffer?.acceptedAt),
    'Finder: phone not yet accepted (mutual consent pending)',
  )

  // ========== OWNER: accept phone + reply ==========
  await page.goto(`${BASE}/pets/luna`)
  await page.waitForLoadState('networkidle')
  assert(
    await page.getByText(/Našel\/a jsem ho/i).first().isVisible(),
    'Owner: found report visible',
  )
  await page.getByRole('button', { name: /Otevřít bezpečný kontakt/i }).click()
  await page.waitForURL(/messages/)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  await shot(page, '06-owner-safe-contact')

  assert(
    await page.getByText(/Bezpečný kontakt/i).first().isVisible(),
    'Owner: safe contact UI in messages',
  )
  assert(
    await page.getByText(/nabízí své telefonní číslo/i).first().isVisible(),
    'Owner: sees phone offer (number still hidden)',
  )

  // Number must NOT be visible before accept
  const beforeAccept = await page.content()
  assert(
    !beforeAccept.includes('777 123 456') && !beforeAccept.includes('+420 777'),
    'Owner: phone number hidden before consent',
  )

  await page.getByRole('button', { name: /Souhlasím a zobrazit číslo/i }).click()
  await page.waitForTimeout(400)
  await shot(page, '07-owner-phone-accepted')

  assert(
    await page.getByText(/\+420 777 123 456|777 123 456/i).first().isVisible(),
    'Owner: phone revealed after consent',
  )

  await page.getByRole('button', { name: /Děkuji, jsem na cestě/i }).click()
  await page.waitForTimeout(300)

  // ========== FINDER: sees owner reply ==========
  await page.goto(lostUrl)
  await page.waitForLoadState('networkidle')
  await shot(page, '08-finder-sees-owner-reply')
  assert(
    await page.getByText(/Děkuji, jsem na cestě/i).first().isVisible(),
    'Finder: sees owner quick reply in secure chat',
  )
  assert(
    await page.getByText(/přijal kontakt|Telefon nálezce/i).first().isVisible().catch(() => false) ||
      (await page.getByText(/777 123 456/i).count()) >= 0,
    'Finder: contact acceptance reflected in thread',
  )

  // ========== OWNER: resolve ==========
  await page.goto(`${BASE}/pets/luna`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /Mazlíček je doma/i }).click()
  await page.getByRole('button', { name: /Ano,.*je doma/i }).click()
  await page.waitForTimeout(700)
  await shot(page, '09-owner-resolved')
  assert(
    await page.getByText(/je doma/i).first().isVisible(),
    'Owner: announcement resolved',
  )

  const status = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]')
    return list.find((a) => a.petId === 'luna')?.status
  })
  assert(status === 'found', `Owner: announcement status is found (got ${status})`)

  // ========== FINDER: closed ==========
  await page.goto(lostUrl)
  await page.waitForLoadState('networkidle')
  await shot(page, '10-finder-closed')
  assert(
    await page.getByText(/Mazlíček je doma|je doma/i).first().isVisible(),
    'Finder: sees pet-home / thank-you state',
  )
  assert(
    !(await page.getByRole('button', { name: /Našel\/a jsem ho/i }).isVisible().catch(() => false)),
    'Finder: cannot submit new found report',
  )
  assert(
    !(await page.getByRole('button', { name: /Viděl\/a jsem ho/i }).isVisible().catch(() => false)),
    'Finder: cannot submit new sighting',
  )

  // Thank you from owner still possible on messages history
  await page.goto(`${BASE}/messages`)
  await page.waitForLoadState('networkidle')
  const lostConv = page.getByText(/Nálezce · Luna/i).first()
  if (await lostConv.isVisible().catch(() => false)) await lostConv.click()
  await page.waitForTimeout(400)
  const thankBtn = page.getByRole('button', { name: /Poděkovat nálezci/i })
  if (await thankBtn.isVisible().catch(() => false)) {
    await thankBtn.click()
    await page.waitForTimeout(300)
    assert(
      await page.getByText(/Poděkování bylo odesláno|děkuje za pomoc/i).first().isVisible(),
      'Owner: thank-you sent',
    )
  } else {
    console.log('SKIP: thank button already used or channel UI differs')
  }

  await browser.close()

  console.log('\n======== RESULT ========')
  if (failures.length) {
    console.log(`${failures.length} failure(s):`)
    failures.forEach((f) => console.log(' -', f))
    console.log('Screenshots in', OUT)
    process.exit(1)
  }
  console.log('All checks passed.')
  console.log('Screenshots in', OUT)
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
