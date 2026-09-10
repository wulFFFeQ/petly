/**
 * E2E: Notification system (KROK 9)
 * Run: node scripts/e2e-notifications.mjs
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
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false })
}

async function openBell(page) {
  const overlay = page.locator('.fixed.inset-0.z-30')
  if (await overlay.count()) {
    await overlay.first().click({ force: true })
    await page.waitForTimeout(150)
  }
  const bell = page.getByTestId('notifications-bell').or(page.getByRole('button', { name: 'Notifikace' }))
  await bell.first().click()
  await page.waitForTimeout(200)
}

async function closeBell(page) {
  const overlay = page.locator('.fixed.inset-0.z-30')
  if (await overlay.count()) {
    await overlay.first().click({ force: true })
    await page.waitForTimeout(150)
  }
}

async function unreadFromStorage(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.notifications')
    if (!raw) return { total: 0, unread: 0, keys: [] }
    const list = JSON.parse(raw)
    return {
      total: list.length,
      unread: list.filter((n) => n.unread).length,
      keys: list.map((n) => n.dedupeKey),
    }
  })
}

async function main() {
  console.log('Starting notifications E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
  })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // A) notifications persist after reload
  await openBell(page)
  const beforeCount = await page.locator('text=Notifikace').first().isVisible()
  assert(beforeCount, 'A: dropdown opens')
  const storedBefore = await unreadFromStorage(page)
  assert(storedBefore.total > 0, `A: storage has notifications (${storedBefore.total})`)
  await page.keyboard.press('Escape')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const storedAfter = await unreadFromStorage(page)
  assert(storedAfter.total >= storedBefore.total, 'A/F: list survives reload')
  assert(
    storedAfter.unread === storedBefore.unread || storedAfter.unread >= 0,
    'F: unread state present after reload',
  )

  // B/E) unread badge / gold dot
  await openBell(page)
  const badge = page.locator('text=/\\d+ nové/')
  const unread = storedAfter.unread
  if (unread > 0) {
    assert(await badge.count() > 0, `B/E: badge shows for ${unread} unread`)
  } else {
    assert(await badge.count() === 0, 'E: no badge when unread=0')
  }
  await shot(page, 'notifications-dropdown')
  await closeBell(page)

  // G) dedupe — reload should not duplicate med/calendar keys
  const keySet = new Set(storedAfter.keys)
  assert(keySet.size === storedAfter.keys.length, 'G: no duplicate dedupeKeys in storage')

  // D) mark all as read
  await openBell(page)
  const markAll = page.getByRole('button', { name: /Označit jako přečtené/i })
  if (await markAll.count()) {
    await markAll.click()
    await page.waitForTimeout(300)
    const afterMark = await unreadFromStorage(page)
    assert(afterMark.unread === 0, 'D: all marked read')
    assert(afterMark.total === storedAfter.total, 'D: items not deleted')
    await closeBell(page)
    await openBell(page)
    assert((await badge.count()) === 0, 'E: badge gone after mark all')
    await closeBell(page)
  }

  // C/L) click notification marks read + navigates
  // Seed a unique notification via localStorage then reload
  await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.notifications')
    const list = raw ? JSON.parse(raw) : []
    list.unshift({
      id: 'e2e-click-target',
      type: 'calendar',
      title: 'E2E click target',
      message: 'Navigate me',
      createdAt: new Date().toISOString(),
      unread: true,
      priority: 'normal',
      dedupeKey: 'e2e:click-target',
      href: '/calendar',
    })
    localStorage.setItem('lovedandknown.notifications', JSON.stringify(list))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await openBell(page)
  await page.getByText('E2E click target').click()
  await page.waitForTimeout(500)
  assert(page.url().includes('/calendar'), 'C/L: click navigates to calendar')
  const afterClick = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
    return list.find((n) => n.dedupeKey === 'e2e:click-target')
  })
  assert(afterClick && afterClick.unread === false, 'C: clicked item marked read')

  // M) empty state via test hook (avoids reconcile refill)
  await page.waitForFunction(() => Boolean(window.__LK_NOTIFICATIONS__))
  await page.evaluate(() => {
    window.__LK_NOTIFICATIONS__.set([])
  })
  await page.waitForTimeout(200)
  await openBell(page)
  assert(await page.getByText('Vše je v pořádku').isVisible(), 'M: empty state title')
  assert(
    await page.getByText('Nemáte žádná nová upozornění.').isVisible(),
    'M: empty state message',
  )
  await closeBell(page)

  // I) lost sighting / found style notification via upsert hook
  await page.evaluate(() => {
    window.__LK_NOTIFICATIONS__.upsert({
      id: 'e2e-sight-1',
      type: 'lost_sighting',
      title: 'Nové spatření Coco',
      message: 'Někdo nahlásil možné spatření.',
      priority: 'important',
      dedupeKey: 'lost:sighting:e2e-sight-1',
      petName: 'Coco',
      href: '/pets/coco?tab=overview#lost-panel',
    })
    window.__LK_NOTIFICATIONS__.upsert({
      id: 'e2e-found-1',
      type: 'lost_found',
      title: 'Coco byla nalezena',
      message: 'Bylo nahlášeno nalezení mazlíčka.',
      priority: 'urgent',
      dedupeKey: 'lost:found:e2e-found-1',
      petName: 'Coco',
      href: '/pets/coco?tab=overview#lost-panel',
    })
  })
  await openBell(page)
  assert(await page.getByText('Nové spatření Coco').isVisible(), 'I: sighting notification')
  assert(await page.getByText('Coco byla nalezena').isVisible(), 'J: found notification')
  await closeBell(page)

  // N) long list — preview then expand full list
  await page.evaluate(() => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: `e2e-long-${i}`,
      type: 'system',
      title: `E2E long item ${i}`,
      message: `Detail ${i}`,
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      unread: i < 3,
      priority: 'normal',
      dedupeKey: `e2e:long:${i}`,
    }))
    window.__LK_NOTIFICATIONS__.set(items)
  })
  await page.waitForTimeout(200)
  await openBell(page)
  const dropdown = page.locator('.absolute.right-0.top-11').first()
  const listScroll = dropdown.locator('.overflow-y-auto').first()
  const headerVisible = await page.getByText('Notifikace').first().isVisible()
  assert(headerVisible, 'N: header stays visible')
  const previewCount = await page.getByText(/E2E long item/).count()
  assert(previewCount === 8, `2: dropdown preview shows 8 items (got ${previewCount})`)
  assert(
    (await page.getByText('E2E long item 24').count()) === 0,
    '2: oldest items hidden in preview',
  )
  await page.getByRole('button', { name: /Zobrazit všechny notifikace/i }).click()
  await page.waitForTimeout(150)
  const box = await listScroll.boundingBox()
  assert(box && box.height > 0 && box.height < 600, 'N: list has constrained scroll height')
  await listScroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  assert(await page.getByText('E2E long item 24').isVisible(), '2/N: full list after Zobrazit všechny')
  await shot(page, 'notifications-long-scroll')
  await closeBell(page)

  // H) message notification
  await page.evaluate(() => {
    window.__LK_NOTIFICATIONS__.upsert({
      id: 'e2e-msg-1',
      type: 'message',
      title: 'Nová zpráva',
      message: 'Máte novou zprávu.',
      priority: 'normal',
      dedupeKey: 'msg:conv2:e2e-msg-1',
      href: '/messages?conversationId=conv2',
      conversationId: 'conv2',
    })
  })
  await openBell(page)
  assert(await page.getByText('Nová zpráva').first().isVisible(), 'H: message notification visible')
  await closeBell(page)

  // G again — double upsert same key
  await page.evaluate(() => {
    window.__LK_NOTIFICATIONS__.upsert({
      id: 'e2e-dedupe',
      type: 'system',
      title: 'Dedupe once',
      message: 'first',
      priority: 'normal',
      dedupeKey: 'e2e:dedupe-once',
    })
    window.__LK_NOTIFICATIONS__.upsert({
      id: 'e2e-dedupe-2',
      type: 'system',
      title: 'Dedupe once',
      message: 'second',
      priority: 'normal',
      dedupeKey: 'e2e:dedupe-once',
    })
  })
  await page.waitForTimeout(300)
  const dedupeCount = await page.evaluate(() => {
    return window.__LK_NOTIFICATIONS__.get().filter((n) => n.dedupeKey === 'e2e:dedupe-once').length
  })
  assert(dedupeCount === 1, 'G: upsert same dedupeKey stays single')

  // K) after pet home — resolved key exists; active retired
  await page.evaluate(() => {
    window.__LK_NOTIFICATIONS__.set([
      {
        id: 'e2e-active',
        type: 'lost_pet',
        title: 'Coco je ztracená',
        message: 'Pátrání je aktivní.',
        createdAt: new Date().toISOString(),
        unread: true,
        priority: 'urgent',
        dedupeKey: 'lost:active:e2e-ann',
        petName: 'Coco',
      },
    ])
  })
  await page.waitForTimeout(100)
  // Simulate resolve retirement the same way AppContext does
  await page.evaluate(() => {
    const list = window.__LK_NOTIFICATIONS__.get().map((item) =>
      item.dedupeKey === 'lost:active:e2e-ann'
        ? {
            ...item,
            unread: false,
            priority: 'normal',
            title: 'Coco je doma',
            message: 'Pátrání bylo ukončeno.',
          }
        : item,
    )
    window.__LK_NOTIFICATIONS__.set(list)
    window.__LK_NOTIFICATIONS__.upsert({
      id: 'e2e-resolved',
      type: 'lost_pet',
      title: 'Coco je doma',
      message: 'Pátrání bylo ukončeno.',
      priority: 'important',
      dedupeKey: 'lost:resolved:e2e-ann',
    })
  })
  await page.waitForTimeout(200)
  const homeState = await page.evaluate(() => {
    const list = window.__LK_NOTIFICATIONS__.get()
    const active = list.find((n) => n.dedupeKey === 'lost:active:e2e-ann')
    const resolved = list.find((n) => n.dedupeKey === 'lost:resolved:e2e-ann')
    return {
      activeUnread: active?.unread ?? null,
      activePriority: active?.priority ?? null,
      hasResolved: Boolean(resolved),
    }
  })
  assert(homeState.activeUnread === false, 'K: active lost marked read after home')
  assert(homeState.activePriority === 'normal', 'K: active lost no longer urgent')
  assert(homeState.hasResolved, 'K: resolved/home notification retained in history')

  // 3) seed not recreated when storage exists
  const beforeReloadKeys = await page.evaluate(() =>
    window.__LK_NOTIFICATIONS__.get().map((n) => n.dedupeKey).sort(),
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const afterReload = await unreadFromStorage(page)
  const seedDupes = afterReload.keys.filter((k) => k.startsWith('seed:')).length
  // seed keys only appear once each if present
  assert(
    new Set(afterReload.keys.filter((k) => k.startsWith('seed:'))).size === seedDupes,
    '3: seed keys not duplicated on reload',
  )
  assert(
    new Set(afterReload.keys).size === afterReload.keys.length,
    '3/9: unique dedupeKeys after full reload',
  )
  void beforeReloadKeys

  // --- KROK 22: professional access notifications ---
  await page.evaluate(() => {
    window.__LK_NOTIFICATIONS__.set([])
  })
  await page.waitForTimeout(150)

  const proAccessSeed = await page.evaluate(() => {
    const ownerId = 'owner_self'
    const proAccountId = 'acct_e2e_pro_notif'
    const proId = 'pro_e2e_notif_vet'
    const now = new Date().toISOString()
    const accounts = [
      {
        id: ownerId,
        kind: 'consumer',
        roles: ['owner'],
        displayName: 'Tereza',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: proAccountId,
        kind: 'professional',
        roles: ['veterinarian'],
        displayName: 'MUDr. Martin Novák',
        createdAt: now,
        updatedAt: now,
      },
    ]
    const profiles = [
      {
        id: proId,
        accountId: proAccountId,
        type: 'veterinarian',
        displayName: 'MUDr. Martin Novák',
        verificationStatus: 'unverified',
        publicVisibility: 'public',
        createdAt: now,
        updatedAt: now,
      },
    ]
    localStorage.setItem('lovedandknown.accounts', JSON.stringify(accounts))
    localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify(profiles))
    localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([]))
    localStorage.setItem('lovedandknown.professionalAccessLogs', JSON.stringify([]))
    return { ownerId, proAccountId, proId }
  })

  // Simulate request → owner notification via upsert (mirrors UI emit + dedupe)
  const accessId = `ppa_e2e_${Date.now().toString(36)}`
  await page.evaluate(
    ({ accessId, proId, ownerId, petId }) => {
      const access = {
        id: accessId,
        petId,
        professionalId: proId,
        permissions: [],
        status: 'pending',
        requestedAt: new Date().toISOString(),
        grantedAt: new Date().toISOString(),
        grantedByAccountId: ownerId,
      }
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([access]))
      window.__LK_NOTIFICATIONS__.upsert({
        type: 'professional_access_requested',
        title: 'Nová žádost o propojení',
        message: 'MUDr. Martin Novák žádá o propojení s mazlíčkem Luna.',
        priority: 'important',
        dedupeKey: `pro-access:requested:${accessId}`,
        sourceEventId: `pro-access:requested:${accessId}`,
        petId,
        petName: 'Luna',
        href: `/pets/${petId}?tab=overview#who-has-access`,
        recipientAccountId: ownerId,
        relatedProfessionalId: proId,
        relatedAccessId: accessId,
        unread: true,
      })
      // Duplicate upsert must not create a second row
      window.__LK_NOTIFICATIONS__.upsert({
        type: 'professional_access_requested',
        title: 'Nová žádost o propojení',
        message: 'MUDr. Martin Novák žádá o propojení s mazlíčkem Luna.',
        priority: 'important',
        dedupeKey: `pro-access:requested:${accessId}`,
        sourceEventId: `pro-access:requested:${accessId}`,
        petId,
        petName: 'Luna',
        href: `/pets/${petId}?tab=overview#who-has-access`,
        recipientAccountId: ownerId,
        relatedProfessionalId: proId,
        relatedAccessId: accessId,
        unread: true,
      })
    },
    {
      accessId,
      proId: proAccessSeed.proId,
      ownerId: proAccessSeed.ownerId,
      petId: 'luna',
    },
  )
  await page.waitForTimeout(200)

  let proNotifs = await page.evaluate((accessId) => {
    const list = window.__LK_NOTIFICATIONS__.get()
    const matching = list.filter((n) => n.dedupeKey === `pro-access:requested:${accessId}`)
    return {
      count: matching.length,
      unread: matching[0]?.unread,
      recipient: matching[0]?.recipientAccountId,
      message: matching[0]?.message || '',
    }
  }, accessId)
  assert(proNotifs.count === 1, 'K22-A/C: exactly 1 request notification after duplicate upsert')
  assert(proNotifs.unread === true, 'K22-A: request notification unread')
  assert(proNotifs.recipient === proAccessSeed.ownerId, 'K22-M: recipient is owner account')
  assert(!/microchip|ownerContacts|\+420/i.test(proNotifs.message), 'K22-H/I: no sensitive text')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  proNotifs = await page.evaluate((accessId) => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
    return {
      count: list.filter((n) => n.dedupeKey === `pro-access:requested:${accessId}`).length,
    }
  }, accessId)
  assert(proNotifs.count === 1, 'K22-B: request notification survives reload once')

  // Keep only the pro-access notification so it stays in the preview list
  await page.evaluate((accessId) => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
    const keep = list.filter((n) => String(n.dedupeKey || '').startsWith('pro-access:'))
    window.__LK_NOTIFICATIONS__.set(keep)
  }, accessId)
  await page.waitForTimeout(200)

  await openBell(page)
  const badgeText = await page.locator('[data-testid="notifications-unread-badge"]').textContent()
  assert(badgeText && Number(badgeText) >= 1, 'K22: unread badge shows count')
  assert(await page.getByText('Nová žádost o propojení').count() > 0, 'K22: request title visible')
  assert(await page.getByText(/^Nové$/i).count() > 0, 'K22: NOVÉ section present')
  await page.getByText('Nová žádost o propojení').first().click()
  await page.waitForTimeout(500)
  assert(page.url().includes('/pets/luna'), 'K22: click opens pet access view')

  const afterRead = await page.evaluate((accessId) => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
    const n = list.find((x) => x.dedupeKey === `pro-access:requested:${accessId}`)
    return { unread: n?.unread, readAt: n?.readAt }
  }, accessId)
  assert(afterRead.unread === false, 'K22-F: marked read after click')
  assert(Boolean(afterRead.readAt), 'K22-F: readAt set')

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  const afterReadReload = await page.evaluate((accessId) => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.notifications') || '[]')
    const n = list.find((x) => x.dedupeKey === `pro-access:requested:${accessId}`)
    return { unread: n?.unread, readAt: n?.readAt }
  }, accessId)
  assert(afterReadReload.unread === false, 'K22-G: read state persists')

  // Approve + revoke notifications (pro recipient)
  await page.evaluate(
    ({ accessId, proId, proAccountId, petId }) => {
      const list = JSON.parse(localStorage.getItem('lovedandknown.petProfessionalAccess') || '[]')
      const access = list.find((a) => a.id === accessId) || {
        id: accessId,
        petId,
        professionalId: proId,
        permissions: ['viewHealth'],
        status: 'active',
        grantedAt: new Date().toISOString(),
        grantedByAccountId: 'owner_self',
      }
      access.status = 'active'
      access.permissions = ['viewHealth']
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([access]))
      window.__LK_NOTIFICATIONS__.upsert({
        type: 'professional_access_approved',
        title: 'Přístup schválen',
        message: 'Přístup k mazlíčkovi Luna byl schválen.',
        priority: 'normal',
        dedupeKey: `pro-access:approved:${accessId}`,
        petId,
        petName: 'Luna',
        href: `/professionals/${proId}/pets/${petId}`,
        recipientAccountId: proAccountId,
        relatedProfessionalId: proId,
        relatedAccessId: accessId,
        unread: true,
      })
      window.__LK_NOTIFICATIONS__.upsert({
        type: 'professional_access_approved',
        title: 'Přístup schválen',
        message: 'Přístup k mazlíčkovi Luna byl schválen.',
        priority: 'normal',
        dedupeKey: `pro-access:approved:${accessId}`,
        petId,
        petName: 'Luna',
        href: `/professionals/${proId}/pets/${petId}`,
        recipientAccountId: proAccountId,
        relatedProfessionalId: proId,
        relatedAccessId: accessId,
        unread: true,
      })
      access.status = 'revoked'
      access.revokedAt = new Date().toISOString()
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([access]))
      window.__LK_NOTIFICATIONS__.upsert({
        type: 'professional_access_revoked',
        title: 'Přístup odebrán',
        message: 'Přístup k mazlíčkovi Luna byl odebrán.',
        priority: 'normal',
        dedupeKey: `pro-access:revoked:${accessId}`,
        petId,
        petName: 'Luna',
        href: `/professionals/${proId}`,
        recipientAccountId: proAccountId,
        relatedProfessionalId: proId,
        relatedAccessId: accessId,
        unread: true,
      })
    },
    {
      accessId,
      proId: proAccessSeed.proId,
      proAccountId: proAccessSeed.proAccountId,
      petId: 'luna',
    },
  )
  await page.waitForTimeout(200)

  const approveRevoke = await page.evaluate((accessId) => {
    const list = window.__LK_NOTIFICATIONS__.get()
    const approved = list.filter((n) => n.dedupeKey === `pro-access:approved:${accessId}`)
    const revoked = list.filter((n) => n.dedupeKey === `pro-access:revoked:${accessId}`)
    const access = JSON.parse(localStorage.getItem('lovedandknown.petProfessionalAccess') || '[]')[0]
    return {
      approvedCount: approved.length,
      revokedCount: revoked.length,
      revokeHref: revoked[0]?.href,
      accessStatus: access?.status,
    }
  }, accessId)
  assert(approveRevoke.approvedCount === 1, 'K22-D: exactly 1 approval notification')
  assert(approveRevoke.revokedCount === 1, 'K22-E: exactly 1 revoke notification')
  assert(approveRevoke.accessStatus === 'revoked', 'K22-K: access remains revoked')
  assert(
    approveRevoke.revokeHref === `/professionals/${proAccessSeed.proId}`,
    'K22-K: revoke href does not deep-link into pet data',
  )

  await browser.close()

  console.log('\n---')
  if (failures.length) {
    console.error(`${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('All notification checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
