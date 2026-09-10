/**
 * Assert professional dashboard (KROK 23).
 * Run: npx tsx scripts/assert-professional-dashboard.mts
 *
 * A – consumer/owner bez pro role → dashboard gated
 * B – professional bez access → žádná health data
 * C – pending access → žádná pet health data
 * D – revoked → denied
 * E – expired → denied
 * F – active + viewHealth=false → health hidden
 * G – active + viewHealth=true → health visible
 * H – active + addHealthRecord=false → write denied
 * I – veterinarian role bez access → health denied
 * J – verification ≠ access
 * K – suggested permissions ≠ auto-grant / entitlement ≠ access
 * L – microchip never in projection
 * M – ownerContacts never in projection
 * N – stats derived from real access/notifications
 * O – quick actions require WRITE ∩ suggested
 * P – workspace switch does not change access
 * Q – reload persistence of access
 */
import assert from 'node:assert/strict'
import {
  assertProfessionalViewSafe,
  canAccessProfessionalDashboard,
  canProfessionalAddHealthRecord,
  canProfessionalViewHealth,
  canSwitchWorkspace,
  computeProfessionalDashboardStats,
  grantPetAccess,
  isAccessEffective,
  listAvailableQuickActions,
  loadPetProfessionalAccess,
  projectPetForProfessional,
  requestProfessionalAccess,
  revokeAccess,
  roleGrantsPetDataAccess,
  savePetProfessionalAccess,
  saveProfessionalAccessLogs,
  suggestedPermissionsForRole,
  type PetProfessionalAccess,
  type ProfessionalAccessLog,
  type ProfessionalProfile,
} from '../src/lib/professional/index.ts'
import {
  getUiWorkspace,
  normalizeUiWorkspace,
  setUiWorkspace,
  UI_WORKSPACE_STORAGE_KEY,
} from '../src/lib/account/workspace.ts'
import { hasProfessionalVerifiedBadge } from '../src/lib/professional/public.ts'
import { saveAccounts, saveProfessionalProfiles } from '../src/lib/professional/storage.ts'
import { saveNotifications } from '../src/lib/notifications/index.ts'
import type { AppNotification, Pet } from '../src/types/index.ts'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: memory,
    configurable: true,
  })
  return memory
}

const memory = installMemoryStorage()

let passed = 0
let failed = 0

