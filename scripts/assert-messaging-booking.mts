/**
 * Assert booking messaging (KROK 32).
 * Run: npx tsx scripts/assert-messaging-booking.mts
 *
 * A – conversation can be created
 * B – owner can send message
 * C – professional can reply
 * D – non-participant cannot access
 * E – booking context is correct
 * F – unread count works
 * G – mark read works
 * H – notification emitted
 * I – notification dedupe works
 * J – completed booking keeps history
 * K – cancelled booking keeps history
 * L – no-show keeps history
 * M – direct URL without access is denied
 * N – privacy
 * P – note: run assert-booking*.mts for booking regression
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  createProfessionalService,
  ensureDefaultAvailability,
  completeBooking,
  cancelBooking,
  markNoShow,
  saveBookings,
  loadBookings,
  getBooking,
} from '../src/lib/booking/index.ts'
import {
  assertMessagingPayloadSafe,
  buildBookingMessageContext,
  canAccessConversation,
  getOrCreateBookingConversation,
  getUnreadCountForAccount,
  isSafeMessagingPayload,
  markConversationRead,
  requireConversationAccess,
  sendMessage,
  ensureMessagingSeed,
  getConversation,
} from '../src/lib/messaging/index.ts'
import {
  buildMessageReceivedNotification,
  emitMessageReceivedNotification,
  isSafeMessageNotificationPayload,
  loadNotifications,
  messageDedupeKey,
  migrateNotificationList,
  saveNotifications,
  upsertNotification,
} from '../src/lib/notifications/index.ts'
import type { Account } from '../src/types/professional.ts'
import type { ProfessionalProfile } from '../src/types/professional.ts'

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

const OWNER_ID = 'owner_self'
const PRO_ACCOUNT = 'pro_account_vet'
const GROOMER_ACCOUNT = 'pro_account_groomer'
const TRAINER_ACCOUNT = 'pro_account_trainer'
const STRANGER_ID = 'owner_stranger'
const PRO_ID = 'pro_msg_vet'
const GROOMER_ID = 'pro_msg_groomer'
const TRAINER_ID = 'pro_msg_trainer'
const PET_ID = 'pet_msg_luna'

function seedBase() {
  memory.clear()
  const now = '2026-09-01T10:00:00.000Z'
  const accounts: Account[] = [
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Majitel',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: PRO_ACCOUNT,
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'Dr. Vet',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: GROOMER_ACCOUNT,
      kind: 'professional',
      roles: ['groomer'],
      displayName: 'Groomer G',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: TRAINER_ACCOUNT,
      kind: 'professional',
      roles: ['trainer'],
      displayName: 'Trainer T',
      createdAt: now,
      updatedAt: now,
    },
  ]
  saveAccounts(accounts)

  const profiles: ProfessionalProfile[] = [
    {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      type: 'veterinarian',
      displayName: 'Dr. Vet',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: GROOMER_ID,
      accountId: GROOMER_ACCOUNT,
      type: 'groomer',
      displayName: 'Groomer G',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: TRAINER_ID,
      accountId: TRAINER_ACCOUNT,
      type: 'trainer',
      displayName: 'Trainer T',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: now,
      updatedAt: now,
    },
  ]
  saveProfessionalProfiles(profiles)
  ensureDefaultAvailability(PRO_ID)
  ensureDefaultAvailability(GROOMER_ID)
  ensureDefaultAvailability(TRAINER_ID)

  const svc = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Kontrola',
    durationMinutes: 30,
    category: 'veterinary',
    priceType: 'fixed',
    price: 500,
    currency: 'CZK',
  })
  assert.ok(svc.ok)
  // overwrite id for stable refs if needed — use returned id
  return { serviceId: svc.value.id }
}

function insertBooking(partial: {
  id: string
  professionalId: string
  serviceId: string
  startAt: string
  endAt: string
  status: 'confirmed' | 'completed' | 'cancelled_by_owner' | 'no_show'
  serviceName?: string
  professionalName?: string
}) {
  const now = '2026-09-01T10:00:00.000Z'
  const row = {
    id: partial.id,
    ownerAccountId: OWNER_ID,
    professionalId: partial.professionalId,
    serviceId: partial.serviceId,
    petId: PET_ID,
    startAt: partial.startAt,
    endAt: partial.endAt,
    status: partial.status,
    petName: 'Luna',
    professionalName: partial.professionalName ?? 'Profesionál',
    serviceNameSnapshot: partial.serviceName ?? 'Služba',
    ownerDisplayName: 'Majitel',
    createdAt: now,
    updatedAt: now,
    confirmedAt: now,
  }
  if (partial.status === 'completed') {
    Object.assign(row, { completedAt: now })
  }
  if (partial.status === 'cancelled_by_owner') {
    Object.assign(row, { cancelledAt: now })
  }
  if (partial.status === 'no_show') {
    Object.assign(row, { noShowAt: now })
  }
  saveBookings([...loadBookings().filter((b) => b.id !== row.id), row as any])
  return row.id
}

console.log('\n=== assert-messaging-booking ===\n')

const { serviceId } = seedBase()

let bookingId = ''

check('A – conversation can be created', () => {
  bookingId = insertBooking({
    id: 'bkg_msg_main',
    professionalId: PRO_ID,
    serviceId,
    startAt: '2026-09-20T14:00:00.000Z',
    endAt: '2026-09-20T14:30:00.000Z',
    status: 'confirmed',
    serviceName: 'Kontrola',
    professionalName: 'Dr. Vet',
  })

  const result = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.ok(result.data.id)
  assert.deepEqual(
    new Set(result.data.participantAccountIds),
    new Set([OWNER_ID, PRO_ACCOUNT]),
  )
  assert.equal(result.data.bookingId, bookingId)
})

check('B – owner can send message', () => {
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  const sent = sendMessage({
    conversationId: conv.data.id,
    senderAccountId: OWNER_ID,
    text: 'Dobrý den, mám dotaz k termínu.',
  })
  assert.equal(sent.ok, true)
  if (!sent.ok) return
  assert.equal(sent.data.message.senderAccountId, OWNER_ID)
  assert.equal(sent.data.recipientAccountId, PRO_ACCOUNT)
})

check('C – professional can reply', () => {
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: PRO_ACCOUNT,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  const sent = sendMessage({
    conversationId: conv.data.id,
    senderAccountId: PRO_ACCOUNT,
    text: 'Dobrý den, rád pomohu.',
  })
  assert.equal(sent.ok, true)
  if (!sent.ok) return
  assert.equal(sent.data.message.senderAccountId, PRO_ACCOUNT)
})

check('D – non-participant cannot access', () => {
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  assert.equal(canAccessConversation(STRANGER_ID, conv.data), false)
  const denied = requireConversationAccess(conv.data.id, STRANGER_ID)
  assert.equal(denied.ok, false)
  if (denied.ok) return
  assert.equal(denied.code, 'forbidden')

  const createDenied = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: STRANGER_ID,
  })
  assert.equal(createDenied.ok, false)
})

check('E – booking context is correct', () => {
  const booking = getBooking(bookingId)
  assert.ok(booking)
  if (!booking) return
  const ctx = buildBookingMessageContext(booking)
  assert.equal(ctx.petName, 'Luna')
  assert.match(ctx.serviceName, /Kontrola/i)
  assert.ok(ctx.dateLabel)
  assert.ok(ctx.timeLabel)
  assert.equal(ctx.statusLabel, 'Potvrzeno')
  assert.equal(ctx.isEnded, false)
})

check('F – unread count works', () => {
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  // Pro sends → owner unread
  sendMessage({
    conversationId: conv.data.id,
    senderAccountId: PRO_ACCOUNT,
    text: 'Připomínám termín zítra.',
  })
  const unread = getUnreadCountForAccount(OWNER_ID)
  assert.ok(unread >= 1)
})

check('G – mark read works', () => {
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  const marked = markConversationRead({
    conversationId: conv.data.id,
    accountId: OWNER_ID,
  })
  assert.equal(marked.ok, true)
  if (!marked.ok) return
  assert.equal(marked.data.unread, 0)
  assert.equal(getUnreadCountForAccount(OWNER_ID), 0)
})

check('H – notification emitted', () => {
  saveNotifications([])
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  const sent = sendMessage({
    conversationId: conv.data.id,
    senderAccountId: OWNER_ID,
    text: 'Ještě jeden dotaz.',
  })
  assert.ok(sent.ok)
  if (!sent.ok) return

  const draft = buildMessageReceivedNotification({
    messageId: sent.data.message.id,
    conversationId: conv.data.id,
    recipientAccountId: PRO_ACCOUNT,
    senderDisplayName: 'Majitel',
    bookingId,
    professionalId: PRO_ID,
    recipientIsProfessional: true,
  })
  assert.ok(draft)
  if (!draft) return
  assert.equal(draft.type, 'message')
  assert.match(draft.title, /Nová zpráva/)
  assert.doesNotMatch(draft.message, /Ještě jeden dotaz/)
  assert.equal(draft.dedupeKey, messageDedupeKey(sent.data.message.id))

  let list = loadNotifications()
  list = upsertNotification(list, draft)
  saveNotifications(list)
  assert.ok(loadNotifications().some((n) => n.dedupeKey === draft.dedupeKey))
})

check('I – notification dedupe works', () => {
  const msgId = 'msg_dedupe_test'
  const draft = buildMessageReceivedNotification({
    messageId: msgId,
    conversationId: 'conv_x',
    recipientAccountId: PRO_ACCOUNT,
    senderDisplayName: 'Majitel',
  })
  assert.ok(draft)
  if (!draft) return
  let list = migrateNotificationList([])
  list = upsertNotification(list, draft)
  list = upsertNotification(list, draft)
  assert.equal(list.filter((n) => n.dedupeKey === messageDedupeKey(msgId)).length, 1)

  emitMessageReceivedNotification((d) => {
    list = upsertNotification(list, d)
  }, {
    messageId: msgId,
    conversationId: 'conv_x',
    recipientAccountId: PRO_ACCOUNT,
    senderDisplayName: 'Majitel',
  })
  assert.equal(list.filter((n) => n.dedupeKey === messageDedupeKey(msgId)).length, 1)
})

check('J – completed booking keeps history', () => {
  const completedId = insertBooking({
    id: 'bkg_msg_completed',
    professionalId: PRO_ID,
    serviceId,
    startAt: '2026-08-01T10:00:00.000Z',
    endAt: '2026-08-01T10:30:00.000Z',
    status: 'confirmed',
    serviceName: 'Kontrola',
    professionalName: 'Dr. Vet',
  })
  const c1 = getOrCreateBookingConversation({
    bookingId: completedId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(c1.ok)
  if (!c1.ok) return
  sendMessage({
    conversationId: c1.data.id,
    senderAccountId: OWNER_ID,
    text: 'Díky za péči.',
  })
  const done = completeBooking(completedId, PRO_ID, {
    now: new Date('2026-08-01T12:00:00.000Z'),
  })
  assert.equal(done.ok, true)
  const after = getConversation(c1.data.id)
  assert.ok(after)
  assert.ok((after?.messages.length ?? 0) >= 1)
  const ctx = buildBookingMessageContext(getBooking(completedId)!)
  assert.equal(ctx.isEnded, true)
})

check('K – cancelled booking keeps history', () => {
  ensureDefaultAvailability(GROOMER_ID)
  const gsvc = createProfessionalService({
    professionalId: GROOMER_ID,
    name: 'Stříhání srsti',
    durationMinutes: 60,
    category: 'grooming',
    priceType: 'fixed',
    price: 800,
  })
  assert.ok(gsvc.ok)
  if (!gsvc.ok) return
  const cancelledId = insertBooking({
    id: 'bkg_msg_cancelled',
    professionalId: GROOMER_ID,
    serviceId: gsvc.value.id,
    startAt: '2026-09-25T11:00:00.000Z',
    endAt: '2026-09-25T12:00:00.000Z',
    status: 'confirmed',
    serviceName: 'Stříhání srsti',
    professionalName: 'Groomer G',
  })
  const c1 = getOrCreateBookingConversation({
    bookingId: cancelledId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(c1.ok)
  if (!c1.ok) return
  sendMessage({
    conversationId: c1.data.id,
    senderAccountId: OWNER_ID,
    text: 'Musím zrušit.',
  })
  const cancelled = cancelBooking(cancelledId, { kind: 'owner', accountId: OWNER_ID })
  assert.equal(cancelled.ok, true)
  const after = getConversation(c1.data.id)
  assert.ok(after && after.messages.length >= 1)
  assert.equal(buildBookingMessageContext(getBooking(cancelledId)!).isEnded, true)
})

check('L – no-show keeps history', () => {
  ensureDefaultAvailability(TRAINER_ID)
  const tsvc = createProfessionalService({
    professionalId: TRAINER_ID,
    name: 'Výcvik',
    durationMinutes: 45,
    category: 'training',
    priceType: 'fixed',
    price: 600,
  })
  assert.ok(tsvc.ok)
  if (!tsvc.ok) return
  const noshowId = insertBooking({
    id: 'bkg_msg_noshow',
    professionalId: TRAINER_ID,
    serviceId: tsvc.value.id,
    startAt: '2026-08-15T15:00:00.000Z',
    endAt: '2026-08-15T15:45:00.000Z',
    status: 'confirmed',
    serviceName: 'Výcvik',
    professionalName: 'Trainer T',
  })
  const c1 = getOrCreateBookingConversation({
    bookingId: noshowId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(c1.ok)
  if (!c1.ok) return
  sendMessage({
    conversationId: c1.data.id,
    senderAccountId: TRAINER_ACCOUNT,
    text: 'Čekali jsme vás.',
  })
  const noshow = markNoShow(noshowId, TRAINER_ID, {
    now: new Date('2026-08-15T16:00:00.000Z'),
  })
  assert.equal(noshow.ok, true)
  const after = getConversation(c1.data.id)
  assert.ok(after && after.messages.length >= 1)
  assert.equal(buildBookingMessageContext(getBooking(noshowId)!).isEnded, true)
})

check('M – direct URL without access is denied', () => {
  const conv = getOrCreateBookingConversation({
    bookingId,
    callerAccountId: OWNER_ID,
  })
  assert.ok(conv.ok)
  if (!conv.ok) return
  const access = requireConversationAccess(conv.data.id, STRANGER_ID)
  assert.equal(access.ok, false)
  // bookingId alone must not grant access
  assert.equal(
    canAccessConversation(STRANGER_ID, {
      ...conv.data,
      // stranger somehow knows bookingId — still no
    }),
    false,
  )
})

check('N – privacy', () => {
  const dirty = {
    text: 'ok',
    microchip: '123',
    ownerContacts: { phone: '1' },
  }
  assert.equal(isSafeMessagingPayload(dirty), false)
  assert.throws(() => assertMessagingPayloadSafe(dirty))
  assert.equal(
    isSafeMessagingPayload({
      id: 'x',
      participantAccountIds: [OWNER_ID, PRO_ACCOUNT],
      lastMessage: 'Ahoj',
    }),
    true,
  )
  const notif = buildMessageReceivedNotification({
    messageId: 'm1',
    conversationId: 'c1',
    recipientAccountId: OWNER_ID,
    senderDisplayName: 'Dr. Vet',
  })
  assert.ok(notif && isSafeMessageNotificationPayload(notif))
  assert.doesNotMatch(JSON.stringify(notif), /microchip/i)
})

check('Seed demo conversations', () => {
  const bookings = loadBookings()
  ensureMessagingSeed({
    ownerAccountId: OWNER_ID,
    veterinarian: {
      professionalId: PRO_ID,
      accountId: PRO_ACCOUNT,
      displayName: 'Dr. Vet',
    },
    groomer: {
      professionalId: GROOMER_ID,
      accountId: GROOMER_ACCOUNT,
      displayName: 'Groomer G',
    },
    trainer: {
      professionalId: TRAINER_ID,
      accountId: TRAINER_ACCOUNT,
      displayName: 'Trainer T',
    },
    bookings: {
      vetConfirmed: bookings.find(
        (b) => b.professionalId === PRO_ID && b.status === 'confirmed',
      ),
      groomerConfirmed: bookings.find(
        (b) => b.professionalId === GROOMER_ID && b.status === 'confirmed',
      ),
      trainerConfirmed: bookings.find(
        (b) => b.professionalId === TRAINER_ID && b.status === 'confirmed',
      ),
      completed: bookings.find((b) => b.status === 'completed'),
      cancelled: bookings.find(
        (b) =>
          b.status === 'cancelled_by_owner' ||
          b.status === 'cancelled_by_professional',
      ),
    },
  })
  assert.ok(getConversation('conv_seed_vet') || getConversation('conv_seed_completed'))
})

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
console.log(
  'P – regression: run npx tsx scripts/assert-booking.mts && npx tsx scripts/assert-booking-rules.mts && npx tsx scripts/assert-booking-ux.mts',
)

if (failed > 0) process.exit(1)
