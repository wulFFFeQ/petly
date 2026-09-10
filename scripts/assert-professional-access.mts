/**
 * Assert professional pet access UX flow (KROK 21).
 * Run: npx tsx scripts/assert-professional-access.mts
 *
 * A – profesionál bez access → žádná health data
 * B – access pending → žádná health data
 * C – access revoked → žádná health data
 * D – active + viewHealth=false → health nedostupné
 * E – viewHealth=true → health dostupné
 * F – viewHealth=true + addHealthRecord=false → čtení ano, zápis ne
 * G – addHealthRecord=true + viewHealth=false → zápis ano, health dataset ne
 * H – žádný access → projection jen petId
 * I – microchip nikdy v projection
 * J – ownerContacts nikdy v projection
 * K – revoked → staré permissions neplatí
 * L – duplicate pending/active blocked
 * + reload, request→grant→read, revoke→deny, permission update, audit, role≠access, verification≠access, DEMO≠trust
 */
import assert from 'node:assert/strict'
import {
  activateAccess,
  assertCanAddHealthRecord,
  assertProfessionalViewSafe,
  canProfessionalAddHealthRecord,
  canProfessionalViewHealth,
  findOpenAccess,
  grantPetAccess,
  hasPermission,
  isAccessEffective,
  loadPetProfessionalAccess,
  logsIncludeAction,
  normalizePetProfessionalAccess,
  projectPetForProfessional,
  requestProfessionalAccess,
  revokeAccess,
  roleGrantsPetDataAccess,
  savePetProfessionalAccess,
  saveProfessionalAccessLogs,
  updateAccessPermissions,
  type PetProfessionalAccess,
} from '../src/lib/professional/index.ts'
import { hasProfessionalVerifiedBadge } from '../src/lib/professional/public.ts'
import { isActiveTrustVerification } from '../src/lib/verification/status.ts'
import type { Verification } from '../src/lib/verification/types.ts'
import type { Pet } from '../src/types/index.ts'

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
  } catch (err) {
    failed += 1
    console.error(`  FAIL  ${label}`)
    console.error(err)
  }
}

const pet: Pet = {
  id: 'luna',
  name: 'Luna',
  type: 'Pes',
  breed: 'Zlatý retriever',
  age: 3,
  image: '',
  microchip: '985112000000001',
} as Pet

const healthRecords = [
  {
    id: 'hr1',
    petId: 'luna',
    type: 'vaccination' as const,
    title: 'Očkování',
    subtitle: 'Vzteklina',
    date: '1. 1. 2026',
    status: 'completed' as const,
  },
]

function baseAccess(overrides: Partial<PetProfessionalAccess> = {}): PetProfessionalAccess {
  return {
    id: 'ppa_1',
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: [],
    status: 'active',
    grantedAt: '2026-01-01T00:00:00.000Z',
    grantedByAccountId: 'owner_self',
    ...overrides,
  }
}

console.log('KROK 21 – assert-professional-access')

check('A – profesionál bez access → žádná health data', () => {
  const { view } = projectPetForProfessional(pet, {
    access: null,
    healthRecords,
    ownerContacts: { phone: '+420', email: 'o@x.cz' },
  })
  assert.equal(view.petId, 'luna')
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.name, undefined)
  assertProfessionalViewSafe(view)
})

check('B – access pending → žádná health data', () => {
  const access = baseAccess({ status: 'pending', permissions: ['viewHealth'] })
  assert.equal(isAccessEffective(access), false)
  const { view } = projectPetForProfessional(pet, { access, healthRecords })
  assert.equal(view.healthRecords, undefined)
  assert.equal(canProfessionalViewHealth(access), false)
})

check('C – access revoked → žádná health data', () => {
  const access = baseAccess({
    status: 'revoked',
    revokedAt: '2026-02-01T00:00:00.000Z',
    permissions: ['viewHealth', 'addVisit'],
  })
  const { view } = projectPetForProfessional(pet, { access, healthRecords })
  assert.equal(view.healthRecords, undefined)
  assert.equal(hasPermission(access, 'viewHealth'), false)
})

check('D – active + viewHealth=false → health nedostupné', () => {
  const access = baseAccess({ permissions: ['viewVaccinations'] })
  const { view } = projectPetForProfessional(pet, { access, healthRecords })
  assert.equal(view.healthRecords, undefined)
  assert.ok(view.vaccinations)
  assert.equal(view.name, 'Luna')
})

check('E – viewHealth=true → health dostupné', () => {
  const access = baseAccess({ permissions: ['viewHealth'] })
  const { view } = projectPetForProfessional(pet, { access, healthRecords })
  assert.ok(view.healthRecords)
  assert.equal(view.healthRecords!.length, 1)
})

check('F – viewHealth=true + addHealthRecord=false → čtení ano, zápis ne', () => {
  const access = baseAccess({ permissions: ['viewHealth'] })
  assert.equal(canProfessionalViewHealth(access), true)
  assert.equal(canProfessionalAddHealthRecord(access), false)
  assert.throws(() => assertCanAddHealthRecord(access))
})

check('G – addHealthRecord=true + viewHealth=false → zápis ano, dataset ne', () => {
  const access = baseAccess({ permissions: ['addHealthRecord'] })
  assert.equal(canProfessionalAddHealthRecord(access), true)
  assert.equal(canProfessionalViewHealth(access), false)
  const { view } = projectPetForProfessional(pet, { access, healthRecords })
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.name, 'Luna')
})

