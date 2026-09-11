/**
 * Assert booking engine (KROK 25).
 * Run: npx tsx scripts/assert-booking.mts
 *
 * A – vytvoření služby
 * B – dostupnost slotů
 * C – vytvoření rezervace
 * D – requested status
 * E – confirm
 * F – decline
 * G – cancel owner
 * H – cancel professional
 * I – overlap protection
 * J – privacy
 * K – persistence po reloadu
 * L – notification creation
 * M – duplicate guard
 * N – service disabled
 * O – minulý termín
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  BOOKINGS_STORAGE_KEY,
  assertBookingPayloadSafe,
  cancelBooking,
  confirmBooking,
  createBooking,
  createProfessionalService,
  declineBooking,
  disableProfessionalService,
  ensureDefaultAvailability,
  formatServicePrice,
  getAvailability,
  getAvailableSlots,
  getBooking,
  getProfessionalService,
  isSlotAvailable,
  listBookings,
  listProfessionalServices,
  loadBookings,
  projectPetForBooking,
} from '../src/lib/booking/index.ts'
import {
  bookingDedupeKey,
  buildBookingNotification,
  emitBookingNotification,
  isSafeBookingNotificationPayload,
  loadNotifications,
  migrateNotificationList,
  saveNotifications,
  upsertNotification,
} from '../src/lib/notifications/index.ts'
import type { Booking } from '../src/lib/booking/types.ts'

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

const PRO_ID = 'pro_booking_vet'
const OWNER_ID = 'owner_self'
const PET_ID = 'pet_booking_luna'

function seedIdentity() {
  memory.clear()
  saveAccounts([
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Majitel Test',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'pro_account_1',
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'Vet Account',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([
    {
      id: PRO_ID,
      accountId: 'pro_account_1',
      type: 'veterinarian',
      displayName: 'MVDr. Booking Test',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveNotifications([])
}

/** Next Monday at local hour:minute, at least ~14 days ahead. */
function nextMondayAt(hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
  d.setHours(hour, minute, 0, 0)
  return d
}

function dateIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function firstFreeSlot(serviceId: string) {
  const service = getProfessionalService(serviceId)!
  const avail = getAvailability(PRO_ID)
  for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
    const day = nextMondayAt(9, 0)
    day.setDate(day.getDate() + weekOffset * 7)
    const date = dateIsoLocal(day)
    const slots = getAvailableSlots({
      professionalId: PRO_ID,
      service,
      date,
      availability: avail,
      bookings: loadBookings(),
    })
    if (slots.length > 0) return slots[0]!
  }
  throw new Error('no free slot')
}

console.log('KROK 25 – assert-booking')

seedIdentity()

let serviceId = ''
let bookingId = ''

check('A – vytvoření služby', () => {
  const result = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Preventivní prohlídka',
    description: 'Základní prohlídka',
    durationMinutes: 30,
    price: 800,
    currency: 'CZK',
    bookingEnabled: true,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  serviceId = result.value.id
  assert.equal(result.value.name, 'Preventivní prohlídka')
  assert.equal(listProfessionalServices(PRO_ID).length, 1)
})

check('B – dostupnost slotů', () => {
  ensureDefaultAvailability(PRO_ID)
  const avail = getAvailability(PRO_ID)
  assert.ok(avail.some((a) => a.active && a.weekday === 0))
  const service = getProfessionalService(serviceId)!
  const day = nextMondayAt(10, 0)
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date: dateIsoLocal(day),
    availability: avail,
    bookings: [],
    now: new Date(),
  })
  assert.ok(slots.length > 0, 'expected slots on a weekday')
  assert.ok(
    isSlotAvailable({
      professionalId: PRO_ID,
      service,
      startAt: slots[0]!.startAt,
      endAt: slots[0]!.endAt,
      availability: avail,
      bookings: [],
    }),
  )
})

check('C – vytvoření rezervace', () => {
  const slot = firstFreeSlot(serviceId)
  const result = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    professionalName: 'MVDr. Booking Test',
    ownerDisplayName: 'Majitel Test',
    petExists: true,
    clientRequestId: 'cr_assert_1',
    note: 'Kontrola',
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  bookingId = result.value.id
  assert.equal(result.value.petId, PET_ID)
  assert.equal(result.value.serviceId, serviceId)
})

check('D – requested status', () => {
  const b = getBooking(bookingId)!
  assert.equal(b.status, 'requested')
})

check('E – confirm', () => {
  const result = confirmBooking(bookingId, PRO_ID)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.status, 'confirmed')
  assert.ok(result.value.confirmedAt)
})

check('F – decline', () => {
  const slot = firstFreeSlot(serviceId)
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'cr_decline_1',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const declined = declineBooking(created.value.id, PRO_ID)
  assert.equal(declined.ok, true)
  if (!declined.ok) return
  assert.equal(declined.value.status, 'declined')
})

check('G – cancel owner', () => {
  const slot = firstFreeSlot(serviceId)
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'cr_cancel_owner',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const cancelled = cancelBooking(
    created.value.id,
    { kind: 'owner', accountId: OWNER_ID },
    'změna plánů',
  )
  assert.equal(cancelled.ok, true)
  if (!cancelled.ok) return
  assert.equal(cancelled.value.status, 'cancelled_by_owner')
})

