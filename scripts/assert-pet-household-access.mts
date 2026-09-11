/**
 * Assert pet ownership + household access (KROK 37).
 * Run: npx tsx scripts/assert-pet-household-access.mts
 *
 * 1–35 scenarios from KROK 37 plan.
 */
import assert from 'node:assert/strict'
import {
  assertCannotRemoveOrTransferOwner,
  assertHouseholdViewSafe,
  assertPetOwner,
  ensurePetOwnerAccountId,
  findOpenHouseholdAccess,
  grantHouseholdAccess,
  hasHouseholdPermission,
  isHouseholdAccessEffective,
  isPetOwner,
  loadPetHouseholdAccess,
  normalizePetHouseholdAccess,
  PET_HOUSEHOLD_ACCESS_STORAGE_KEY,
  projectPetForHousehold,
  resolvePetOwnerAccountId,
  revokeHouseholdAccess,
  savePetHouseholdAccess,
  suggestedHouseholdPermissionsForRole,
  transferPetOwnership,
  updateHouseholdAccess,
  type PetHouseholdAccess,
} from '../src/lib/household/index.ts'
import {
  grantPetAccess as grantProAccess,
  loadPetProfessionalAccess as loadProAccess,
  projectPetForProfessional as projectPro,
  savePetProfessionalAccess as saveProAccess,
} from '../src/lib/professional/index.ts'
import {
  buildHouseholdAccessNotification,
  isSafeHouseholdAccessNotificationPayload,
} from '../src/lib/notifications/fromHouseholdAccess.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { loadBookings } from '../src/lib/booking/storage.ts'
import { loadPayments } from '../src/lib/payments/storage.ts'
import type { Pet } from '../src/types/index.ts'
import type { Account } from '../src/types/professional.ts'

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

const ownerAccount: Account = {
  id: SELF_OWNER_ID,
  kind: 'consumer',
  roles: ['owner'],
  displayName: 'Tereza',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const petr: Account = {
  id: 'acct_petr',
  kind: 'consumer',
  roles: ['owner'],
  displayName: 'Petr',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const anna: Account = {
  id: 'acct_anna',
  kind: 'consumer',
  roles: ['owner'],
  displayName: 'Anna',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const bara: Account = {
  id: 'acct_bara',
  kind: 'consumer',
  roles: ['owner'],
  displayName: 'Bára',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const accounts = [ownerAccount, petr, anna, bara]

const pet: Pet = ensurePetOwnerAccountId({
  id: 'luna',
  name: 'Luna',
  type: 'dog',
  breed: 'Zlatý retriever',
  age: 3,
  image: '',
  microchip: '985112000000001',
  ownerAccountId: SELF_OWNER_ID,
  emergencyCard: {
    visibility: {},
    health: { allergies: 'pollen' },
  },
} as Pet)

const legacyPet = {
  id: 'milo',
  name: 'Milo',
  type: 'dog' as const,
  breed: 'Mix',
  image: '',
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

const documents = [
  {
    id: 'doc1',
    petId: 'luna',
    name: 'Pas',
    category: 'other' as const,
    uploadedAt: '2026-01-01T00:00:00.000Z',
  },
]

console.log('KROK 37 – assert-pet-household-access')

check('1. Pet ownership resolves correctly', () => {
  assert.equal(resolvePetOwnerAccountId(pet), SELF_OWNER_ID)
  assert.equal(resolvePetOwnerAccountId(legacyPet), SELF_OWNER_ID)
  const migrated = ensurePetOwnerAccountId(legacyPet)
  assert.equal(migrated.ownerAccountId, SELF_OWNER_ID)
})

check('2. assertPetOwner accepts real owner', () => {
  const result = assertPetOwner(pet, SELF_OWNER_ID)
  assert.equal(result.id, 'luna')
  assert.equal(isPetOwner(pet, SELF_OWNER_ID), true)
})

check('3. assertPetOwner rejects non-owner', () => {
  assert.throws(() => assertPetOwner(pet, 'acct_petr'))
  assert.throws(() => assertPetOwner('luna', 'acct_petr', [pet]))
})

check('4. owner can grant access', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(access.status, 'active')
  assert.equal(access.accountId, petr.id)
  assert.equal(access.role, 'co_owner')
})

check('5. non-owner cannot grant access', () => {
  assert.throws(() =>
    grantHouseholdAccess([], [], {
      pet,
      accountId: anna.id,
      role: 'caregiver',
      grantedByAccountId: petr.id,
      accounts,
    }),
  )
})

check('6. owner cannot grant access to self', () => {
  assert.throws(() =>
    grantHouseholdAccess([], [], {
      pet,
      accountId: SELF_OWNER_ID,
      role: 'co_owner',
      grantedByAccountId: SELF_OWNER_ID,
      accounts,
    }),
  )
})

check('7. duplicate active access rejected', () => {
  const first = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.throws(() =>
    grantHouseholdAccess(first.accessList, first.logs, {
      pet,
      accountId: petr.id,
      role: 'viewer',
      grantedByAccountId: SELF_OWNER_ID,
      accounts,
    }),
  )
  assert.ok(findOpenHouseholdAccess(first.accessList, 'luna', petr.id))
})

check('8. co-owner created correctly', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(access.role, 'co_owner')
  const suggested = suggestedHouseholdPermissionsForRole('co_owner')
  for (const p of suggested) assert.ok(access.permissions.includes(p))
  assert.equal(access.permissions.includes('household_manage'), false)
})

check('9. caregiver created correctly', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(access.role, 'caregiver')
  assert.ok(access.permissions.includes('health_read'))
  assert.equal(access.permissions.includes('health_write'), false)
})

check('10. viewer created correctly', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: bara.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(access.role, 'viewer')
  assert.ok(access.permissions.includes('pet_profile_read'))
  assert.equal(access.permissions.includes('health_read'), false)
})

check('11. co-owner gets full health read', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'health_read'), true)
  const view = projectPetForHousehold(pet, { access, healthRecords })
  assert.ok(view.healthRecords)
  assert.equal(view.healthRecords!.length, 1)
})