check('H – žádný access → nelze obejít projection', () => {
  const { view } = projectPetForProfessional(pet, {
    access: undefined,
    healthRecords,
  })
  assert.deepEqual(Object.keys(view), ['petId'])
})

check('I – microchip nikdy v projection', () => {
  const access = baseAccess({
    permissions: ['viewHealth', 'viewDocuments', 'viewVaccinations', 'viewMedications'],
  })
  const { view } = projectPetForProfessional(pet, { access, healthRecords })
  assertProfessionalViewSafe(view)
  const json = JSON.stringify(view)
  assert.ok(!json.includes('985112'))
  assert.ok(!json.includes('microchip'))
})

check('J – ownerContacts nikdy v projection', () => {
  const access = baseAccess({ permissions: ['viewHealth'] })
  const { view } = projectPetForProfessional(pet, {
    access,
    healthRecords,
    ownerContacts: { phone: '+420111', email: 'secret@owner.cz', address: 'Ulice 1' },
  })
  assertProfessionalViewSafe(view)
  const json = JSON.stringify(view)
  assert.ok(!json.includes('+420111'))
  assert.ok(!json.includes('secret@owner'))
  assert.ok(!json.includes('Ulice'))
})

check('K – revoked → staré permissions se nesmí použít', () => {
  let list: PetProfessionalAccess[] = []
  let logs: ReturnType<typeof grantPetAccess>['logs'] = []
  const granted = grantPetAccess(list, logs, {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'addVisit'],
    grantedByAccountId: 'owner_self',
  })
  list = granted.accessList
  logs = granted.logs
  assert.equal(isAccessEffective(granted.access), true)

  const revoked = revokeAccess(list, logs, granted.access.id)
  assert.equal(isAccessEffective(revoked.access), false)
  assert.equal(canProfessionalViewHealth(revoked.access), false)
  const { view } = projectPetForProfessional(pet, {
    access: revoked.access,
    healthRecords,
  })
  assert.equal(view.healthRecords, undefined)
})

check('L – duplicate request/active blocked', () => {
  const first = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  assert.throws(() =>
    grantPetAccess(first.accessList, first.logs, {
      petId: 'luna',
      professionalId: 'pro_vet_1',
      permissions: ['viewVaccinations'],
      grantedByAccountId: 'owner_self',
    }),
  )
  assert.throws(() =>
    requestProfessionalAccess(first.accessList, first.logs, {
      petId: 'luna',
      professionalId: 'pro_vet_1',
      grantedByAccountId: 'owner_self',
    }),
  )
  assert.ok(findOpenAccess(first.accessList, 'luna', 'pro_vet_1'))
})

check('request → activate → read + audit', () => {
  const req = requestProfessionalAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_2',
    grantedByAccountId: 'owner_self',
    permissions: [],
  })
  assert.equal(req.access.status, 'pending')
  assert.ok(logsIncludeAction(req.logs, 'access_requested'))
  assert.equal(isAccessEffective(req.access), false)

  const withPerms = updateAccessPermissions(
    req.accessList,
    req.logs,
    req.access.id,
    ['viewHealth'],
  )
  const activated = activateAccess(withPerms.accessList, withPerms.logs, req.access.id)
  assert.equal(activated.access?.status, 'active')
  assert.ok(logsIncludeAction(activated.logs, 'access_granted'))
  assert.equal(canProfessionalViewHealth(activated.access), true)

  const { view, logs } = projectPetForProfessional(pet, {
    access: activated.access,
    healthRecords,
    logViews: true,
    auditLogs: activated.logs,
  })
  assert.ok(view.healthRecords)
  assert.ok(logsIncludeAction(logs, 'record_viewed'))
})

check('permission update persists conceptually + reload normalize', () => {
  memory.clear()
  const granted = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_reload',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  const updated = updateAccessPermissions(
    granted.accessList,
    granted.logs,
    granted.access.id,
    ['viewHealth', 'addVisit'],
  )
  savePetProfessionalAccess(updated.accessList)
  saveProfessionalAccessLogs(updated.logs)

  const loaded = loadPetProfessionalAccess()
  assert.equal(loaded.length, 1)
  assert.ok(loaded[0]!.permissions.includes('addVisit'))
  const round = normalizePetProfessionalAccess(JSON.parse(memory.getItem('lovedandknown.petProfessionalAccess')!)[0])
  assert.ok(round)
  assert.ok(round!.permissions.includes('viewHealth'))
})

check('role != access, verification != access, DEMO != trust', () => {
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
  assert.equal(roleGrantsPetDataAccess('groomer'), false)

  const profile = {
    id: 'pro_v',
    accountId: 'a',
    type: 'veterinarian' as const,
    displayName: 'Vet',
    verificationStatus: 'verified' as const,
    publicVisibility: 'public' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const demo: Verification = {
    id: 'd1',
    subjectType: 'professional',
    subjectId: 'pro_v',
    type: 'veterinary',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(isActiveTrustVerification(demo), false)
  assert.equal(hasProfessionalVerifiedBadge(profile, [demo]), false)
  // Verified badge does not create PetProfessionalAccess
  assert.equal(canProfessionalViewHealth(null), false)
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