check('H – cancel professional', () => {
  const confirmed = getBooking(bookingId)!
  assert.equal(confirmed.status, 'confirmed')
  const cancelled = cancelBooking(
    bookingId,
    { kind: 'professional', professionalId: PRO_ID },
    'nemoc',
  )
  assert.equal(cancelled.ok, true)
  if (!cancelled.ok) return
  assert.equal(cancelled.value.status, 'cancelled_by_professional')
})

check('I – overlap protection', () => {
  const slot = firstFreeSlot(serviceId)
  const first = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'cr_overlap_a',
  })
  assert.equal(first.ok, true)
  const second = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: 'pet_other',
    startAt: slot.startAt,
    petName: 'Rex',
    petExists: true,
    clientRequestId: 'cr_overlap_b',
  })
  assert.equal(second.ok, false)
  if (!second.ok) assert.equal(second.error, 'slot_unavailable')
})

check('J – privacy', () => {
  const projected = projectPetForBooking({
    id: PET_ID,
    name: 'Luna',
  })
  assert.deepEqual(projected, { petId: PET_ID, petName: 'Luna' })
  assert.equal(assertBookingPayloadSafe(projected), true)
  assert.equal(assertBookingPayloadSafe({ microchip: 'x', petId: PET_ID }), false)
  const any = listBookings({ professionalId: PRO_ID })[0]!
  const draft = buildBookingNotification({
    booking: any,
    event: 'requested',
    professional: {
      id: PRO_ID,
      accountId: 'pro_account_1',
      displayName: 'MVDr. Booking Test',
    },
  })
  assert.ok(draft)
  assert.equal(isSafeBookingNotificationPayload(draft), true)
  const text = JSON.stringify(draft)
  assert.equal(/microchip/i.test(text), false)
  assert.equal(/ownerContacts/i.test(text), false)
  assert.equal(formatServicePrice(undefined), 'Na dotaz')
})

check('K – persistence po reloadu', () => {
  const before = loadBookings().length
  assert.ok(before > 0)
  const raw = memory.getItem(BOOKINGS_STORAGE_KEY)
  assert.ok(raw)
  const reloaded = JSON.parse(raw!) as Booking[]
  assert.equal(reloaded.length, before)
  assert.equal(loadBookings().length, before)
})

check('L – notification creation', () => {
  saveNotifications([])
  const b = listBookings({ professionalId: PRO_ID }).find((x) => x.status === 'requested')
  assert.ok(b)
  const draft = emitBookingNotification(
    (d) => {
      const next = upsertNotification(loadNotifications(), d)
      saveNotifications(migrateNotificationList(next))
    },
    {
      booking: b!,
      event: 'requested',
      professional: {
        id: PRO_ID,
        accountId: 'pro_account_1',
        displayName: 'MVDr. Booking Test',
      },
    },
  )
  assert.ok(draft)
  assert.equal(draft!.type, 'booking_requested')
  assert.equal(draft!.dedupeKey, bookingDedupeKey('requested', b!.id))
  assert.equal(
    loadNotifications().filter((n) => n.dedupeKey === draft!.dedupeKey).length,
    1,
  )
  emitBookingNotification(
    (d) => {
      const next = upsertNotification(loadNotifications(), d)
      saveNotifications(migrateNotificationList(next))
    },
    {
      booking: b!,
      event: 'requested',
      professional: {
        id: PRO_ID,
        accountId: 'pro_account_1',
        displayName: 'MVDr. Booking Test',
      },
    },
  )
  assert.equal(
    loadNotifications().filter((n) => n.dedupeKey === draft!.dedupeKey).length,
    1,
  )
})

check('M – duplicate guard', () => {
  const slot = firstFreeSlot(serviceId)
  const a = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'cr_dup_same',
  })
  assert.equal(a.ok, true)
  if (!a.ok) return
  const b = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'cr_dup_same',
  })
  assert.equal(b.ok, true)
  if (!b.ok) return
  assert.equal(a.value.id, b.value.id)
})

check('N – service disabled', () => {
  const created = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Dočasná',
    durationMinutes: 20,
    bookingEnabled: true,
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  disableProfessionalService(created.value.id, PRO_ID)
  const result = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: created.value.id,
    petId: PET_ID,
    startAt: nextMondayAt(16, 0).toISOString(),
    petExists: true,
    clientRequestId: 'cr_disabled',
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'service_disabled')
})

check('O – minulý termín', () => {
  const past = new Date()
  past.setDate(past.getDate() - 2)
  past.setHours(10, 0, 0, 0)
  const result = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: past.toISOString(),
    petExists: true,
    clientRequestId: 'cr_past',
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, 'past_slot')
})

check('security – cizí professionalId nemůže potvrdit', () => {
  const slot = firstFreeSlot(serviceId)
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'cr_sec_confirm',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const bad = confirmBooking(created.value.id, 'wrong_pro')
  assert.equal(bad.ok, false)
  if (!bad.ok) assert.equal(bad.error, 'forbidden')
})

console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