check('12. co-owner gets health write', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'health_write'), true)
  const view = projectPetForHousehold(pet, { access, healthRecords })
  assert.equal(view.healthWriteAllowed, true)
})

check('13. co-owner gets documents access', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'documents_read'), true)
  assert.equal(hasHouseholdPermission(access, 'documents_write'), true)
  const view = projectPetForHousehold(pet, { access, documents })
  assert.ok(view.documents)
})

check('14. caregiver cannot write health by default', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'health_write'), false)
  const view = projectPetForHousehold(pet, { access, healthRecords })
  assert.equal(view.healthWriteAllowed, false)
  assert.ok(view.healthRecords)
})

check('15. caregiver gets allowed calendar access', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'calendar_read'), true)
  assert.equal(hasHouseholdPermission(access, 'calendar_write'), true)
})

check('16. viewer cannot access health', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: bara.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'health_read'), false)
  const view = projectPetForHousehold(pet, { access, healthRecords })
  assert.equal(view.healthRecords, undefined)
})

check('17. viewer cannot access documents', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: bara.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'documents_read'), false)
  const view = projectPetForHousehold(pet, { access, documents })
  assert.equal(view.documents, undefined)
})

check('18. viewer cannot manage household', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: bara.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hasHouseholdPermission(access, 'household_manage'), false)
})

check('19. permissions can be changed', () => {
  const granted = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const updated = updateHouseholdAccess(granted.accessList, granted.logs, granted.access.id, {
    pet,
    actorAccountId: SELF_OWNER_ID,
    permissions: [...granted.access.permissions, 'health_write'],
  })
  assert.ok(updated.access?.permissions.includes('health_write'))
})

check('20. revoke blocks access', () => {
  const granted = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const revoked = revokeHouseholdAccess(granted.accessList, granted.logs, granted.access.id, {
    pet,
    actorAccountId: SELF_OWNER_ID,
  })
  assert.equal(revoked.access?.status, 'revoked')
  assert.equal(isHouseholdAccessEffective(revoked.access), false)
  const view = projectPetForHousehold(pet, {
    access: revoked.access,
    healthRecords,
  })
  assert.equal(view.healthRecords, undefined)
  assert.deepEqual(Object.keys(view), ['petId'])
})

check('21. revoked record remains in history', () => {
  const granted = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const revoked = revokeHouseholdAccess(granted.accessList, granted.logs, granted.access.id, {
    pet,
    actorAccountId: SELF_OWNER_ID,
  })
  assert.equal(revoked.accessList.length, 1)
  assert.equal(revoked.accessList[0]!.status, 'revoked')
  assert.ok(revoked.accessList[0]!.revokedAt)
  assert.ok(revoked.logs.some((l) => l.action === 'access_revoked'))
})

check('22. co-owner cannot remove original owner', () => {
  assert.throws(() => assertCannotRemoveOrTransferOwner(pet, SELF_OWNER_ID))
  // revoke targeting owner account id is blocked conceptually
  const fakeOwnerAccess: PetHouseholdAccess = {
    id: 'pha_bad',
    petId: 'luna',
    accountId: SELF_OWNER_ID,
    role: 'co_owner',
    permissions: suggestedHouseholdPermissionsForRole('co_owner'),
    status: 'active',
    grantedByAccountId: SELF_OWNER_ID,
    grantedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.throws(() =>
    revokeHouseholdAccess([fakeOwnerAccess], [], fakeOwnerAccess.id, {
      pet,
      actorAccountId: SELF_OWNER_ID,
    }),
  )
})

check('23. co-owner cannot transfer ownership', () => {
  assert.throws(() => transferPetOwnership(pet, petr.id))
})

check('24. household access does not create professional access', () => {
  memory.clear()
  saveProAccess([])
  grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  // persist household only via save
  savePetHouseholdAccess([])
  assert.equal(loadProAccess().length, 0)
  assert.equal(loadProAccess().length, 0)
})

check('25. professional access remains functional', () => {
  memory.clear()
  const pro = grantProAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
  })
  saveProAccess(pro.accessList)
  const { view } = projectPro(pet, {
    access: pro.access,
    healthRecords,
  })
  assert.ok(view.healthRecords)
  // Household grant in parallel
  const hh = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(hh.access.role, 'viewer')
  assert.equal(loadProAccess().length, 1)
})

