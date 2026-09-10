/**
 * Assert professional-access notifications (KROK 22).
 * Run: npx tsx scripts/assert-notifications.mts
 *
 * A – request → právě 1 notification pro recipient
 * B – reload → stále 1
 * C – re-render / opakovaný upsert → žádná duplicita
 * D – approve → právě 1 approval notification
 * E – revoke → právě 1 revoke notification
 * F – mark read → unread count klesne
 * G – reload → read stav zůstane
 * H – payload bez microchip
 * I – payload bez ownerContacts
 * J – payload bez health data
 * K – revoked access přes notifikaci neobnoví access
 * L – duplicate request → žádná další notification
 * M – recipient je správný Account
 */
import assert from 'node:assert/strict'
import {
  activateAccess,
  expireAccess,
  grantPetAccess,
  isAccessEffective,
  loadPetProfessionalAccess,
  projectPetForProfessional,
  requestProfessionalAccess,
  revokeAccess,
  savePetProfessionalAccess,
  saveProfessionalAccessLogs,
  type PetProfessionalAccess,
  type ProfessionalAccessLog,
  type ProfessionalProfile,
} from '../src/lib/professional/index.ts'
import {
  buildProfessionalAccessNotification,
  isSafeProfessionalAccessNotificationPayload,
  loadNotifications,
  markNotificationRead,
  migrateNotificationList,
  NOTIFICATIONS_STORAGE_KEY,
  professionalAccessDedupeKey,
  saveNotifications,
  upsertNotification,
} from '../src/lib/notifications/index.ts'
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
    console.error(`  FAIL ${label}`)
    console.error(err)
  }
}

function countByDedupe(list: AppNotification[], key: string): number {
  return list.filter((n) => n.dedupeKey === key).length
}

function unreadCount(list: AppNotification[]): number {
  return list.filter((n) => n.unread).length
}

const OWNER_ID = 'acct_owner_notif'
const PRO_ACCOUNT_ID = 'acct_pro_notif'
const PRO_ID = 'pro_notif_vet'
const PET_ID = 'pet_luna_notif'

