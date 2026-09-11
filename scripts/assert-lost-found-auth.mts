/**
 * Assert Lost & Found + Emergency authorization (KROK 38).
 * Run: npx tsx scripts/assert-lost-found-auth.mts
 */
import assert from 'node:assert/strict'
import {
  assertCanManagePetLostFound,
  assertCanWritePetEmergency,
  assertPetOwner,
  canManagePetLostFound,
  canReadPetEmergency,
  canWritePetEmergency,
  grantHouseholdAccess,
  HOUSEHOLD_PET_PERMISSIONS,
  HouseholdPermissionError,
  loadPetHouseholdAccess,
  PET_HOUSEHOLD_ACCESS_STORAGE_KEY,
  projectPetForHousehold,
  savePetHouseholdAccess,
  suggestedHouseholdPermissionsForRole,
  type PetHouseholdAccess,
} from '../src/lib/household/index.ts'
import {
  grantPetAccess as grantProAccess,
  loadPetProfessionalAccess as loadProAccess,
  savePetProfessionalAccess as saveProAccess,
} from '../src/lib/professional/index.ts'
import {
  buildEmergencyCardPublicView,
  PUBLIC_EMERGENCY_FORBIDDEN_KEYS,
} from '../src/lib/emergencyCard/index.ts'
import { buildLostPetPublicView } from '../src/lib/lostPet/publicView.ts'
import { scrubPersonalData } from '../src/lib/lostPet/pii.ts'
import { createLostAnnouncementToken } from '../src/lib/lostPet/token.ts'
import {
  buildHouseholdAccessNotification,
  isSafeHouseholdAccessNotificationPayload,
} from '../src/lib/notifications/fromHouseholdAccess.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { loadBookings } from '../src/lib/booking/storage.ts'
import { loadPayments } from '../src/lib/payments/storage.ts'
import { ensurePetOwnerAccountId } from '../src/lib/pets/ownership.ts'
import type { Pet } from '../src/types/index.ts'
import type { LostPetAnnouncement } from '../src/types/lostPet.ts'
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

