/**
 * E2E: Pet household access (KROK 37)
 * Run: node scripts/e2e-pet-household-access.mjs
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
    path: path.join(OUT, `hh-access-${name}.png`),
    fullPage: false,
  })
}

const PET_ID = 'luna'
const PRO_ID = 'e2e_hh_vet'

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

const SEED_PROFILES = [
  {
    id: PRO_ID,
    accountId: 'owner_self',
    type: 'veterinarian',
    displayName: 'MUDr. HH Vet',
    organizationName: 'HH Clinic',
    city: 'Praha',
    services: ['chirurgie'],
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

async function seed(page) {
  await page.evaluate(
    ({ accounts, profiles }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify(accounts))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify(profiles))
      localStorage.setItem('lovedandknown.petHouseholdAccess', JSON.stringify([]))
      localStorage.setItem('lovedandknown.petHouseholdAccessLogs', JSON.stringify([]))
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalAccessLogs', JSON.stringify([]))
    },
    { accounts: SEED_ACCOUNTS, profiles: SEED_PROFILES },
  )
}

async function grantViaUi(page, { accountId, role }) {
  await page.getByTestId(`household-add-${PET_ID}`).click()
  await page.getByTestId('household-grant-modal').waitFor({ state: 'visible' })
  await page.getByTestId('household-grant-account').selectOption(accountId)
  await page.getByTestId(`household-grant-role-${role}`).check()
  await page.getByTestId('household-grant-save').click()
  await page.getByTestId('household-grant-modal').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
}

async function main() {
  console.log('Starting Household Access E2E against', BASE)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seed(page)
  await page.goto(`${BASE}/pets/${PET_ID}?tab=overview`, { waitUntil: 'networkidle' })
  await page.locator(`#who-has-access`).scrollIntoViewIfNeeded()
  await shot(page, '01-who-has-access')

  assert(
    await page.getByTestId(`household-access-${PET_ID}`).isVisible(),
    'Household section visible',
  )
  assert(
    await page.getByTestId(`household-owner-${PET_ID}`).isVisible(),
    'Owner row visible',
  )
  assert(
    await page.getByTestId(`professional-access-${PET_ID}`).isVisible(),
    'Professional section visible',
  )

  // ── Co-owner ──
  await grantViaUi(page, { accountId: 'acct_petr', role: 'co_owner' })
  await shot(page, '02-co-owner-granted')

  const coOwnerCard = page.locator('[data-testid^="household-card-"]').filter({ hasText: 'Petr' })
  assert(await coOwnerCard.isVisible(), 'Co-owner Petr appears in list')
  assert(await coOwnerCard.getByText('Spolumajitel').isVisible(), 'Co-owner role label')

  const coOwnerChecks = await page.evaluate(async () => {
    const mod = await import('/src/lib/household/index.ts')
    const list = mod.loadPetHouseholdAccess()
    const access = list.find((a) => a.accountId === 'acct_petr' && a.status === 'active')
    if (!access) return { ok: false, reason: 'no access' }
    const pet = {
      id: 'luna',
      name: 'Luna',
      type: 'dog',
      breed: 'Zlatý retriever',
      image: '',
      ownerAccountId: 'owner_self',
      microchip: '985112000000001',
    }
    const healthRecords = [
      {
        id: 'hr1',
        petId: 'luna',
        type: 'vaccination',
        title: 'Očkování',
        subtitle: 'Vzteklina',
        date: '1. 1. 2026',
        status: 'completed',
      },
    ]
    const view = mod.projectPetForHousehold(pet, { access, healthRecords })
    let cannotRemoveOwner = false
    try {
      mod.assertCannotRemoveOrTransferOwner(pet, 'owner_self')
    } catch {
      cannotRemoveOwner = true
    }
    return {
      ok: true,
      healthRead: mod.hasHouseholdPermission(access, 'health_read'),
      healthWrite: mod.hasHouseholdPermission(access, 'health_write'),
      viewHasHealth: Boolean(view.healthRecords?.length),
      healthWriteAllowed: view.healthWriteAllowed === true,
      cannotRemoveOwner,
      microchipLeaked: JSON.stringify(view).includes('985112'),
    }
  })
  assert(coOwnerChecks.ok, 'Co-owner access record exists')
  assert(coOwnerChecks.healthRead, 'Co-owner health read')
  assert(coOwnerChecks.healthWrite, 'Co-owner health write')
  assert(coOwnerChecks.viewHasHealth, 'Co-owner projection has health')
  assert(coOwnerChecks.healthWriteAllowed, 'Co-owner can write health')
  assert(coOwnerChecks.cannotRemoveOwner, 'Co-owner cannot remove owner')
  assert(!coOwnerChecks.microchipLeaked, 'Co-owner projection no microchip leak')

  // ── Caregiver ──
  await grantViaUi(page, { accountId: 'acct_anna', role: 'caregiver' })
  await shot(page, '03-caregiver-granted')
  const caregiverCard = page.locator('[data-testid^="household-card-"]').filter({ hasText: 'Anna' })
  assert(await caregiverCard.isVisible(), 'Caregiver Anna appears in list')

  const caregiverChecks = await page.evaluate(async () => {
    const mod = await import('/src/lib/household/index.ts')
    const access = mod.loadPetHouseholdAccess().find((a) => a.accountId === 'acct_anna')
    if (!access) return { ok: false }
    const pet = {
      id: 'luna',
      name: 'Luna',
      type: 'dog',
      breed: 'X',
      image: '',
      ownerAccountId: 'owner_self',
    }
    const view = mod.projectPetForHousehold(pet, {
      access,
      healthRecords: [
        {
          id: 'hr1',
          petId: 'luna',
          type: 'vaccination',
          title: 'O',
          subtitle: 'V',
          date: '1. 1. 2026',
          status: 'completed',
        },
      ],
    })
    return {
      ok: true,
      healthRead: mod.hasHouseholdPermission(access, 'health_read'),
      healthWrite: mod.hasHouseholdPermission(access, 'health_write'),
      calendarWrite: mod.hasHouseholdPermission(access, 'calendar_write'),
      householdManage: mod.hasHouseholdPermission(access, 'household_manage'),
      viewHasHealth: Boolean(view.healthRecords),
    }
  })
  assert(caregiverChecks.ok, 'Caregiver access exists')
  assert(caregiverChecks.healthRead, 'Caregiver health read')
  assert(!caregiverChecks.healthWrite, 'Caregiver no health write')
  assert(caregiverChecks.calendarWrite, 'Caregiver calendar write')
  assert(!caregiverChecks.householdManage, 'Caregiver cannot manage household')
  assert(caregiverChecks.viewHasHealth, 'Caregiver sees allowed health')

  // ── Viewer ──
  await grantViaUi(page, { accountId: 'acct_bara', role: 'viewer' })
  await shot(page, '04-viewer-granted')
  const viewerCard = page.locator('[data-testid^="household-card-"]').filter({ hasText: 'Bára' })
  assert(await viewerCard.isVisible(), 'Viewer Bára appears in list')

  const viewerChecks = await page.evaluate(async () => {
    const mod = await import('/src/lib/household/index.ts')
    const access = mod.loadPetHouseholdAccess().find((a) => a.accountId === 'acct_bara')
    if (!access) return { ok: false }
    const pet = {
      id: 'luna',
      name: 'Luna',
      type: 'dog',
      breed: 'X',
      image: '',
      ownerAccountId: 'owner_self',
      microchip: '985112000000001',
    }
    const view = mod.projectPetForHousehold(pet, {
      access,
      healthRecords: [
        {
          id: 'hr1',
          petId: 'luna',
          type: 'vaccination',
          title: 'O',
          subtitle: 'V',
          date: '1. 1. 2026',
          status: 'completed',
        },
      ],
      documents: [
        {
          id: 'd1',
          petId: 'luna',
          name: 'Pas',
          category: 'other',
          uploadedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      ownerContacts: { phone: '+420111', email: 'secret@owner.cz' },
    })
    const json = JSON.stringify(view)
    return {
      ok: true,
      hasName: Boolean(view.name),
      noHealth: view.healthRecords === undefined,
      noDocs: view.documents === undefined,
      noMicrochip: !json.includes('985112') && !json.includes('microchip'),
      noContacts: !json.includes('+420111') && !json.includes('secret@owner'),
    }
  })
  assert(viewerChecks.ok, 'Viewer access exists')
  assert(viewerChecks.hasName, 'Viewer sees basic profile')
  assert(viewerChecks.noHealth, 'Viewer no health')
  assert(viewerChecks.noDocs, 'Viewer no documents')
  assert(viewerChecks.noMicrochip, 'Viewer no microchip leak')
  assert(viewerChecks.noContacts, 'Viewer no owner contact leak')

  // ── Revoke caregiver ──
  const caregiverId = await page.evaluate(() => {
    const raw = localStorage.getItem('lovedandknown.petHouseholdAccess')
    const list = raw ? JSON.parse(raw) : []
    return list.find((a) => a.accountId === 'acct_anna' && a.status === 'active')?.id ?? null
  })
  assert(Boolean(caregiverId), 'Caregiver access id for revoke')
  if (caregiverId) {
    await page.getByTestId(`household-revoke-${caregiverId}`).click()
    await page.getByTestId('household-revoke-confirm').click()
    await page.waitForTimeout(400)
  }
  await shot(page, '05-caregiver-revoked')

  const revokedChecks = await page.evaluate(async () => {
    const mod = await import('/src/lib/household/index.ts')
    const access = mod.loadPetHouseholdAccess().find((a) => a.accountId === 'acct_anna')
    if (!access) return { ok: false }
    const pet = {
      id: 'luna',
      name: 'Luna',
      type: 'dog',
      breed: 'X',
      image: '',
      ownerAccountId: 'owner_self',
    }
    const view = mod.projectPetForHousehold(pet, {
      access,
      healthRecords: [
        {
          id: 'hr1',
          petId: 'luna',
          type: 'vaccination',
          title: 'O',
          subtitle: 'V',
          date: '1. 1. 2026',
          status: 'completed',
        },
      ],
    })
    return {
      ok: true,
      status: access.status,
      effective: mod.isHouseholdAccessEffective(access),
      noHealth: view.healthRecords === undefined,
      stillInStorage: true,
    }
  })
  assert(revokedChecks.ok, 'Revoked record exists')
  assert(revokedChecks.status === 'revoked', 'Caregiver status revoked')
  assert(!revokedChecks.effective, 'Revoked access not effective')
  assert(revokedChecks.noHealth, 'Revoked caregiver no health access')

  // ── Professional Access regression ──
  const proRegression = await page.evaluate(async ({ proId }) => {
    const pro = await import('/src/lib/professional/index.ts')
    const hh = await import('/src/lib/household/index.ts')
    const granted = pro.grantPetAccess([], [], {
      petId: 'luna',
      professionalId: proId,
      permissions: ['viewHealth'],
      grantedByAccountId: 'owner_self',
    })
    pro.savePetProfessionalAccess(granted.accessList)
    const pet = {
      id: 'luna',
      name: 'Luna',
      type: 'dog',
      breed: 'X',
      image: '',
      ownerAccountId: 'owner_self',
      microchip: '985112000000001',
    }
    const { view } = pro.projectPetForProfessional(pet, {
      access: granted.access,
      healthRecords: [
        {
          id: 'hr1',
          petId: 'luna',
          type: 'vaccination',
          title: 'O',
          subtitle: 'V',
          date: '1. 1. 2026',
          status: 'completed',
        },
      ],
    })
    const hhKey = localStorage.getItem('lovedandknown.petHouseholdAccess')
    const proKey = localStorage.getItem('lovedandknown.petProfessionalAccess')
    return {
      hasHealth: Boolean(view.healthRecords?.length),
      hhSeparate: Boolean(hhKey) && Boolean(proKey) && hhKey !== proKey,
      hhCount: hh.loadPetHouseholdAccess().length,
      proCount: pro.loadPetProfessionalAccess().length,
    }
  }, { proId: PRO_ID })

  assert(proRegression.hasHealth, 'Professional Access still projects health')
  assert(proRegression.hhSeparate, 'Household and Professional storage remain separate')
  assert(proRegression.proCount === 1, 'Professional access record stored')
  assert(proRegression.hhCount >= 2, 'Household records still present after pro grant')

  await shot(page, '06-done')
  await browser.close()

  console.log('')
  if (failures.length) {
    console.error(`Failed ${failures.length} checks`)
    process.exit(1)
  }
  console.log('All household access E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
