/**
 * E2E: Lost & Found + Emergency authorization (KROK 38)
 * Run: node scripts/e2e-lost-found-auth.mjs
 * Requires: npm run dev
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
    path: path.join(OUT, `lf-auth-${name}.png`),
    fullPage: false,
  })
}

const PET_ID = 'luna'

const SEED_ACCOUNTS = [
  {
    id: 'owner_self',
    kind: 'consumer',
    roles: ['owner'],
    displayName: 'Tereza',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acct_petr',
    kind: 'consumer',
    roles: ['owner'],
    displayName: 'Petr',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acct_anna',
    kind: 'consumer',
    roles: ['owner'],
    displayName: 'Anna',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'acct_bara',
    kind: 'consumer',
    roles: ['owner'],
    displayName: 'Bára',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

async function seed(page) {
  await page.evaluate(
    ({ accounts }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify(accounts))
      localStorage.setItem('lovedandknown.petHouseholdAccess', JSON.stringify([]))
      localStorage.setItem('lovedandknown.petHouseholdAccessLogs', JSON.stringify([]))
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([]))
      for (const key of [
        'lovedandknown.lostPetAnnouncements',
        'lovedandknown.lostPetReports',
        'lovedandknown.lostPetConversations',
        'lovedandknown.safeContactChannels',
        'lovedandknown.lostPetChats',
      ]) {
        localStorage.removeItem(key)
      }
    },
    { accounts: SEED_ACCOUNTS },
  )
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

async function markLostViaUi(page) {
  await page.getByTestId('mark-lost-button').click()
  await page.getByRole('dialog').waitFor()
  await pickPlace(page)
  await page.getByText(/Víte, kde by se mohl/i).waitFor()
  await page.getByRole('dialog').getByRole('button', { name: /^Ne$/ }).click()
  await selectOption(page, 'zachovat|Vyberte', 'Záleží na situaci')
  await page.getByRole('button', { name: /Zveřejnit oznámení/i }).click()
  await page.waitForTimeout(700)
}

async function domainAuth(page, { actorId, role, withLostManage }) {
  return page.evaluate(
    async ({ actorId, role, withLostManage, petId }) => {
      const mod = await import('/src/lib/household/index.ts')
      const petsRaw = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
      const pet =
        petsRaw.find((p) => p.id === petId) ||
        {
          id: petId,
          name: 'Luna',
          type: 'dog',
          breed: 'Zlatý retriever',
          image: '',
          ownerAccountId: 'owner_self',
        }
      const list = mod.loadPetHouseholdAccess()
      let accessList = list
      if (role) {
        const suggested = mod.suggestedHouseholdPermissionsForRole(role)
        const permissions = withLostManage
          ? [...suggested, 'lost_manage']
          : suggested
        const existing = list.filter(
          (a) => !(a.accountId === actorId && a.petId === petId && a.status === 'active'),
        )
        const accounts = JSON.parse(localStorage.getItem('lovedandknown.accounts') || '[]')
        const result = mod.grantHouseholdAccess(existing, [], {
          pet: { ...pet, ownerAccountId: pet.ownerAccountId || 'owner_self' },
          accountId: actorId,
          role,
          permissions,
          grantedByAccountId: 'owner_self',
          accounts,
        })
        mod.savePetHouseholdAccess(result.accessList)
        accessList = result.accessList
      }
      return {
        canManage: mod.canManagePetLostFound(pet, actorId, accessList),
        canWriteEmergency: mod.canWritePetEmergency(pet, actorId, accessList),
        canReadEmergency: mod.canReadPetEmergency(pet, actorId, accessList),
        lostManageDefault: mod
          .suggestedHouseholdPermissionsForRole(role || 'co_owner')
          .includes('lost_manage'),
      }
    },
    { actorId, role, withLostManage, petId: PET_ID },
  )
}

async function main() {
  console.log('Starting L&F auth E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seed(page)

  // ── A: OWNER marks pet LOST ──
  await page.goto(`${BASE}/pets/${PET_ID}`, { waitUntil: 'networkidle' })
  assert(await page.getByTestId('mark-lost-button').isVisible(), 'A: mark-lost button visible for owner')
  await markLostViaUi(page)
  await shot(page, '01-owner-mark-lost')

  const lostState = await page.evaluate(() => {
    const pets = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
    const pet = pets.find((p) => p.id === 'luna')
    const list = JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]')
    const active = list.find((a) => a.petId === 'luna' && a.status === 'lost')
    return {
      lostStatus: pet?.lostStatus,
      token: active?.publicToken || '',
      announcementId: active?.id || '',
    }
  })
  assert(lostState.lostStatus === 'lost', 'A: pet.lostStatus is lost')
  assert(!!lostState.token, 'A: public lost token created')

  // Clear lost for subsequent domain scenarios
  await page.evaluate(() => {
    localStorage.removeItem('lovedandknown.lostPetAnnouncements')
    localStorage.removeItem('lovedandknown.lostPetReports')
    localStorage.removeItem('lovedandknown.safeContactChannels')
    try {
      const pets = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
      localStorage.setItem(
        'lovedandknown.pets',
        JSON.stringify(
          pets.map((p) => {
            const { lostStatus, activeLostAnnouncementId, ...rest } = p
            return rest
          }),
        ),
      )
    } catch {
      /* ignore */
    }
  })
  await page.reload({ waitUntil: 'networkidle' })

  // ── B: CO-OWNER without lost_manage rejected ──
  const b = await domainAuth(page, {
    actorId: 'acct_petr',
    role: 'co_owner',
    withLostManage: false,
  })
  assert(b.lostManageDefault === false, 'B: co-owner default has no lost_manage')
  assert(b.canManage === false, 'B: co-owner without lost_manage cannot manage L&F')
  await shot(page, '02-co-owner-no-lost')

  // ── C: OWNER grants lost_manage via UI → co-owner can manage ──
  await page.goto(`${BASE}/pets/${PET_ID}?tab=overview`, { waitUntil: 'networkidle' })
  await page.locator('#who-has-access').scrollIntoViewIfNeeded()

  // Update existing Petr grant: open manage and check lost_manage
  const petrCard = page.locator('[data-testid^="household-card-"]').filter({ hasText: 'Petr' })
  if (await petrCard.isVisible().catch(() => false)) {
    await petrCard.getByTestId(/^household-manage-/).click()
    await page.getByTestId('household-manage-modal').waitFor({ state: 'visible' })
    await page.getByTestId('household-edit-perm-lost_manage').check()
    await page.getByTestId('household-manage-save').click()
    await page.waitForTimeout(500)
  } else {
    await page.getByTestId(`household-add-${PET_ID}`).click()
    await page.getByTestId('household-grant-modal').waitFor({ state: 'visible' })
    await page.getByTestId('household-grant-account').selectOption('acct_petr')
    await page.getByTestId('household-grant-role-co_owner').check()
    await page.getByTestId('household-grant-perm-lost_manage').check()
    await page.getByTestId('household-grant-save').click()
    await page.waitForTimeout(500)
  }

  const c = await page.evaluate(async () => {
    const mod = await import('/src/lib/household/index.ts')
    const list = mod.loadPetHouseholdAccess()
    const pet = {
      id: 'luna',
      name: 'Luna',
      type: 'dog',
      breed: 'Zlatý retriever',
      image: '',
      ownerAccountId: 'owner_self',
    }
    const access = list.find((a) => a.accountId === 'acct_petr' && a.status === 'active')
    return {
      hasPerm: Boolean(access?.permissions.includes('lost_manage')),
      canManage: mod.canManagePetLostFound(pet, 'acct_petr', list),
    }
  })
  assert(c.hasPerm === true, 'C: co-owner granted lost_manage')
  assert(c.canManage === true, 'C: co-owner with lost_manage can mark lost')
  await shot(page, '03-co-owner-with-lost')

  // ── D: CAREGIVER rejected ──
  const d = await domainAuth(page, {
    actorId: 'acct_anna',
    role: 'caregiver',
    withLostManage: false,
  })
  assert(d.canManage === false, 'D: caregiver cannot mark lost')
  assert(d.canWriteEmergency === false, 'D: caregiver cannot write emergency')
  assert(d.canReadEmergency === true, 'D: caregiver can read emergency')

  // ── E: VIEWER rejected ──
  const e = await domainAuth(page, {
    actorId: 'acct_bara',
    role: 'viewer',
    withLostManage: false,
  })
  assert(e.canManage === false, 'E: viewer cannot mark lost')
  assert(e.canReadEmergency === false, 'E: viewer no emergency access')
  assert(e.canWriteEmergency === false, 'E: viewer cannot write emergency')
  await shot(page, '04-caregiver-viewer')

  // ── F: OWNER emergency edit success ──
  await page.goto(`${BASE}/pets/${PET_ID}`, { waitUntil: 'networkidle' })
  await page.getByTestId('emergency-card-button').click()
  await page.getByTestId('emergency-card-modal').waitFor({ state: 'visible' })
  assert(await page.getByTestId('emergency-settings-toggle').isVisible(), 'F: owner can open emergency settings')
  await page.getByTestId('emergency-settings-toggle').click()
  await page.waitForTimeout(300)
  await shot(page, '05-owner-emergency')
  await page.keyboard.press('Escape')

  // ── G: CAREGIVER emergency write rejected (domain) ──
  assert(d.canWriteEmergency === false, 'G: caregiver emergency write rejected')

  // ── H: FINDER QR / emergency / SafeContact privacy ──
  // Re-mark lost as owner for public flow
  await page.goto(`${BASE}/pets/${PET_ID}`, { waitUntil: 'networkidle' })
  const alreadyLost = await page.getByTestId('resolve-lost-button').isVisible().catch(() => false)
  if (!alreadyLost) {
    await markLostViaUi(page)
  }

  const publicUrls = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.lostPetAnnouncements') || '[]')
    const active = list.find((a) => a.petId === 'luna' && a.status === 'lost')
    const pets = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
    const pet = pets.find((p) => p.id === 'luna')
    const slug = pet?.emergencyCard?.publicSlug
    return {
      lost: active ? `${location.origin}/lost/${active.publicToken}` : '',
      emergency: slug ? `${location.origin}/pet/${slug}/emergency` : '',
    }
  })
  assert(!!publicUrls.lost, 'H: lost public URL available')

  await page.goto(publicUrls.lost, { waitUntil: 'networkidle' })
  const lostHtml = await page.content()
  assert(!/owner_self/i.test(lostHtml), 'H: lost page has no accountId')
  assert(!/\+420\s?\d{3}/.test(lostHtml), 'H: lost page has no phone')
  assert(!/@[a-z0-9.-]+\.[a-z]{2,}/i.test(lostHtml), 'H: lost page has no email')
  assert(!/985112/.test(lostHtml), 'H: lost page has no microchip')
  await shot(page, '06-finder-lost')

  // SafeContact via found report
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
  // Skip phone — use app contact only if offered
  const skipPhone = page.getByRole('button', { name: /Ne, jen přes aplikaci|Pokračovat bez|Odeslat/i })
  if (await skipPhone.first().isVisible().catch(() => false)) {
    await skipPhone.first().click()
  } else {
    const sendBtn = page.getByRole('button', { name: /Odeslat/i })
    if (await sendBtn.isVisible().catch(() => false)) await sendBtn.click()
  }
  await page.waitForTimeout(800)

  const channelOk = await page.evaluate(() => {
    const channels = JSON.parse(localStorage.getItem('lovedandknown.safeContactChannels') || '[]')
    return channels.some((c) => c.petId === 'luna' || c.announcementId)
  })
  assert(channelOk || (await page.getByText(/Kontakt|navázán|zpráva/i).first().isVisible().catch(() => false)), 'H: SafeContact flow functional')

  if (publicUrls.emergency) {
    await page.goto(publicUrls.emergency, { waitUntil: 'networkidle' })
    const emgHtml = await page.content()
    assert(!/owner_self/i.test(emgHtml), 'H: emergency page has no accountId')
    assert(!/owner@|@example\.com/i.test(emgHtml), 'H: emergency page has no owner email')
    assert(!/Hlavní\s+\d/i.test(emgHtml), 'H: emergency page has no address')
    await shot(page, '07-finder-emergency')
  }

  // Owner still receives lost_found / message notifications
  const notifOk = await page.evaluate(() => {
    const n = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
    return n.some((item) => item.type === 'lost_pet' || item.type === 'lost_found' || item.type === 'message')
  })
  assert(notifOk, 'H: owner receives existing lost/message notification')

  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`FAILED ${failures.length}:`)
    failures.forEach((f) => console.error(' -', f))
    process.exit(1)
  }
  console.log('All L&F auth E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