const professional: ProfessionalProfile = {
  id: PRO_ID,
  accountId: PRO_ACCOUNT_ID,
  type: 'veterinarian',
  displayName: 'MUDr. Martin Novák',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const pet = {
  id: PET_ID,
  name: 'Luna',
  type: 'Pes',
  breed: 'Border kolie',
  age: 3,
  image: '',
  microchip: 'CZ-SENSITIVE-CHIP-999',
  ownerContacts: {
    name: 'Tereza',
    phone: '+420111222333',
    email: 'owner@example.com',
  },
} as Pet & { ownerContacts: { name: string; phone: string; email: string } }

memory.clear()
savePetProfessionalAccess([])
saveProfessionalAccessLogs([])
saveNotifications([])

let notifications: AppNotification[] = []
let accessList: PetProfessionalAccess[] = []
let accessLogs: ProfessionalAccessLog[] = []

function emit(
  access: PetProfessionalAccess,
  event: 'requested' | 'approved' | 'revoked' | 'expired',
) {
  const draft = buildProfessionalAccessNotification({
    access,
    event,
    petName: pet.name,
    professional,
    roleLabel: 'Veterinář',
  })
  assert.ok(draft, `draft for ${event}`)
  notifications = upsertNotification(notifications, draft!)
  saveNotifications(notifications)
  return draft!
}

console.log('\nKROK 22 — assert-notifications\n')

check('A: request creates exactly 1 owner notification', () => {
  const result = requestProfessionalAccess(accessList, accessLogs, {
    petId: PET_ID,
    professionalId: PRO_ID,
    grantedByAccountId: OWNER_ID,
    permissions: [],
  })
  accessList = result.accessList
  accessLogs = result.logs
  savePetProfessionalAccess(accessList)
  saveProfessionalAccessLogs(accessLogs)

  const draft = emit(result.access, 'requested')
  assert.equal(draft.recipientAccountId, OWNER_ID)
  assert.equal(draft.type, 'professional_access_requested')
  assert.equal(
    countByDedupe(notifications, professionalAccessDedupeKey('requested', result.access.id)),
    1,
  )
  assert.match(draft.message, /Luna/)
  assert.match(draft.message, /Martin Novák/)
})

check('B: reload preserves exactly 1 request notification', () => {
  const reloaded = loadNotifications() ?? []
  const access = accessList[0]!
  assert.equal(
    countByDedupe(reloaded, professionalAccessDedupeKey('requested', access.id)),
    1,
  )
  notifications = reloaded
})

check('C: re-upsert same event does not duplicate', () => {
  const access = accessList[0]!
  const before = notifications.length
  emit(access, 'requested')
  emit(access, 'requested')
  assert.equal(notifications.length, before)
  assert.equal(
    countByDedupe(notifications, professionalAccessDedupeKey('requested', access.id)),
    1,
  )
})

check('D: approve creates exactly 1 approval notification for pro account', () => {
  const access = accessList[0]!
  const activated = activateAccess(accessList, accessLogs, access.id)
  accessList = activated.accessList
  accessLogs = activated.logs
  savePetProfessionalAccess(accessList)
  saveProfessionalAccessLogs(accessLogs)
  assert.ok(activated.access)
  const draft = emit(activated.access!, 'approved')
  assert.equal(draft.recipientAccountId, PRO_ACCOUNT_ID)
  assert.equal(draft.type, 'professional_access_approved')
  assert.equal(
    countByDedupe(notifications, professionalAccessDedupeKey('approved', access.id)),
    1,
  )
  emit(activated.access!, 'approved')
  assert.equal(
    countByDedupe(notifications, professionalAccessDedupeKey('approved', access.id)),
    1,
  )
})

check('E: revoke creates exactly 1 revoke notification', () => {
  const access = accessList[0]!
  const revoked = revokeAccess(accessList, accessLogs, access.id)
  accessList = revoked.accessList
  accessLogs = revoked.logs
  savePetProfessionalAccess(accessList)
  saveProfessionalAccessLogs(accessLogs)
  assert.ok(revoked.access)
  const draft = emit(revoked.access!, 'revoked')
  assert.equal(draft.recipientAccountId, PRO_ACCOUNT_ID)
  assert.equal(draft.type, 'professional_access_revoked')
  assert.equal(
    countByDedupe(notifications, professionalAccessDedupeKey('revoked', access.id)),
    1,
  )
  emit(revoked.access!, 'revoked')
  assert.equal(
    countByDedupe(notifications, professionalAccessDedupeKey('revoked', access.id)),
    1,
  )
})

check('F: mark read lowers unread count', () => {
  const target = notifications.find((n) => n.type === 'professional_access_requested')
  assert.ok(target)
  assert.equal(target!.unread, true)
  const before = unreadCount(notifications)
  assert.ok(before >= 1)
  notifications = markNotificationRead(notifications, target!.id)
  saveNotifications(notifications)
  assert.equal(unreadCount(notifications), before - 1)
  const updated = notifications.find((n) => n.id === target!.id)!
  assert.equal(updated.unread, false)
  assert.ok(updated.readAt)
})

check('G: reload keeps read state', () => {
  const reloaded = loadNotifications() ?? []
  const target = reloaded.find((n) => n.type === 'professional_access_requested')
  assert.ok(target)
  assert.equal(target!.unread, false)
  assert.ok(target!.readAt)
  notifications = reloaded
})

check('H/I/J: notification payload has no sensitive data', () => {
  for (const n of notifications) {
    assert.ok(
      isSafeProfessionalAccessNotificationPayload(n),
      `unsafe payload: ${n.dedupeKey}`,
    )
    assert.doesNotMatch(
      n.title + n.message,
      /microchip|CZ-SENSITIVE|ownerContacts|\+420|healthRecord/i,
    )
  }
  const access = accessList[0]!
  const draft = buildProfessionalAccessNotification({
    access,
    event: 'approved',
    petName: pet.name,
    professional,
  })!
  assert.equal('microchip' in draft, false)
  assert.equal('ownerContacts' in draft, false)
  assert.equal('healthRecords' in draft, false)
  assert.doesNotMatch(JSON.stringify(draft), /CZ-SENSITIVE/)
})

check('K: revoked access stays non-effective; notification href does not restore access', () => {
  const access = loadPetProfessionalAccess().find((a) => a.id === accessList[0]!.id)!
  assert.equal(access.status, 'revoked')
  assert.equal(isAccessEffective(access), false)
  const { view } = projectPetForProfessional(pet, {
    access,
  })
  assert.equal(Object.keys(view).includes('microchip'), false)
  assert.equal(Object.keys(view).includes('ownerContacts'), false)
  const notif = notifications.find((n) => n.type === 'professional_access_revoked')!
  assert.equal(notif.href, `/professionals/${PRO_ID}`)
  assert.ok(!notif.href?.includes(`/pets/${PET_ID}`))
})

check('L: duplicate open request does not create another notification', () => {
  const result = grantPetAccess([], [], {
    petId: 'pet_milo',
    professionalId: PRO_ID,
    permissions: ['viewHealth'],
    grantedByAccountId: OWNER_ID,
    status: 'pending',
  })
  let localNotifs: AppNotification[] = []
  const draft1 = buildProfessionalAccessNotification({
    access: result.access,
    event: 'requested',
    petName: 'Milo',
    professional,
  })!
  localNotifs = upsertNotification(localNotifs, draft1)
  assert.throws(() =>
    requestProfessionalAccess(result.accessList, result.logs, {
      petId: 'pet_milo',
      professionalId: PRO_ID,
      grantedByAccountId: OWNER_ID,
    }),
  )
  localNotifs = upsertNotification(localNotifs, draft1)
  assert.equal(
    countByDedupe(localNotifs, professionalAccessDedupeKey('requested', result.access.id)),
    1,
  )
})

check('M: recipientAccountId is the correct Account (not role)', () => {
  const requested = notifications.find((n) => n.type === 'professional_access_requested')!
  const approved = notifications.find((n) => n.type === 'professional_access_approved')!
  assert.equal(requested.recipientAccountId, OWNER_ID)
  assert.equal(approved.recipientAccountId, PRO_ACCOUNT_ID)
  assert.notEqual(requested.recipientAccountId, 'veterinarian')
  assert.notEqual(approved.recipientAccountId, 'owner')
})

check('expire: active past expiresAt → 1 expired notification; idempotent', () => {
  const past = '2020-01-01T00:00:00.000Z'
  const now = '2026-09-11T00:00:00.000Z'
  const granted = grantPetAccess([], [], {
    petId: PET_ID,
    professionalId: PRO_ID,
    permissions: ['viewHealth'],
    grantedByAccountId: OWNER_ID,
    status: 'active',
    expiresAt: past,
  })
  const expired = expireAccess(granted.accessList, granted.logs, granted.access.id, now)
  assert.equal(expired.access?.status, 'expired')
  let local: AppNotification[] = []
  const draft = buildProfessionalAccessNotification({
    access: expired.access!,
    event: 'expired',
    petName: pet.name,
    professional,
  })!
  local = upsertNotification(local, draft)
  local = upsertNotification(local, draft)
  assert.equal(countByDedupe(local, professionalAccessDedupeKey('expired', granted.access.id)), 1)
  assert.equal(isAccessEffective(expired.access), false)
})

check('normalize/migrate keeps recipientAccountId + related ids', () => {
  const sample = {
    id: 'n-migrate',
    type: 'professional_access_requested',
    title: 'Nová žádost o propojení',
    message: 'Test',
    createdAt: '2026-01-01T00:00:00.000Z',
    unread: true,
    priority: 'important',
    dedupeKey: 'pro-access:requested:x',
    recipientAccountId: OWNER_ID,
    relatedProfessionalId: PRO_ID,
    relatedAccessId: 'ppa_x',
    petId: PET_ID,
    petName: 'Luna',
  }
  const migrated = migrateNotificationList([sample])
  assert.equal(migrated.length, 1)
  assert.equal(migrated[0]!.recipientAccountId, OWNER_ID)
  assert.equal(migrated[0]!.relatedProfessionalId, PRO_ID)
  assert.equal(migrated[0]!.relatedAccessId, 'ppa_x')
})

check('storage key is lovedandknown.notifications', () => {
  assert.equal(NOTIFICATIONS_STORAGE_KEY, 'lovedandknown.notifications')
  assert.ok(memory.getItem(NOTIFICATIONS_STORAGE_KEY))
})

console.log(`\nDone: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
