/**
 * Assert booking rules (KROK 31).
 * Run: npx tsx scripts/assert-booking-rules.mts
 *
 * A–U per product checklist.
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  BOOKINGS_STORAGE_KEY,
  PROFESSIONAL_BOOKING_POLICIES_STORAGE_KEY,
  addMinutesIso,
  assertBookingPayloadSafe,
  buildBookingCalendarEvent,
  buildSeedBookings,
  canOwnerCancelByPolicy,
  cancelBooking,
  completeBooking,
  confirmBooking,
  createBooking,
  createProfessionalService,
  ensureDefaultAvailability,
  ensureDefaultBookingPolicy,
  formatCancellationPolicyPublic,
  formatOwnerCancelPolicyHint,
  getAvailability,
  getAvailableSlots,
  getBooking,
  getBookingPolicy,
  getProfessionalService,
  isSlotAvailable,
  listBookings,
  loadBookingPolicies,
  loadBookings,
  markNoShow,
  normalizeBooking,
  removeBookingCalendarEvent,
  rescheduleBooking,
  saveBookings,
  setBookingPolicy,
  syncBookingCalendarEvent,
} from '../src/lib/booking/index.ts'
import { canCreateReview } from '../src/lib/reviews/index.ts'
import {
  bookingDedupeKey,
  buildBookingNotification,
  emitBookingNotification,
  isSafeBookingNotificationPayload,
  loadNotifications,
  saveNotifications,
  upsertNotification,
} from '../src/lib/notifications/index.ts'
import type { CalendarEvent } from '../src/types/index.ts'
import type { NotificationDraft } from '../src/lib/notifications/model.ts'

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

const PRO_ID = 'pro_rules_vet'
const PRO_ACCOUNT = 'pro_account_rules'
const OWNER_ID = 'owner_self'
const PET_ID = 'pet_rules_luna'

function seedIdentity() {
  memory.clear()
  saveAccounts([
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Majitel Rules',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: PRO_ACCOUNT,
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'Vet Rules Account',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([
    {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      type: 'veterinarian',
      displayName: 'MVDr. Rules Test',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      city: 'Praha',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveNotifications([])
  saveBookings([])
  ensureDefaultBookingPolicy(PRO_ID)
}

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

function freeSlots(serviceId: string, count = 2) {
  const service = getProfessionalService(serviceId)!
  const avail = getAvailability(PRO_ID)
  const found: { startAt: string; endAt: string }[] = []
  for (let weekOffset = 0; weekOffset < 6 && found.length < count; weekOffset++) {
    const day = nextMondayAt(9, 0)
    day.setDate(day.getDate() + weekOffset * 7)
    const slots = getAvailableSlots({
      professionalId: PRO_ID,
      service,
      date: dateIsoLocal(day),
      availability: avail,
      bookings: loadBookings(),
    })
    for (const slot of slots) {
      if (found.some((f) => f.startAt === slot.startAt)) continue
      found.push(slot)
      if (found.length >= count) break
    }
  }
  if (found.length < count) throw new Error(`need ${count} free slots, got ${found.length}`)
  return found
}

function createService(): string {
  const result = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Kontrola rules',
    durationMinutes: 30,
    price: 500,
    currency: 'CZK',
    bookingEnabled: true,
  })
  assert.equal(result.ok, true)
  if (!result.ok) throw new Error('service create failed')
  ensureDefaultAvailability(PRO_ID)
  return result.value.id
}

function requestAt(serviceId: string, startAt: string, clientRequestId: string) {
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId,
  })
  assert.equal(created.ok, true)
  if (!created.ok) throw new Error(created.message)
  return created.value
}

console.log('\n=== assert-booking-rules (KROK 31) ===\n')

seedIdentity()
const serviceId = createService()

check('A – owner can cancel requested', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_a')
  const cancelled = cancelBooking(booking.id, { kind: 'owner', accountId: OWNER_ID })
  assert.equal(cancelled.ok, true)
  if (!cancelled.ok) return
  assert.equal(cancelled.value.status, 'cancelled_by_owner')
})

check('B – owner can cancel confirmed (within policy)', () => {
  setBookingPolicy(PRO_ID, { cancellationNoticeHours: 24 })
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_b')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  const cancelled = cancelBooking(booking.id, { kind: 'owner', accountId: OWNER_ID })
  assert.equal(cancelled.ok, true)
  if (!cancelled.ok) return
  assert.equal(cancelled.value.status, 'cancelled_by_owner')
})

check('C – professional can cancel requested', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_c')
  const cancelled = cancelBooking(
    booking.id,
    { kind: 'professional', professionalId: PRO_ID },
    { reasonCode: 'cannot_fulfill' },
  )
  assert.equal(cancelled.ok, true)
  if (!cancelled.ok) return
  assert.equal(cancelled.value.status, 'cancelled_by_professional')
  assert.equal(cancelled.value.cancellationReasonCode, 'cannot_fulfill')
})

check('D – professional can cancel confirmed', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_d')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  const cancelled = cancelBooking(
    booking.id,
    { kind: 'professional', professionalId: PRO_ID },
    { reasonCode: 'illness', reason: 'Chřipka' },
  )
  assert.equal(cancelled.ok, true)
  if (!cancelled.ok) return
  assert.equal(cancelled.value.status, 'cancelled_by_professional')
})

check('E – professional cancellation requires reason', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_e')
  const failedCancel = cancelBooking(booking.id, {
    kind: 'professional',
    professionalId: PRO_ID,
  })
  assert.equal(failedCancel.ok, false)
  if (failedCancel.ok) return
  assert.equal(failedCancel.error, 'reason_required')
})

check('F – owner cancellation respects policy', () => {
  setBookingPolicy(PRO_ID, { cancellationNoticeHours: 24 })
  const start = new Date()
  start.setHours(start.getHours() + 6)
  const booking = {
    id: 'bkg_policy_near',
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: start.toISOString(),
    endAt: addMinutesIso(start.toISOString(), 30),
    status: 'confirmed' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  }
  saveBookings([booking, ...loadBookings().filter((b) => b.id !== booking.id)])
  const policy = ensureDefaultBookingPolicy(PRO_ID)
  const checkResult = canOwnerCancelByPolicy(booking, policy)
  assert.equal(checkResult.allowed, false)
  assert.equal(checkResult.reason, 'within_notice_window')
  assert.match(formatOwnerCancelPolicyHint(checkResult), /méně než 24/)
  const blocked = cancelBooking(booking.id, { kind: 'owner', accountId: OWNER_ID })
  assert.equal(blocked.ok, false)
  if (blocked.ok) return
  assert.equal(blocked.error, 'policy_blocked')

  const reqStart = new Date()
  reqStart.setHours(reqStart.getHours() + 3)
  const requested = {
    ...booking,
    id: 'bkg_policy_req',
    status: 'requested' as const,
    startAt: reqStart.toISOString(),
    endAt: addMinutesIso(reqStart.toISOString(), 30),
  }
  saveBookings([requested, ...loadBookings().filter((b) => b.id !== requested.id)])
  const okReq = cancelBooking(requested.id, { kind: 'owner', accountId: OWNER_ID })
  assert.equal(okReq.ok, true)
})

check('G – reschedule checks availability', () => {
  setBookingPolicy(PRO_ID, { allowReschedule: true })
  const [a, b] = freeSlots(serviceId, 2)
  const booking = requestAt(serviceId, a.startAt, 'cr_g')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  const moved = rescheduleBooking({
    bookingId: booking.id,
    newStartAt: b.startAt,
    actor: { kind: 'owner', accountId: OWNER_ID },
  })
  assert.equal(moved.ok, true)
  if (!moved.ok) return
  assert.equal(moved.value.startAt, b.startAt)
  assert.equal(moved.value.originalStartAt, a.startAt)
  assert.ok(moved.value.rescheduledAt)
})

check('H – reschedule rejects unavailable slot', () => {
  const [a, b] = freeSlots(serviceId, 2)
  const first = requestAt(serviceId, a.startAt, 'cr_h1')
  assert.equal(confirmBooking(first.id, PRO_ID).ok, true)
  const second = requestAt(serviceId, b.startAt, 'cr_h2')
  assert.equal(confirmBooking(second.id, PRO_ID).ok, true)
  const rejected = rescheduleBooking({
    bookingId: first.id,
    newStartAt: b.startAt,
    actor: { kind: 'professional', professionalId: PRO_ID },
  })
  assert.equal(rejected.ok, false)
  if (rejected.ok) return
  assert.equal(rejected.error, 'slot_unavailable')
})

check('I – old slot becomes available after reschedule', () => {
  const [a, b] = freeSlots(serviceId, 2)
  const booking = requestAt(serviceId, a.startAt, 'cr_i')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  assert.equal(
    rescheduleBooking({
      bookingId: booking.id,
      newStartAt: b.startAt,
      actor: { kind: 'owner', accountId: OWNER_ID },
    }).ok,
    true,
  )
  const service = getProfessionalService(serviceId)!
  assert.equal(
    isSlotAvailable({
      professionalId: PRO_ID,
      service,
      startAt: a.startAt,
      endAt: a.endAt,
      availability: getAvailability(PRO_ID),
      bookings: loadBookings(),
    }),
    true,
  )
})

check('J – new slot becomes occupied after reschedule', () => {
  const [a, b] = freeSlots(serviceId, 2)
  const booking = requestAt(serviceId, a.startAt, 'cr_j')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  assert.equal(
    rescheduleBooking({
      bookingId: booking.id,
      newStartAt: b.startAt,
      actor: { kind: 'owner', accountId: OWNER_ID },
    }).ok,
    true,
  )
  const service = getProfessionalService(serviceId)!
  assert.equal(
    isSlotAvailable({
      professionalId: PRO_ID,
      service,
      startAt: b.startAt,
      endAt: b.endAt,
      availability: getAvailability(PRO_ID),
      bookings: loadBookings(),
    }),
    false,
  )
})

check('K – cancelled booking does not block slot', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_k')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  assert.equal(
    cancelBooking(booking.id, { kind: 'owner', accountId: OWNER_ID }).ok,
    true,
  )
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
    true,
  )
})

check('L – no_show is not completed', () => {
  const past = new Date()
  past.setHours(past.getHours() - 2)
  const booking = {
    id: 'bkg_ns_l',
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: past.toISOString(),
    endAt: addMinutesIso(past.toISOString(), 30),
    status: 'confirmed' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  }
  saveBookings([booking, ...loadBookings().filter((b) => b.id !== booking.id)])
  const marked = markNoShow(booking.id, PRO_ID)
  assert.equal(marked.ok, true)
  if (!marked.ok) return
  assert.equal(marked.value.status, 'no_show')
  assert.notEqual(marked.value.status, 'completed')
  assert.ok(marked.value.noShowAt)
})

check('M – no_show cannot be reviewed', () => {
  const ns = getBooking('bkg_ns_l')!
  assert.equal(ns.status, 'no_show')
  assert.equal(canCreateReview(ns, OWNER_ID, []).ok, false)
})

check('N – cancelled booking cannot be reviewed', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_n')
  assert.equal(
    cancelBooking(booking.id, { kind: 'owner', accountId: OWNER_ID }).ok,
    true,
  )
  const cancelled = getBooking(booking.id)!
  assert.equal(canCreateReview(cancelled, OWNER_ID, []).ok, false)
})

check('O – completed booking can be reviewed', () => {
  const past = new Date()
  past.setHours(past.getHours() - 1)
  const booking = {
    id: 'bkg_done_o',
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: past.toISOString(),
    endAt: addMinutesIso(past.toISOString(), 30),
    status: 'confirmed' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  }
  saveBookings([booking, ...loadBookings().filter((b) => b.id !== booking.id)])
  const done = completeBooking(booking.id, PRO_ID)
  assert.equal(done.ok, true)
  if (!done.ok) return
  assert.equal(done.value.status, 'completed')
  assert.equal(canCreateReview(done.value, OWNER_ID, []).ok, true)

  const future = new Date()
  future.setDate(future.getDate() + 3)
  const early = {
    ...booking,
    id: 'bkg_early_o',
    startAt: future.toISOString(),
    endAt: addMinutesIso(future.toISOString(), 30),
    status: 'confirmed' as const,
  }
  saveBookings([early, ...loadBookings().filter((b) => b.id !== early.id)])
  const blocked = completeBooking(early.id, PRO_ID)
  assert.equal(blocked.ok, false)
  if (blocked.ok) return
  assert.equal(blocked.error, 'too_early')
})

check('P – notifications emitted correctly', () => {
  saveNotifications([])
  const [a, b] = freeSlots(serviceId, 2)
  const booking = requestAt(serviceId, a.startAt, 'cr_p')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  const cancelDraft = buildBookingNotification({
    booking: getBooking(booking.id)!,
    event: 'cancelled',
    professional: { id: PRO_ID, accountId: PRO_ACCOUNT, displayName: 'MVDr. Rules Test' },
    cancelledBy: 'owner',
  })
  assert.ok(cancelDraft)
  assert.equal(cancelDraft!.type, 'booking_cancelled')
  assert.ok(!/Chřipka|illness|cancellationReason/i.test(JSON.stringify(cancelDraft)))

  const moved = rescheduleBooking({
    bookingId: booking.id,
    newStartAt: b.startAt,
    actor: { kind: 'professional', professionalId: PRO_ID },
  })
  assert.equal(moved.ok, true)
  if (!moved.ok) return
  const reschedDraft = buildBookingNotification({
    booking: moved.value,
    event: 'rescheduled',
    professional: { id: PRO_ID, accountId: PRO_ACCOUNT, displayName: 'MVDr. Rules Test' },
    rescheduledBy: 'professional',
  })
  assert.ok(reschedDraft)
  assert.equal(reschedDraft!.type, 'booking_rescheduled')
  assert.equal(reschedDraft!.recipientAccountId, OWNER_ID)
  emitBookingNotification(
    (d: NotificationDraft) => {
      saveNotifications(upsertNotification(loadNotifications(), d))
    },
    {
      booking: moved.value,
      event: 'rescheduled',
      professional: { id: PRO_ID, accountId: PRO_ACCOUNT, displayName: 'MVDr. Rules Test' },
      rescheduledBy: 'professional',
    },
  )
  assert.ok(isSafeBookingNotificationPayload(reschedDraft))
})

check('Q – notification dedupe works', () => {
  saveNotifications([])
  const booking = listBookings({ professionalId: PRO_ID })[0]!
  const draft = buildBookingNotification({
    booking,
    event: 'rescheduled',
    professional: { id: PRO_ID, accountId: PRO_ACCOUNT, displayName: 'MVDr. Rules Test' },
    rescheduledBy: 'owner',
  })
  assert.ok(draft)
  let list = upsertNotification([], draft!)
  list = upsertNotification(list, draft!)
  saveNotifications(list)
  const loaded = loadNotifications()
  const matches = loaded.filter(
    (n) => n.dedupeKey === bookingDedupeKey('rescheduled', booking.id),
  )
  assert.equal(matches.length, 1)
})

check('R – calendar reflects current booking state', () => {
  const [slot] = freeSlots(serviceId, 1)
  const booking = requestAt(serviceId, slot.startAt, 'cr_r')
  assert.equal(confirmBooking(booking.id, PRO_ID).ok, true)
  let events: CalendarEvent[] = []
  events = syncBookingCalendarEvent(events, getBooking(booking.id)!)
  assert.ok(events.some((e) => e.sourceBookingId === booking.id))
  assert.equal(cancelBooking(booking.id, { kind: 'owner', accountId: OWNER_ID }).ok, true)
  const cancelled = getBooking(booking.id)!
  assert.equal(buildBookingCalendarEvent(cancelled), null)
  events = removeBookingCalendarEvent(events, booking.id)
  assert.equal(events.filter((e) => e.sourceBookingId === booking.id).length, 0)
})

check('S – persistence after reload', () => {
  setBookingPolicy(PRO_ID, { cancellationNoticeHours: 48, allowReschedule: false })
  const rawBookings = memory.getItem(BOOKINGS_STORAGE_KEY)
  const rawPolicies = memory.getItem(PROFESSIONAL_BOOKING_POLICIES_STORAGE_KEY)
  assert.ok(rawBookings)
  assert.ok(rawPolicies)
  const parsed = JSON.parse(rawBookings!) as unknown[]
  assert.ok(parsed.length > 0)
  const normalized = parsed.map((x) => normalizeBooking(x)).filter(Boolean)
  assert.ok(normalized.length > 0)
  const policy = getBookingPolicy(PRO_ID)
  assert.equal(policy?.cancellationNoticeHours, 48)
  assert.equal(policy?.allowReschedule, false)
  const reloaded = loadBookingPolicies()
  assert.equal(reloaded.find((p) => p.professionalId === PRO_ID)?.cancellationNoticeHours, 48)
})

check('T – privacy', () => {
  const publicLine = formatCancellationPolicyPublic({ cancellationNoticeHours: 24 })
  assert.equal(publicLine, 'Rušení rezervace je možné do 24 hodin před termínem.')
  assert.ok(!/cancellationReason|illness|employee|microchip/i.test(publicLine))
  const payload = {
    serviceName: 'Kontrola',
    petName: 'Luna',
    startAt: new Date().toISOString(),
  }
  assert.equal(assertBookingPayloadSafe(payload), true)
  assert.equal(assertBookingPayloadSafe({ ...payload, microchip: '123' }), false)
  const seed = buildSeedBookings({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
  })
  assert.ok(seed.some((b) => b.status === 'requested'))
  assert.ok(seed.some((b) => b.status === 'confirmed'))
  assert.ok(seed.some((b) => b.status === 'completed'))
  assert.ok(seed.some((b) => b.status === 'cancelled_by_owner'))
  assert.ok(seed.some((b) => b.status === 'cancelled_by_professional'))
  assert.ok(seed.some((b) => b.status === 'no_show'))
})

check('U – regression core booking + policy defaults', () => {
  setBookingPolicy(PRO_ID, { cancellationNoticeHours: 24, allowReschedule: true })
  const policy = ensureDefaultBookingPolicy(PRO_ID)
  assert.equal(policy.confirmMode, 'manual')
  assert.equal(policy.noShowMode, 'after_start')
  const [slot] = freeSlots(serviceId, 1)
  const created = requestAt(serviceId, slot.startAt, 'cr_u')
  assert.equal(created.status, 'requested')
  assert.equal(confirmBooking(created.id, PRO_ID).ok, true)
  assert.equal(getBooking(created.id)?.status, 'confirmed')
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