check('26. household access does not create membership', () => {
  memory.clear()
  grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  // Grant is pure — must not write membership/entitlement keys
  assert.equal(memory.getItem('lovedandknown.membership'), null)
  assert.equal(memory.getItem('lovedandknown.entitlements'), null)
  assert.equal(memory.getItem('lovedandknown.subscriptions'), null)
})

check('27. household access does not create booking', () => {
  memory.clear()
  grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(loadBookings().length, 0)
})

check('28. household access does not create payment', () => {
  memory.clear()
  grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(loadPayments().length, 0)
})

check('29. privacy projection removes denied fields', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: bara.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const view = projectPetForHousehold(pet, {
    access,
    healthRecords,
    documents,
    ownerContacts: { phone: '+420', email: 'o@x.cz' },
  })
  assert.equal(view.healthRecords, undefined)
  assert.equal(view.documents, undefined)
  assert.ok(view.name)
  assert.equal('healthRecords' in view && view.healthRecords != null, false)
})

check('30. microchip is not leaked through viewer projection', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: bara.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const view = projectPetForHousehold(pet, { access, healthRecords })
  assertHouseholdViewSafe(view)
  const json = JSON.stringify(view)
  assert.ok(!json.includes('985112'))
  assert.ok(!json.includes('microchip'))
})

check('31. owner contacts are not leaked', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const view = projectPetForHousehold(pet, {
    access,
    healthRecords,
    ownerContacts: { phone: '+420111', email: 'secret@owner.cz', address: 'Ulice 1' },
  })
  assertHouseholdViewSafe(view)
  const json = JSON.stringify(view)
  assert.ok(!json.includes('+420111'))
  assert.ok(!json.includes('secret@owner'))
  assert.ok(!json.includes('Ulice'))
})

check('32. notifications use existing AppNotification', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const draft = buildHouseholdAccessNotification({
    access,
    event: 'granted',
    petName: 'Luna',
    memberDisplayName: 'Petr',
  })
  assert.ok(draft)
  assert.equal(draft!.type, 'household_access_granted')
  assert.equal(draft!.recipientAccountId, petr.id)
  assert.ok(draft!.dedupeKey.startsWith('hh-access:'))
})

check('33. notification payload is privacy-safe', () => {
  const { access } = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'co_owner',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  const draft = buildHouseholdAccessNotification({
    access,
    event: 'granted',
    petName: 'Luna',
  })
  assert.ok(draft)
  assert.equal(isSafeHouseholdAccessNotificationPayload(draft!), true)
  assert.ok(!JSON.stringify(draft).includes('microchip'))
  assert.ok(!JSON.stringify(draft).includes('985112'))
})

check('34. Professional Access storage remains separate', () => {
  memory.clear()
  const pro = grantProAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_sep',
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
  })
  saveProAccess(pro.accessList)
  const hh = grantHouseholdAccess([], [], {
    pet,
    accountId: petr.id,
    role: 'viewer',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  savePetHouseholdAccess(hh.accessList)
  assert.ok(memory.getItem('lovedandknown.petProfessionalAccess'))
  assert.ok(memory.getItem(PET_HOUSEHOLD_ACCESS_STORAGE_KEY))
  assert.notEqual(
    memory.getItem('lovedandknown.petProfessionalAccess'),
    memory.getItem(PET_HOUSEHOLD_ACCESS_STORAGE_KEY),
  )
  assert.equal(JSON.parse(memory.getItem('lovedandknown.petProfessionalAccess')!).length, 1)
  assert.equal(JSON.parse(memory.getItem(PET_HOUSEHOLD_ACCESS_STORAGE_KEY)!).length, 1)
})

check('35. household storage remains separate + normalize', () => {
  memory.clear()
  const hh = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  savePetHouseholdAccess(hh.accessList)
  const loaded = loadPetHouseholdAccess()
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0]!.role, 'caregiver')
  const round = normalizePetHouseholdAccess(
    JSON.parse(memory.getItem(PET_HOUSEHOLD_ACCESS_STORAGE_KEY)!)[0],
  )
  assert.ok(round)
  assert.equal(round!.accountId, anna.id)
  // pro storage empty
  assert.equal(loadProAccess().length, 0)
})

check('bonus: owner projection has full access without access record', () => {
  const view = projectPetForHousehold(pet, {
    access: null,
    actorAccountId: SELF_OWNER_ID,
    healthRecords,
    documents,
  })
  assert.ok(view.healthRecords)
  assert.equal(view.householdManageAllowed, true)
  assert.equal(view.healthWriteAllowed, true)
})

check('bonus: role != permission (caregiver with explicit health_write)', () => {
  const granted = grantHouseholdAccess([], [], {
    pet,
    accountId: anna.id,
    role: 'caregiver',
    permissions: [...suggestedHouseholdPermissionsForRole('caregiver'), 'health_write'],
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  assert.equal(granted.access.role, 'caregiver')
  assert.equal(hasHouseholdPermission(granted.access, 'health_write'), true)
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
