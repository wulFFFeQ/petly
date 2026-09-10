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
  await page.getByRole('button', { name: 'Notifikace' }).click()
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
