/**
 * Extra checks: privacy on public page, found without contact, resolve.
 * Run: node scripts/e2e-lost-pet-privacy.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const failures = []

function assert(cond, msg) {
  if (!cond) {
    failures.push(msg)
    console.error('FAIL:', msg)
  } else {
    console.log('OK  :', msg)
  }
}

async function pickPlace(page) {
  const search = page.getByPlaceholder('Vyhledat lokalitu…')
  await search.fill('Kolín')
  await page.waitForTimeout(700)
  const suggestion = page.locator('button').filter({ hasText: /Kolín/i }).first()
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
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(BASE)
  await page.evaluate(() => {
    localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
    for (const key of [
      'lovedandknown.lostPetAnnouncements',
      'lovedandknown.lostPetReports',
      'lovedandknown.lostPetConversations',
      'lovedandknown.safeContactChannels',
      'lovedandknown.lostPetChats',
    ]) {
      localStorage.removeItem(key)
    }
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

  const token = 'privacytesttoken1234567890ab'
  await page.evaluate((tok) => {
    const pets = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
    const announcement = {
      id: 'lost-privacy-1',
      publicToken: tok,
      petId: 'luna',
      status: 'lost',
      createdAt: new Date().toISOString(),
      lastSeen: {
        publicLabel: 'Kolín – Zálabí',
        privateLabel: 'Ulice Domů 12',
        lat: 50.02,
        lng: 15.2,
        publicLat: 50.02,
        publicLng: 15.2,
        seenAt: new Date().toISOString(),
      },
      knowsPossibleArea: false,
      publicBehavior: 'situational',
      respondsToName: 'Luna',
      allowAppContact: false,
      importantInstructions: 'Neběhat za ní.',
    }
    localStorage.setItem('lovedandknown.lostPetAnnouncements', JSON.stringify([announcement]))
    localStorage.setItem(
      'lovedandknown.pets',
      JSON.stringify(
        pets.map((p) =>
          p.id === 'luna'
            ? {
                ...p,
                lostStatus: 'lost',
                activeLostAnnouncementId: announcement.id,
                microchip: p.microchip || '123456789012345',
              }
            : p,
        ),
      ),
    )
  }, token)

  await page.goto(`${BASE}/lost/${token}`)
  await page.waitForLoadState('networkidle')
  const html = await page.content()

  assert(!html.includes('123456789012345'), 'H: no full microchip on public page')
  assert(!html.includes('Ulice Domů 12'), 'H: no private home street on public page')
  assert(!/mailto:|@gmail|@seznam/i.test(html), 'H: no owner email on public page')
  assert(
    await page.getByRole('button', { name: /Našel\/a jsem ho/i }).isVisible(),
    'D: found CTA enabled without allowAppContact',
  )

  await page.getByRole('button', { name: /Našel\/a jsem ho/i }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor()
  assert(
    await page.getByRole('button', { name: /Odeslat hlášení nálezu/i }).isVisible(),
    'D: report-only submit button (no chat step)',
  )

  await dialog.locator('button', { hasText: /^Ano$/ }).first().click()
  await pickPlace(page)

  // Time preset already defaults to "Právě teď" — open safety select
  const selectTriggers = dialog.locator('button[aria-haspopup="listbox"]')
  const count = await selectTriggers.count()
  for (let i = 0; i < count; i++) {
    const text = ((await selectTriggers.nth(i).textContent()) || '').trim()
    if (/Vyberte|bezpečí/i.test(text) || i === count - 1) {
      await selectTriggers.nth(i).click()
      break
    }
  }
  await page.getByRole('option', { name: 'Ano, je u mě' }).click()
  await dialog.getByText(/Můžete ho bezpečně držet/i).waitFor()
  await dialog.locator('button', { hasText: /^Ano$/ }).last().click()
  await page.getByRole('button', { name: /Odeslat hlášení nálezu/i }).click()
  await page.waitForTimeout(800)

  const state = await page.evaluate(() => ({
    reports: JSON.parse(localStorage.getItem('lovedandknown.lostPetReports') || '[]'),
    channels: JSON.parse(localStorage.getItem('lovedandknown.safeContactChannels') || '[]'),
    convos: JSON.parse(localStorage.getItem('lovedandknown.lostPetConversations') || '[]'),
    anns: JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]'),
  }))

  assert(
    state.reports.some((r) => r.type === 'found' && r.petId === 'luna'),
    'D: found report stored without contact',
  )
  assert(
    state.channels.length === 0 && state.convos.length === 0,
    'D: no SafeContactChannel / Messages thread',
  )
  assert(
    state.anns.filter((a) => a.petId === 'luna' && a.status === 'lost').length === 1,
    'J: only one active lost announcement',
  )

  await page.goto(`${BASE}/pets/luna`)
  await page.waitForLoadState('networkidle')
  assert(
    await page.getByText(/Nález/i).first().isVisible(),
    'C: found report visible in owner panel',
  )
  assert(
    !(await page.getByRole('button', { name: /Otevřít bezpečný kontakt/i }).isVisible().catch(() => false)),
    'D: no safe contact button when contact was disabled',
  )

  await page.getByRole('button', { name: /Mazlíček je doma/i }).click()
  await page.getByRole('button', { name: /Ano,.*je doma/i }).click()
  await page.waitForTimeout(700)

  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]'),
  )
  assert(after.find((a) => a.id === 'lost-privacy-1')?.status === 'found', 'F: status found')
  assert(after.length >= 1, 'F: history kept')
  assert(
    await page.getByText(/pátrání ukončeno/i).first().isVisible(),
    'F: historical ended-search label on profile',
  )

  await page.goto(`${BASE}/lost/${token}`)
  await page.waitForLoadState('networkidle')
  assert(
    !(await page.getByRole('button', { name: /Viděl\/a jsem ho/i }).isVisible().catch(() => false)),
    'G: no new sighting CTA after resolve',
  )
  assert(
    await page.getByText(/je doma|ukončen/i).first().isVisible(),
    'F: public page shows resolved / inactive search',
  )

  // Reload persistence
  await page.reload()
  await page.waitForLoadState('networkidle')
  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]'),
  )
  assert(persisted.find((a) => a.id === 'lost-privacy-1')?.status === 'found', 'I: reload keeps history')

  await browser.close()
  console.log('\n======== RESULT ========')
  if (failures.length) {
    console.log(`${failures.length} failure(s):`)
    failures.forEach((f) => console.log(' -', f))
    process.exit(1)
  }
  console.log('Privacy + no-contact checks passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
