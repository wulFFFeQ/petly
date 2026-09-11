/**
 * Assert professional availability (KROK 30).
 * Run: npx tsx scripts/assert-professional-availability.mts
 *
 * A–T per product checklist.
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import {
  assertPublicAvailabilitySafe,
  createBooking,
  createProfessionalService,
  ensureDefaultAvailability,
  findNextAvailableSlot,
  formatNextAvailableLabel,
  getAvailability,
  getAvailabilityExceptions,
  getAvailabilitySettings,
  getAvailableSlots,
  isSlotAvailable,
  listBookings,
  loadBookings,
  loadProfessionalAvailability,
  normalizeAvailabilityException,
  normalizeProfessionalAvailability,
  removeAvailabilityException,
  resolveDayWindows,
  saveBookings,
  saveProfessionalAvailability,
  setWeeklyAvailability,
  suggestedServicesForRole,
  toPublicNextAvailable,
  upsertAvailabilityException,
  type ProfessionalService,
} from '../src/lib/booking/index.ts'

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

const PRO_ID = 'pro_avail_vet'
const OWNER_ID = 'owner_self'
const PET_ID = 'pet_avail_luna'

function seedIdentity() {
  memory.clear()
  saveAccounts([
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Majitel Availability',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'pro_account_avail',
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'Vet Availability Account',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([
    {
      id: PRO_ID,
      accountId: 'pro_account_avail',
      type: 'veterinarian',
      displayName: 'MVDr. Availability Test',
      city: 'Praha',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveBookings([])
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

function makeService(overrides: Partial<ProfessionalService> & { name?: string } = {}): ProfessionalService {
  const result = createProfessionalService({
    professionalId: PRO_ID,
    name: overrides.name ?? 'Stříhání psa',
    category: 'grooming',
    durationMinutes: overrides.durationMinutes ?? 60,
    priceType: 'fixed',
    price: 500,
    currency: 'CZK',
    bookingEnabled: true,
    publicVisibility: 'public',
    bookingBufferBeforeMinutes: overrides.bookingBufferBeforeMinutes,
    bookingBufferAfterMinutes: overrides.bookingBufferAfterMinutes,
  })
  assert.equal(result.ok, true)
  return (result as { ok: true; value: ProfessionalService }).value
}

function defaultWeek(activeWeekdays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [0, 1, 2, 3, 4]) {
  const days = ([0, 1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
    weekday,
    active: activeWeekdays.includes(weekday),
    intervals: [{ startTime: '08:00', endTime: '16:00' }],
  }))
  const result = setWeeklyAvailability(PRO_ID, days)
  assert.equal(result.ok, true)
  return result
}

console.log('KROK 30 – assert-professional-availability')

seedIdentity()

check('A – pracovní den lze nastavit', () => {
  ensureDefaultAvailability(PRO_ID)
  const result = setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 1, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 2, active: true, intervals: [{ startTime: '10:00', endTime: '18:00' }] },
    { weekday: 3, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 4, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  assert.equal(result.ok, true)
  const mon = getAvailability(PRO_ID).find((a) => a.weekday === 0 && a.active)
  assert.ok(mon)
  assert.equal(mon!.startTime, '08:00')
  assert.equal(mon!.endTime, '16:00')
})

check('B – pracovní den lze vypnout', () => {
  defaultWeek([0, 1, 2, 3])
  const sat = getAvailability(PRO_ID).find((a) => a.weekday === 5)
  assert.ok(sat)
  assert.equal(sat!.active, false)
  const monday = nextMondayAt(10)
  // Move to Saturday of that week
  const satDate = new Date(monday)
  satDate.setDate(satDate.getDate() + 5)
  const service = makeService()
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date: dateIsoLocal(satDate),
    availability: getAvailability(PRO_ID),
    bookings: [],
  })
  assert.equal(slots.length, 0)
})

check('C – pracovní hodiny lze změnit', () => {
  defaultWeek()
  const result = setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: true, intervals: [{ startTime: '10:00', endTime: '14:00' }] },
    { weekday: 1, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 2, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 3, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 4, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  assert.equal(result.ok, true)
  const mon = getAvailability(PRO_ID).find((a) => a.weekday === 0)
  assert.equal(mon!.startTime, '10:00')
  assert.equal(mon!.endTime, '14:00')
})

check('D – persistence po reloadu', () => {
  defaultWeek()
  const before = JSON.stringify(loadProfessionalAvailability())
  const reloaded = JSON.parse(localStorage.getItem('lovedandknown.professionalAvailability')!)
  assert.ok(Array.isArray(reloaded))
  assert.ok(reloaded.length > 0)
  assert.equal(JSON.stringify(loadProfessionalAvailability()), before)
})

check('E – více intervalů za den', () => {
  const result = setWeeklyAvailability(PRO_ID, [
    {
      weekday: 0,
      active: true,
      intervals: [
        { startTime: '08:00', endTime: '12:00' },
        { startTime: '13:00', endTime: '17:00' },
      ],
    },
    { weekday: 1, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 2, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 3, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 4, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  assert.equal(result.ok, true)
  const monRows = getAvailability(PRO_ID).filter((a) => a.weekday === 0 && a.active)
  assert.equal(monRows.length, 2)

  const service = makeService({ durationMinutes: 60 })
  const date = dateIsoLocal(nextMondayAt(9))
  const windows = resolveDayWindows(PRO_ID, date, getAvailability(PRO_ID), [])
  assert.equal(windows.length, 2)
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  assert.ok(slots.some((s) => new Date(s.startAt).getHours() === 8))
  assert.ok(slots.some((s) => new Date(s.startAt).getHours() === 13))
  assert.ok(!slots.some((s) => new Date(s.startAt).getHours() === 12))
})

check('F – closed exception', () => {
  defaultWeek()
  const date = dateIsoLocal(nextMondayAt(9))
  const result = upsertAvailabilityException({
    professionalId: PRO_ID,
    date,
    type: 'closed',
    label: 'Dovolená',
  })
  assert.equal(result.ok, true)
  const service = makeService()
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    exceptions: getAvailabilityExceptions(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  assert.equal(slots.length, 0)
})

check('G – custom_hours exception', () => {
  defaultWeek()
  const date = dateIsoLocal(nextMondayAt(9))
  // clear previous
  for (const ex of getAvailabilityExceptions(PRO_ID)) {
    removeAvailabilityException(PRO_ID, ex.id)
  }
  const result = upsertAvailabilityException({
    professionalId: PRO_ID,
    date,
    type: 'custom_hours',
    startTime: '09:00',
    endTime: '12:00',
    label: 'Školení ráno',
  })
  assert.equal(result.ok, true)
  const service = makeService({ durationMinutes: 60 })
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    exceptions: getAvailabilityExceptions(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  assert.ok(slots.length > 0)
  assert.ok(slots.every((s) => new Date(s.startAt).getHours() < 12))
  assert.ok(!slots.some((s) => new Date(s.startAt).getHours() >= 13))
})

check('H – exception přepisuje weekly availability', () => {
  defaultWeek()
  const date = dateIsoLocal(nextMondayAt(9))
  for (const ex of getAvailabilityExceptions(PRO_ID)) {
    removeAvailabilityException(PRO_ID, ex.id)
  }
  upsertAvailabilityException({
    professionalId: PRO_ID,
    date,
    type: 'closed',
    label: 'Státní svátek',
  })
  const windows = resolveDayWindows(
    PRO_ID,
    date,
    getAvailability(PRO_ID),
    getAvailabilityExceptions(PRO_ID),
  )
  assert.equal(windows.length, 0)
  // Without exception would be open
  const weekly = resolveDayWindows(PRO_ID, date, getAvailability(PRO_ID), [])
  assert.ok(weekly.length > 0)
})

check('I – service duration respektována', () => {
  defaultWeek()
  for (const ex of getAvailabilityExceptions(PRO_ID)) {
    removeAvailabilityException(PRO_ID, ex.id)
  }
  const service = makeService({ durationMinutes: 60 })
  const date = dateIsoLocal(nextMondayAt(9))
  // hours 08–16
  setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 1, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 2, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 3, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 4, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  const last = slots[slots.length - 1]!
  assert.equal(new Date(last.startAt).getHours(), 15)
  assert.equal(new Date(last.startAt).getMinutes(), 0)
})

check('J – buffer respektován', () => {
  setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 1, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 2, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 3, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 4, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  const service = makeService({
    durationMinutes: 60,
    bookingBufferAfterMinutes: 15,
  })
  const date = dateIsoLocal(nextMondayAt(9))
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  // step = 75 min → 08:00, 09:15, 10:30...
  assert.ok(slots.length >= 2)
  const t0 = new Date(slots[0]!.startAt)
  const t1 = new Date(slots[1]!.startAt)
  assert.equal(t0.getHours(), 8)
  assert.equal(t0.getMinutes(), 0)
  assert.equal(t1.getHours(), 9)
  assert.equal(t1.getMinutes(), 15)
})

check('K – booking blokuje překryv', () => {
  setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 1, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 2, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 3, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 4, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  const service = makeService({ durationMinutes: 60 })
  const date = dateIsoLocal(nextMondayAt(9))
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  const first = slots[0]!
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: service.id,
    petId: PET_ID,
    startAt: first.startAt,
    petName: 'Luna',
  })
  assert.equal(created.ok, true)
  const after = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: loadBookings(),
    now: new Date(0),
  })
  assert.ok(!after.some((s) => s.startAt === first.startAt))
})

check('L – requested booking blokuje překryv', () => {
  const bookings = listBookings({ professionalId: PRO_ID })
  assert.ok(bookings.some((b) => b.status === 'requested'))
  const blocking = bookings.find((b) => b.status === 'requested')!
  const service = makeService({ durationMinutes: 60, name: 'Overlap L' })
  assert.equal(
    isSlotAvailable({
      professionalId: PRO_ID,
      service,
      startAt: blocking.startAt,
      endAt: blocking.endAt,
      availability: getAvailability(PRO_ID),
      bookings: loadBookings(),
      now: new Date(0),
    }),
    false,
  )
})

check('M – confirmed booking blokuje překryv', () => {
  const service = makeService({ durationMinutes: 60, name: 'Overlap M' })
  const date = dateIsoLocal(nextMondayAt(9))
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: loadBookings(),
    now: new Date(0),
  })
  assert.ok(slots.length > 0)
  const slot = slots[0]!
  const created = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: service.id,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
  })
  assert.equal(created.ok, true)
  const all = loadBookings()
  const idx = all.findIndex((b) => b.id === (created as { ok: true; value: { id: string } }).value.id)
  all[idx] = { ...all[idx]!, status: 'confirmed', confirmedAt: new Date().toISOString() }
  saveBookings(all)
  assert.equal(
    isSlotAvailable({
      professionalId: PRO_ID,
      service,
      startAt: slot.startAt,
      endAt: slot.endAt,
      availability: getAvailability(PRO_ID),
      bookings: loadBookings(),
      now: new Date(0),
    }),
    false,
  )
})

check('N – poslední slot nepřesahuje pracovní dobu', () => {
  setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: true, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 1, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 2, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 3, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 4, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  saveBookings([])
  const service = makeService({ durationMinutes: 60, name: 'Last slot' })
  const date = dateIsoLocal(nextMondayAt(9))
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  for (const s of slots) {
    const end = new Date(s.endAt)
    assert.ok(end.getHours() < 16 || (end.getHours() === 16 && end.getMinutes() === 0))
  }
  assert.ok(!slots.some((s) => new Date(s.startAt).getHours() === 15 && new Date(s.startAt).getMinutes() === 30))
})

check('O – nedostupný den nezobrazuje sloty', () => {
  setWeeklyAvailability(PRO_ID, [
    { weekday: 0, active: false, intervals: [{ startTime: '08:00', endTime: '16:00' }] },
    { weekday: 1, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 2, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 3, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 4, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 5, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
    { weekday: 6, active: false, intervals: [{ startTime: '09:00', endTime: '17:00' }] },
  ])
  const service = makeService({ name: 'Closed week' })
  const date = dateIsoLocal(nextMondayAt(9))
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  assert.equal(slots.length, 0)
})

check('P – veřejný booking vidí pouze skutečné sloty', () => {
  defaultWeek()
  const date = dateIsoLocal(nextMondayAt(9))
  upsertAvailabilityException({
    professionalId: PRO_ID,
    date,
    type: 'closed',
    label: 'Interní dovolená',
  })
  const service = makeService({ name: 'Public slots' })
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    exceptions: getAvailabilityExceptions(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  assert.equal(slots.length, 0)
  const next = findNextAvailableSlot({
    professionalId: PRO_ID,
    service,
    availability: getAvailability(PRO_ID),
    exceptions: getAvailabilityExceptions(PRO_ID),
    bookings: [],
    now: new Date(0),
    fromDate: date,
    horizonDays: 14,
  })
  // next may be Tuesday if Monday closed
  if (next) {
    assert.notEqual(dateIsoLocal(new Date(next.startAt)), date)
  }
})

check('Q – create booking znovu ověří dostupnost', () => {
  defaultWeek()
  for (const ex of getAvailabilityExceptions(PRO_ID)) {
    removeAvailabilityException(PRO_ID, ex.id)
  }
  saveBookings([])
  const service = makeService({ name: 'Re-check' })
  const date = dateIsoLocal(nextMondayAt(9))
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service,
    date,
    availability: getAvailability(PRO_ID),
    bookings: [],
    now: new Date(0),
  })
  const slot = slots[0]!
  const first = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: service.id,
    petId: PET_ID,
    startAt: slot.startAt,
  })
  assert.equal(first.ok, true)
  const second = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: service.id,
    petId: 'pet_avail_other',
    startAt: slot.startAt,
  })
  assert.equal(second.ok, false)
  assert.equal((second as { ok: false; error: string }).error, 'slot_unavailable')
})

check('R – privacy', () => {
  const ex = normalizeAvailabilityException({
    id: 'avx_1',
    professionalId: PRO_ID,
    date: '2026-09-15',
    type: 'closed',
    label: 'Dovolená',
  })
  assert.ok(ex)
  assert.equal(ex!.label, 'Dovolená')
  assert.equal(assertPublicAvailabilitySafe({ label: 'Dovolená' }), false)
  assert.equal(assertPublicAvailabilitySafe({ employeeId: 'x' }), false)
  const slot = {
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 3600000).toISOString(),
  }
  const pub = toPublicNextAvailable(slot, formatNextAvailableLabel(slot))
  assert.ok(pub)
  assert.equal(assertPublicAvailabilitySafe(pub), true)
  assert.ok(!('Dovolená' in Object.values(pub)))
  assert.equal('when' in pub, true)
})

check('S – role-specific behavior', () => {
  for (const role of [
    'veterinarian',
    'veterinary_clinic',
    'groomer',
    'trainer',
    'pet_hotel',
    'pet_service',
  ] as const) {
    const suggestions = suggestedServicesForRole(role)
    assert.ok(suggestions.length > 0)
    assert.ok(suggestions.some((s) => s.bookingEnabled !== false))
  }
  for (const role of ['shelter', 'breeder'] as const) {
    const suggestions = suggestedServicesForRole(role)
    assert.ok(suggestions.every((s) => s.bookingEnabled === false))
  }
})

check('T – persistence + timezone settings + normalize legacy', () => {
  defaultWeek()
  const settings = getAvailabilitySettings(PRO_ID)
  assert.ok(settings.timezone)
  const legacy = normalizeProfessionalAvailability({
    id: 'av_legacy',
    professionalId: PRO_ID,
    weekday: 2,
    startTime: '09:00',
    endTime: '17:00',
  })
  assert.ok(legacy)
  assert.equal(legacy!.active, true)
  saveProfessionalAvailability([
    ...loadProfessionalAvailability().filter((a) => a.professionalId !== PRO_ID),
    ...getAvailability(PRO_ID),
  ])
  const raw = localStorage.getItem('lovedandknown.professionalAvailability')
  assert.ok(raw)
  assert.ok(JSON.parse(raw!).length > 0)
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