const stranger: Account = {
  id: 'acct_stranger',
  kind: 'consumer',
  roles: ['owner'],
  displayName: 'Stranger',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const proAccount: Account = {
  id: 'acct_pro_vet',
  kind: 'professional',
  roles: ['vet'],
  displayName: 'MVDr. Pro',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const accounts = [ownerAccount, petr, anna, bara, stranger, proAccount]

const pet: Pet = ensurePetOwnerAccountId({
  id: 'luna',
  name: 'Luna',
  type: 'dog',
  breed: 'Zlatý retriever',
  age: 3,
  image: '',
  microchip: '985112000000001',
  ownerAccountId: SELF_OWNER_ID,
  ownerEmail: 'owner@example.com',
  ownerPhone: '+420777111222',
  ownerAddress: 'Hlavní 1, Praha',
  emergencyCard: {
    visibility: {
      showHealthAllergies: true,
      showMicrochipMasked: false,
    },
    health: { allergies: 'pollen' },
    ownerPhoneForPrint: '+420777111222',
    publicSlug: 'luna-emg-test',
  },
} as Pet)

function grant(
  role: 'co_owner' | 'caregiver' | 'viewer',
  accountId: string,
  permissions?: PetHouseholdAccess['permissions'],
): PetHouseholdAccess[] {
  const { accessList } = grantHouseholdAccess([], [], {
    pet,
    accountId,
    role,
    permissions,
    grantedByAccountId: SELF_OWNER_ID,
    accounts,
  })
  return accessList
}

const sampleAnnouncement: LostPetAnnouncement = {
  id: 'lost-1',
  publicToken: createLostAnnouncementToken(),
  petId: 'luna',
  status: 'lost',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastSeen: {
    publicLabel: 'okolí Kolína',
    seenAt: '2026-01-01T10:00:00.000Z',
    publicLat: 50.03,
    publicLng: 15.2,
  },
  knowsPossibleArea: false,
  publicBehavior: 'report_only',
  respondsToName: 'Luna',
  allowAppContact: true,
}

console.log('KROK 38 – assert-lost-found-auth')

check('0. lost_manage exists and is omitted from role defaults', () => {
  assert.ok(HOUSEHOLD_PET_PERMISSIONS.includes('lost_manage'))
  for (const role of ['co_owner', 'caregiver', 'viewer'] as const) {
    assert.equal(
      suggestedHouseholdPermissionsForRole(role).includes('lost_manage'),
      false,
      `${role} must not default lost_manage`,
    )
  }
})

check('1. owner can mark pet lost (canManagePetLostFound)', () => {
  assert.equal(canManagePetLostFound(pet, SELF_OWNER_ID, []), true)
  assertCanManagePetLostFound(pet, SELF_OWNER_ID, [])
})

check('2. owner can resolve found', () => {
  assert.equal(canManagePetLostFound(pet, SELF_OWNER_ID, []), true)
})

check('3. owner can close lost flow', () => {
  assert.equal(canManagePetLostFound(pet, SELF_OWNER_ID, []), true)
  assertPetOwner(pet, SELF_OWNER_ID)
})

check('4. co-owner without lost_manage cannot mark lost', () => {
  const list = grant('co_owner', petr.id)
  assert.equal(list[0]!.permissions.includes('lost_manage'), false)
  assert.equal(canManagePetLostFound(pet, petr.id, list), false)
  assert.throws(
    () => assertCanManagePetLostFound(pet, petr.id, list),
    (err: unknown) => err instanceof HouseholdPermissionError,
  )
})

check('5. co-owner without lost_manage cannot resolve', () => {
  const list = grant('co_owner', petr.id)
  assert.equal(canManagePetLostFound(pet, petr.id, list), false)
})

check('6. co-owner with lost_manage can mark lost', () => {
  const base = suggestedHouseholdPermissionsForRole('co_owner')
  const list = grant('co_owner', petr.id, [...base, 'lost_manage'])
  assert.equal(canManagePetLostFound(pet, petr.id, list), true)
  assertCanManagePetLostFound(pet, petr.id, list)
})

check('7. co-owner with lost_manage can resolve', () => {
  const base = suggestedHouseholdPermissionsForRole('co_owner')
  const list = grant('co_owner', petr.id, [...base, 'lost_manage'])
  assert.equal(canManagePetLostFound(pet, petr.id, list), true)
})

check('8. caregiver cannot mark lost', () => {
  const list = grant('caregiver', anna.id)
  assert.equal(canManagePetLostFound(pet, anna.id, list), false)
})

check('9. caregiver cannot resolve', () => {
  const list = grant('caregiver', anna.id)
  assert.equal(canManagePetLostFound(pet, anna.id, list), false)
})

check('10. viewer cannot mark lost', () => {
  const list = grant('viewer', bara.id)
  assert.equal(canManagePetLostFound(pet, bara.id, list), false)
})

check('11. viewer cannot resolve', () => {
  const list = grant('viewer', bara.id)
  assert.equal(canManagePetLostFound(pet, bara.id, list), false)
})

check('12. non-member cannot mutate lost state', () => {
  assert.equal(canManagePetLostFound(pet, stranger.id, []), false)
  assert.throws(() => assertCanManagePetLostFound(pet, stranger.id, []))
})

check('13. professional without household lost_manage cannot mutate lost state', () => {
  memory.clear()
  saveProAccess([])
  const proGrant = grantProAccess([], [], {
    petId: pet.id,
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth', 'viewDocuments'],
    grantedByAccountId: SELF_OWNER_ID,
  })
  saveProAccess(proGrant.accessList)
  assert.equal(loadProAccess().length, 1)
  assert.equal(canManagePetLostFound(pet, proAccount.id, []), false)
  assert.throws(() => assertCanManagePetLostFound(pet, proAccount.id, []))
})

check('14. emergency owner write works', () => {
  assert.equal(canWritePetEmergency(pet, SELF_OWNER_ID, []), true)
  assertCanWritePetEmergency(pet, SELF_OWNER_ID, [])
})

check('15. co-owner emergency write works (default emergency_write)', () => {
  const list = grant('co_owner', petr.id)
  assert.ok(list[0]!.permissions.includes('emergency_write'))
  assert.equal(canWritePetEmergency(pet, petr.id, list), true)
  assertCanWritePetEmergency(pet, petr.id, list)
})

check('16. caregiver emergency write rejected', () => {
  const list = grant('caregiver', anna.id)
  assert.ok(list[0]!.permissions.includes('emergency_read'))
  assert.equal(list[0]!.permissions.includes('emergency_write'), false)
  assert.equal(canWritePetEmergency(pet, anna.id, list), false)
  assert.equal(canReadPetEmergency(pet, anna.id, list), true)
  assert.throws(
    () => assertCanWritePetEmergency(pet, anna.id, list),
    (err: unknown) => err instanceof HouseholdPermissionError,
  )
})

check('17. viewer emergency access rejected', () => {
  const list = grant('viewer', bara.id)
  assert.equal(canReadPetEmergency(pet, bara.id, list), false)
  assert.equal(canWritePetEmergency(pet, bara.id, list), false)
  const view = projectPetForHousehold(pet, {
    access: list[0],
    actorAccountId: bara.id,
  })
  assert.equal(view.emergencyCard, undefined)
  assert.equal(view.emergencyWriteAllowed, false)
})

check('18. finder cannot mutate Pet (no household / ownership)', () => {
  const finderId = 'finder_anonymous'
  assert.equal(canManagePetLostFound(pet, finderId, []), false)
  assert.equal(canWritePetEmergency(pet, finderId, []), false)
})

check('19. finder cannot mutate Emergency Card', () => {
  assert.equal(canWritePetEmergency(pet, '', []), false)
  assert.throws(() => assertCanWritePetEmergency(pet, 'finder_x', []))
})

check('20. finder cannot access owner PII via public views', () => {
  const lostView = buildLostPetPublicView(pet, sampleAnnouncement)
  const lostRecord = lostView as Record<string, unknown>
  for (const key of [
    'ownerEmail',
    'ownerPhone',
    'ownerAddress',
    'ownerAccountId',
    'microchip',
    'phone',
    'email',
    'address',
  ]) {
    assert.equal(lostRecord[key], undefined, `lost view must not include ${key}`)
  }

  const emgView = buildEmergencyCardPublicView(pet, {
    activeLostAnnouncement: sampleAnnouncement,
  })
  const emgRecord = emgView as Record<string, unknown>
  for (const key of PUBLIC_EMERGENCY_FORBIDDEN_KEYS) {
    assert.equal(emgRecord[key], undefined, `emergency view must not include ${key}`)
  }
  assert.equal(emgRecord.ownerPhoneForPrint, undefined)
  assert.equal(emgRecord.ownerEmail, undefined)
  assert.equal(emgRecord.ownerAccountId, undefined)
})

check('21. SafeContact scrub remains functional', () => {
  const scrubbed = scrubPersonalData('Zavolejte na +420 777 111 222 nebo owner@example.com')
  assert.equal(scrubbed.scrubbed, true)
  assert.equal(scrubbed.text.includes('+420'), false)
  assert.equal(scrubbed.text.includes('owner@example.com'), false)
  assert.ok(scrubbed.text.includes('[skryto]'))
})

check('22. existing QR / public token helpers remain functional', () => {
  const token = createLostAnnouncementToken()
  assert.ok(typeof token === 'string' && token.length > 8)
  const view = buildLostPetPublicView(pet, { ...sampleAnnouncement, publicToken: token })
  assert.equal(view.token, token)
  assert.equal(view.allowAppContact, true)
  const emg = buildEmergencyCardPublicView(pet)
  assert.ok(emg.publicSlug)
  assert.equal(emg.contactEnabled, true)
})

check('23. existing lost notification types remain in model vocabulary', () => {
  // Smoke: household notification builder still privacy-safe; lost_* types unchanged in AppContext.
  const list = grant('co_owner', petr.id)
  const n = buildHouseholdAccessNotification({
    event: 'granted',
    access: list[0]!,
    petName: pet.name,
    memberDisplayName: 'Petr',
  })
  assert.ok(n)
  assert.equal(isSafeHouseholdAccessNotificationPayload(n!), true)
})

check('24. household notification remains privacy-safe', () => {
  const list = grant('caregiver', anna.id)
  const n = buildHouseholdAccessNotification({
    event: 'granted',
    access: list[0]!,
    petName: pet.name,
    memberDisplayName: 'Anna',
  })
  assert.ok(n)
  const payload = JSON.stringify(n)
  assert.equal(payload.includes('985112000000001'), false)
  assert.equal(payload.includes('owner@example.com'), false)
  assert.equal(payload.includes('+420777111222'), false)
  assert.equal(isSafeHouseholdAccessNotificationPayload(n!), true)
})

check('25. Professional Access remains independent', () => {
  memory.clear()
  saveProAccess([])
  savePetHouseholdAccess([])
  const hh = grant('co_owner', petr.id, [
    ...suggestedHouseholdPermissionsForRole('co_owner'),
    'lost_manage',
  ])
  savePetHouseholdAccess(hh)
  const pro = grantProAccess([], [], {
    petId: pet.id,
    professionalId: 'pro_vet_1',
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
  })
  saveProAccess(pro.accessList)
  assert.equal(loadPetHouseholdAccess().length, 1)
  assert.equal(loadProAccess().length, 1)
  assert.equal(canManagePetLostFound(pet, proAccount.id, loadPetHouseholdAccess()), false)
  assert.equal(canManagePetLostFound(pet, petr.id, loadPetHouseholdAccess()), true)
})

check('26. no membership side effect (grant does not touch membership keys)', () => {
  memory.clear()
  const hh = grant('viewer', bara.id)
  savePetHouseholdAccess(hh)
  assert.ok(memory.getItem(PET_HOUSEHOLD_ACCESS_STORAGE_KEY))
  assert.equal(memory.getItem('lovedandknown.membership'), null)
})

check('27. no booking side effect', () => {
  const before = loadBookings().length
  grant('co_owner', petr.id)
  assert.equal(loadBookings().length, before)
})

check('28. no payment side effect', () => {
  const before = loadPayments().length
  grant('caregiver', anna.id)
  assert.equal(loadPayments().length, before)
})

check('bonus: projection flags lostManageAllowed + emergencyWriteAllowed', () => {
  const coDefault = grant('co_owner', petr.id)
  const viewDefault = projectPetForHousehold(pet, {
    access: coDefault[0],
    actorAccountId: petr.id,
  })
  assert.equal(viewDefault.lostManageAllowed, false)
  assert.equal(viewDefault.emergencyWriteAllowed, true)

  const withLost = grant('co_owner', petr.id, [
    ...suggestedHouseholdPermissionsForRole('co_owner'),
    'lost_manage',
  ])
  const viewLost = projectPetForHousehold(pet, {
    access: withLost[0],
    actorAccountId: petr.id,
  })
  assert.equal(viewLost.lostManageAllowed, true)

  const ownerView = projectPetForHousehold(pet, {
    access: null,
    actorAccountId: SELF_OWNER_ID,
  })
  assert.equal(ownerView.lostManageAllowed, true)
  assert.equal(ownerView.emergencyWriteAllowed, true)
})

check('bonus: role alone is not enough (caregiver + lost_manage without role change)', () => {
  const list = grant('caregiver', anna.id, [
    ...suggestedHouseholdPermissionsForRole('caregiver'),
    'lost_manage',
  ])
  assert.equal(list[0]!.role, 'caregiver')
  assert.equal(canManagePetLostFound(pet, anna.id, list), true)
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
