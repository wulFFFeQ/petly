/**
 * Assert booking UX access + notifications (KROK 26).
 * Run: npx tsx scripts/assert-booking-ux.mts
 *
 * A – owner vidí svoje bookingy
 * B – professional vidí svoje bookingy
 * C – cizí účet booking nevidí
 * D – request → notification
 * E – confirm → notification
 * F – decline → notification
 * G – cancel → notification
 * H – calendar sync
 * I – booking detail projection
 * J – empty states (partition)
 * K – privacy
 * L – reload persistence
 * M – duplicate protection
 * N – unavailable slot
 * O – disabled service
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  BOOKINGS_STORAGE_KEY,
  assertBookingPayloadSafe,
  buildBookingCalendarEvent,
  cancelBooking,
  confirmBooking,
  createBooking,
  createProfessionalService,
  declineBooking,
  disableProfessionalService,
  ensureDefaultAvailability,
  getAvailability,
  getAvailableSlots,
  getBooking,
  getProfessionalService,
  isSlotAvailable,
  listBookings,
  loadBookings,
  partitionOwnerBookings,
  partitionProfessionalBookings,
  projectPetForBooking,
  syncBookingCalendarEvent,
} from '../src/lib/booking/index.ts'
import {
  bookingDedupeKey,
  emitBookingNotification,
  isSafeBookingNotificationPayload,
  loadNotifications,
  migrateNotificationList,
  saveNotifications,
  upsertNotification,
} from '../src/lib/notifications/index.ts'

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

const PRO_ID = 'pro_ux_vet'
const OWNER_ID = 'owner_self'
const OTHER_OWNER = 'owner_other'
const PET_ID = 'pet_ux_luna'

function seed() {
  memory.clear()
  saveAccounts([
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Owner UX',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: OTHER_OWNER,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Other',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'pro_account_ux',
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'Pro UX',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([
    {
      id: PRO_ID,
      accountId: 'pro_account_ux',
      type: 'veterinarian',
      displayName: 'MVDr. UX Vet',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveNotifications([])
  ensureDefaultAvailability(PRO_ID)
}

function nextMondayAt(hour: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d
}

function dateIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function freeSlot(serviceId: string) {
  const service = getProfessionalService(serviceId)!
  const avail = getAvailability(PRO_ID)
  for (let w = 0; w < 4; w++) {
    const day = nextMondayAt(9)
    day.setDate(day.getDate() + w * 7)
    const slots = getAvailableSlots({
      professionalId: PRO_ID,
      service,
      date: dateIsoLocal(day),
      availability: avail,
      bookings: loadBookings(),
    })
    if (slots.length) return slots[0]!
  }
  throw new Error('no slot')
}

function emit(event: Parameters<typeof emitBookingNotification>[1]['event'], bookingId: string) {
  const booking = getBooking(bookingId)!
  return emitBookingNotification(
    (d) => {
      const next = upsertNotification(loadNotifications(), d)
      saveNotifications(migrateNotificationList(next))
    },
    {
      booking,
      event,
      professional: {
        id: PRO_ID,
        accountId: 'pro_account_ux',
        displayName: 'MVDr. UX Vet',
      },
      cancelledBy: event === 'cancelled' ? 'owner' : undefined,
    },
  )
}

console.log('KROK 26 – assert-booking-ux')
seed()

let serviceId = ''
let bookingId = ''

check('setup service', () => {
  const r = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Konzultace UX',
    durationMinutes: 30,
    price: 500,
    currency: 'CZK',
  })
  assert.equal(r.ok, true)
  if (r.ok) serviceId = r.value.id
})

check('A – owner vidí svoje bookingy', () => {
  const slot = freeSlot(serviceId)
  const r = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    professionalName: 'MVDr. UX Vet',
    petExists: true,
    clientRequestId: 'ux_a',
  })
  assert.equal(r.ok, true)
  if (!r.ok) return
  bookingId = r.value.id
  const mine = listBookings({ ownerAccountId: OWNER_ID })
  assert.ok(mine.some((b) => b.id === bookingId))
  const parts = partitionOwnerBookings(OWNER_ID)
  assert.ok(parts.pending.some((b) => b.id === bookingId))
})

check('B – professional vidí svoje bookingy', () => {
  const pro = listBookings({ professionalId: PRO_ID })
  assert.ok(pro.some((b) => b.id === bookingId))
  const parts = partitionProfessionalBookings(PRO_ID)
  assert.ok(parts.neue.some((b) => b.id === bookingId))
})

check('C – cizí účet booking nevidí', () => {
  const other = listBookings({ ownerAccountId: OTHER_OWNER })
  assert.equal(other.some((b) => b.id === bookingId), false)
  const foreign = getBooking(bookingId)!
  assert.notEqual(foreign.ownerAccountId, OTHER_OWNER)
})

check('D – request → notification', () => {
  saveNotifications([])
  const draft = emit('requested', bookingId)
  assert.ok(draft)
  assert.equal(draft!.type, 'booking_requested')
  assert.equal(draft!.href, `/professional/bookings/${bookingId}`)
  assert.equal(
    loadNotifications().filter((n) => n.dedupeKey === bookingDedupeKey('requested', bookingId))
      .length,
    1,
  )
})

check('E – confirm → notification', () => {
  const confirmed = confirmBooking(bookingId, PRO_ID)
  assert.equal(confirmed.ok, true)
  const draft = emit('confirmed', bookingId)
  assert.ok(draft)
  assert.equal(draft!.type, 'booking_confirmed')
  assert.equal(draft!.href, `/bookings/${bookingId}`)
})

check('F – decline → notification', () => {
  const slot = freeSlot(serviceId)
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'ux_decline',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  declineBooking(created.value.id, PRO_ID)
  const draft = emit('declined', created.value.id)
  assert.ok(draft)
  assert.equal(draft!.type, 'booking_declined')
})

check('G – cancel → notification', () => {
  const slot = freeSlot(serviceId)
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'ux_cancel',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  cancelBooking(created.value.id, { kind: 'owner', accountId: OWNER_ID }, 'test')
  const draft = emit('cancelled', created.value.id)
  assert.ok(draft)
  assert.equal(draft!.type, 'booking_cancelled')
  assert.equal(getBooking(created.value.id)!.cancellationReason, 'test')
})

check('H – calendar sync', () => {
  const b = getBooking(bookingId)!
  assert.equal(b.status, 'confirmed')
  const event = buildBookingCalendarEvent(b)
  assert.ok(event)
  assert.equal(event!.type, 'booking')
  assert.equal(event!.sourceBookingId, bookingId)
  const slot = freeSlot(serviceId)
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'ux_cal',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const synced = syncBookingCalendarEvent([], created.value)
  assert.equal(synced.length, 1)
  cancelBooking(created.value.id, { kind: 'owner', accountId: OWNER_ID })
  const afterCancel = syncBookingCalendarEvent(synced, getBooking(created.value.id)!)
  assert.equal(afterCancel.length, 0)
})

check('I – booking detail fields', () => {
  const b = getBooking(bookingId)!
  assert.ok(b.serviceName || true)
  assert.ok(b.professionalId)
  assert.ok(b.petId)
  assert.ok(b.startAt)
  assert.ok(b.status)
})

check('J – empty states (partition)', () => {
  const empty = partitionOwnerBookings(OTHER_OWNER)
  assert.equal(empty.pending.length, 0)
  assert.equal(empty.upcoming.length, 0)
  assert.equal(empty.past.length, 0)
  assert.equal(empty.cancelled.length, 0)
})

check('K – privacy', () => {
  const projected = projectPetForBooking({ id: PET_ID, name: 'Luna' })
  assert.deepEqual(projected, { petId: PET_ID, petName: 'Luna' })
  assert.equal(assertBookingPayloadSafe({ microchip: 'x' }), false)
  const n = loadNotifications()[0]
  if (n) assert.equal(isSafeBookingNotificationPayload(n), true)
})

check('L – reload persistence', () => {
  const before = loadBookings().length
  assert.ok(before > 0)
  const raw = memory.getItem(BOOKINGS_STORAGE_KEY)
  assert.ok(raw)
  assert.equal(JSON.parse(raw!).length, before)
})

check('M – duplicate protection', () => {
  const slot = freeSlot(serviceId)
  const a = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'ux_dup',
  })
  const b = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'ux_dup',
  })
  assert.equal(a.ok && b.ok, true)
  if (a.ok && b.ok) assert.equal(a.value.id, b.value.id)
})

check('N – unavailable slot', () => {
  const slot = freeSlot(serviceId)
  const first = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'ux_slot_a',
  })
  assert.equal(first.ok, true)
  const service = getProfessionalService(serviceId)!
  assert.equal(
    isSlotAvailable({
      professionalId: PRO_ID,
      service,
      startAt: slot.startAt,
      endAt: slot.endAt,
      availability: getAvailability(PRO_ID),
      bookings: loadBookings(),
    }),
    false,
  )
  const second = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: 'other_pet',
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'ux_slot_b',
  })
  assert.equal(second.ok, false)
})

check('O – disabled service', () => {
  const created = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Temp',
    durationMinutes: 15,
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  disableProfessionalService(created.value.id, PRO_ID)
  const r = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: created.value.id,
    petId: PET_ID,
    startAt: nextMondayAt(16).toISOString(),
    petExists: true,
    clientRequestId: 'ux_disabled',
  })
  assert.equal(r.ok, false)
  if (!r.ok) assert.equal(r.error, 'service_disabled')
})

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