function check(label: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK  ${label}`)
    passed += 1
  } catch (e) {
    console.error(`  FAIL ${label}`)
    console.error(e)
    failed += 1
  }
}

const basePet = {
  id: 'luna',
  name: 'Luna',
  type: 'Pes',
  breed: 'Zlatý retriever',
  microchip: 'SECRETCHIP',
  ownerContacts: { phone: '123', email: 'x@y.z' },
} as unknown as Pet

const pro: ProfessionalProfile = {
  id: 'pro_dash_vet',
  accountId: 'owner_self',
  type: 'veterinarian',
  displayName: 'MUDr. Dash Vet',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function seedAccount(roles: string[], kind: 'consumer' | 'professional' = 'consumer') {
  saveAccounts([
    {
      id: 'owner_self',
      kind,
      roles: roles as never[],
      displayName: 'Dash User',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([{ ...pro, accountId: 'owner_self' }])
}

function clearAccess() {
  savePetProfessionalAccess([])
  saveProfessionalAccessLogs([])
}

console.log('KROK 23 — assert-professional-dashboard')

check('A – owner bez pro role → canAccess false', () => {
  seedAccount(['owner'], 'consumer')
  assert.equal(canAccessProfessionalDashboard(), false)
})

check('A2 – veterinarian role → canAccess true', () => {
  seedAccount(['owner', 'veterinarian'], 'consumer')
  assert.equal(canAccessProfessionalDashboard(), true)
})

check('I – veterinarian role bez access → health denied', () => {
  clearAccess()
  seedAccount(['veterinarian'], 'professional')
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
  const { view } = projectPetForProfessional(basePet, { access: null })
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.name, undefined)
  assertProfessionalViewSafe(view)
})

check('B – professional bez access → žádná health', () => {
  clearAccess()
  const { view } = projectPetForProfessional(basePet, {
    access: undefined,
    healthRecords: [
      { id: 'h1', petId: 'luna', type: 'vet', title: 'X', date: '2026-01-01' } as never,
    ],
  })
  assert.equal(view.healthRecords, undefined)
})

check('C – pending → žádná health', () => {
  clearAccess()
  let list: PetProfessionalAccess[] = []
  let logs: ProfessionalAccessLog[] = []
  const req = requestProfessionalAccess(list, logs, {
    petId: 'luna',
    professionalId: pro.id,
    grantedByAccountId: 'owner_self',
  })
  list = req.accessList
  const access = req.access
  assert.equal(access.status, 'pending')
  assert.equal(isAccessEffective(access), false)
  const { view } = projectPetForProfessional(basePet, { access })
  assert.equal(view.healthRecords, undefined)
  assert.equal(canProfessionalViewHealth(access), false)
  void list
})

check('D – revoked → denied', () => {
  clearAccess()
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  const revoked = revokeAccess(granted.accessList, granted.logs, granted.access.id)
  assert.equal(isAccessEffective(revoked.access), false)
  const { view } = projectPetForProfessional(basePet, { access: revoked.access })
  assert.equal(view.healthRecords, undefined)
})

check('E – expired → denied', () => {
  const past = new Date(Date.now() - 60_000).toISOString()
  const access: PetProfessionalAccess = {
    id: 'ppa_exp',
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth'],
    status: 'active',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedByAccountId: 'owner_self',
    expiresAt: past,
  }
  assert.equal(isAccessEffective(access), false)
  const { view } = projectPetForProfessional(basePet, { access })
  assert.equal(view.healthRecords, undefined)
})

check('F – active + viewHealth=false → health hidden', () => {
  const access: PetProfessionalAccess = {
    id: 'ppa_f',
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['addNote'],
    status: 'active',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedByAccountId: 'owner_self',
  }
  assert.equal(canProfessionalViewHealth(access), false)
  const { view } = projectPetForProfessional(basePet, {
    access,
    healthRecords: [
      { id: 'h1', petId: 'luna', type: 'vet', title: 'X', date: '2026-01-01' } as never,
    ],
  })
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.name, 'Luna')
})

check('G – active + viewHealth=true → health visible', () => {
  const access: PetProfessionalAccess = {
    id: 'ppa_g',
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth'],
    status: 'active',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedByAccountId: 'owner_self',
  }
  const { view } = projectPetForProfessional(basePet, {
    access,
    healthRecords: [
      { id: 'h1', petId: 'luna', type: 'vet', title: 'X', date: '2026-01-01' } as never,
    ],
  })
  assert.ok(view.healthRecords)
  assert.equal(view.healthRecords!.length, 1)
  assertProfessionalViewSafe(view)
})

check('H – write denied without addHealthRecord', () => {
  const access: PetProfessionalAccess = {
    id: 'ppa_h',
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth'],
    status: 'active',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedByAccountId: 'owner_self',
  }
  assert.equal(canProfessionalAddHealthRecord(access), false)
})

check('J – verification ≠ access', () => {
  const verifiedPro: ProfessionalProfile = {
    ...pro,
    verificationStatus: 'verified',
  }
  assert.equal(hasProfessionalVerifiedBadge(verifiedPro, []), false)
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
})

check('K – suggested permissions ≠ auto-grant', () => {
  const suggested = suggestedPermissionsForRole('veterinarian')
  assert.ok(suggested.includes('viewHealth'))
  assert.ok(suggested.includes('addVisit'))
  clearAccess()
  savePetProfessionalAccess([])
  const actions = listAvailableQuickActions({ ...pro, accountId: 'owner_self' })
  assert.equal(actions.length, 0)
})

check('L/M – microchip + ownerContacts never in projection', () => {
  const access: PetProfessionalAccess = {
    id: 'ppa_lm',
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth', 'viewDocuments'],
    status: 'active',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedByAccountId: 'owner_self',
  }
  const { view } = projectPetForProfessional(basePet, {
    access,
    ownerContacts: { phone: '999' },
  })
  assertProfessionalViewSafe(view)
  assert.equal('microchip' in view, false)
  assert.equal('ownerContacts' in view, false)
})

check('N – stats from real state', () => {
  clearAccess()
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  savePetProfessionalAccess(granted.accessList)
  const pending = requestProfessionalAccess(granted.accessList, granted.logs, {
    petId: 'milo',
    professionalId: pro.id,
    grantedByAccountId: 'owner_self',
  })
  savePetProfessionalAccess(pending.accessList)

  const notifications: AppNotification[] = [
    {
      id: 'n1',
      type: 'professional_access_requested',
      title: 'X',
      message: 'Y',
      createdAt: '2026-09-01T10:00:00.000Z',
      unread: true,
      recipientAccountId: 'owner_self',
    },
  ]
  saveNotifications(notifications)

  const stats = computeProfessionalDashboardStats({
    professionalId: pro.id,
    notifications,
    calendarEvents: [],
    accountId: 'owner_self',
  })
  assert.equal(stats.activeConnections, 1)
  assert.equal(stats.pendingRequests, 1)
  assert.equal(stats.unreadNotifications, 1)
  assert.equal(stats.todaysEvents, 0)
})

check('O – quick actions need WRITE on active access', () => {
  clearAccess()
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth', 'addVisit'],
    grantedByAccountId: 'owner_self',
  })
  savePetProfessionalAccess(granted.accessList)
  const actions = listAvailableQuickActions({ ...pro, accountId: 'owner_self' })
  assert.ok(actions.some((a) => a.permission === 'addVisit'))
  assert.equal(
    actions.some((a) => a.permission === 'addHealthRecord'),
    false,
  )
})

check('P – workspace switch is UI-only', () => {
  seedAccount(['owner', 'veterinarian'], 'consumer')
  assert.equal(canSwitchWorkspace(), true)
  setUiWorkspace('professional')
  assert.equal(getUiWorkspace(), 'professional')
  assert.equal(normalizeUiWorkspace('professional'), 'professional')
  assert.equal(normalizeUiWorkspace('nope'), 'consumer')
  const before = loadPetProfessionalAccess().length
  setUiWorkspace('consumer')
  assert.equal(getUiWorkspace(), 'consumer')
  assert.equal(loadPetProfessionalAccess().length, before)
  assert.ok(memory.getItem(UI_WORKSPACE_STORAGE_KEY) === 'consumer')
})

check('Q – reload persistence of access', () => {
  clearAccess()
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: pro.id,
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  savePetProfessionalAccess(granted.accessList)
  const reloaded = loadPetProfessionalAccess()
  assert.equal(reloaded.length, 1)
  assert.equal(reloaded[0].status, 'active')
})

console.log(`\nPassed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
