/**
 * Assert professional services + ceník (KROK 29).
 * Run: npx tsx scripts/assert-professional-services.mts
 *
 * A–T per product checklist.
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import { queryPublicProfessionals } from '../src/lib/professional/directory.ts'
import {
  activateProfessionalService,
  assertPublicServiceSafe,
  bookingDurationMinutes,
  bookingPriceLabel,
  bookingServiceName,
  completeBooking,
  confirmBooking,
  createBooking,
  createProfessionalService,
  disableProfessionalService,
  ensureDefaultAvailability,
  formatServicePrice,
  getAvailability,
  getAvailableSlots,
  getBooking,
  getProfessionalService,
  listBookableServices,
  listPublicServices,
  loadBookings,
  loadProfessionalServices,
  normalizeProfessionalService,
  saveBookings,
  suggestedServicesForRole,
  toPublicProfessionalService,
  updateProfessionalService,
  type ProfessionalService,
} from '../src/lib/booking/index.ts'
import {
  canCreateReview,
  createProfessionalReview,
  loadProfessionalReviews,
  saveProfessionalReviews,
} from '../src/lib/reviews/index.ts'

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

const PRO_ID = 'pro_services_vet'
const OWNER_ID = 'owner_self'
const PET_ID = 'pet_services_luna'

function seedIdentity() {
  memory.clear()
  saveAccounts([
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Majitel Services',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'pro_account_svc',
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'Vet Services Account',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([
    {
      id: PRO_ID,
      accountId: 'pro_account_svc',
      type: 'veterinarian',
      displayName: 'MVDr. Services Test',
      city: 'Brno',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalReviews([])
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

function firstFreeSlot(service: ProfessionalService) {
  ensureDefaultAvailability(PRO_ID)
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

console.log('KROK 29 – assert-professional-services')

seedIdentity()

let serviceId = ''
let bookingId = ''
let snapshotName = ''
let snapshotPrice = 0
let snapshotDuration = 0

check('A – vytvoření služby', () => {
  const result = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Preventivní prohlídka',
    description: 'Základní prohlídka',
    category: 'veterinary',
    durationMinutes: 30,
    priceType: 'fixed',
    price: 800,
    currency: 'CZK',
    publicVisibility: 'public',
    bookingEnabled: true,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  serviceId = result.value.id
  assert.equal(result.value.category, 'veterinary')
  assert.equal(result.value.priceType, 'fixed')
  assert.equal(result.value.publicVisibility, 'public')
})

check('B – úpravu služby', () => {
  const result = updateProfessionalService(
    serviceId,
    { description: 'Aktualizovaný popis', durationMinutes: 45 },
    PRO_ID,
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.description, 'Aktualizovaný popis')
  assert.equal(result.value.durationMinutes, 45)
})

check('C – deaktivaci', () => {
  const result = disableProfessionalService(serviceId, PRO_ID)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.active, false)
  assert.equal(listBookableServices(PRO_ID).length, 0)
})

check('D – aktivaci', () => {
  const result = activateProfessionalService(serviceId, PRO_ID)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.active, true)
  assert.ok(listBookableServices(PRO_ID).some((s) => s.id === serviceId))
})

check('E – public/private visibility', () => {
  updateProfessionalService(serviceId, { publicVisibility: 'private' }, PRO_ID)
  assert.equal(listPublicServices(PRO_ID).length, 0)
  assert.equal(listBookableServices(PRO_ID).length, 0)
  updateProfessionalService(serviceId, { publicVisibility: 'public' }, PRO_ID)
  assert.ok(listPublicServices(PRO_ID).some((s) => s.id === serviceId))
})

check('F – duration', () => {
  const s = getProfessionalService(serviceId)!
  assert.equal(s.durationMinutes, 45)
})

check('G – price fixed', () => {
  assert.equal(formatServicePrice(800, 'CZK', 'fixed').includes('800'), true)
  updateProfessionalService(
    serviceId,
    { priceType: 'fixed', price: 800, currency: 'CZK' },
    PRO_ID,
  )
  const s = getProfessionalService(serviceId)!
  assert.equal(s.priceType, 'fixed')
  assert.equal(s.price, 800)
})

check('H – price from', () => {
  updateProfessionalService(
    serviceId,
    { priceType: 'from', price: 600, currency: 'CZK' },
    PRO_ID,
  )
  const label = formatServicePrice(600, 'CZK', 'from')
  assert.ok(label.toLowerCase().startsWith('od'))
})

check('I – on request', () => {
  updateProfessionalService(
    serviceId,
    { priceType: 'on_request', price: undefined },
    PRO_ID,
  )
  const s = getProfessionalService(serviceId)!
  assert.equal(s.priceType, 'on_request')
  assert.equal(s.price, undefined)
  assert.equal(formatServicePrice(undefined, undefined, 'on_request'), 'Na dotaz')
  // restore bookable priced service for booking tests
  updateProfessionalService(
    serviceId,
    {
      priceType: 'fixed',
      price: 900,
      currency: 'CZK',
      durationMinutes: 30,
      publicVisibility: 'public',
      bookingEnabled: true,
      active: true,
    },
    PRO_ID,
  )
})

check('J – booking používá serviceId', () => {
  ensureDefaultAvailability(PRO_ID)
  const service = getProfessionalService(serviceId)!
  const slot = firstFreeSlot(service)
  snapshotName = service.name
  snapshotPrice = service.price!
  snapshotDuration = service.durationMinutes
  const result = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petName: 'Luna',
    petExists: true,
    clientRequestId: 'cr_svc_j',
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  bookingId = result.value.id
  assert.equal(result.value.serviceId, serviceId)
})

check('K – booking uloží snapshot', () => {
  const b = getBooking(bookingId)!
  assert.equal(b.serviceNameSnapshot, snapshotName)
  assert.equal(b.priceSnapshot, snapshotPrice)
  assert.equal(b.currencySnapshot, 'CZK')
  assert.equal(b.durationSnapshot, snapshotDuration)
  assert.equal(bookingServiceName(b), snapshotName)
  assert.ok(bookingPriceLabel(b))
  assert.equal(bookingDurationMinutes(b), snapshotDuration)
})

check('L – změna služby neovlivní starý booking', () => {
  updateProfessionalService(
    serviceId,
    { name: 'Nový název', price: 1500, durationMinutes: 90 },
    PRO_ID,
  )
  const b = getBooking(bookingId)!
  assert.equal(b.serviceNameSnapshot, snapshotName)
  assert.equal(b.priceSnapshot, snapshotPrice)
  assert.equal(b.durationSnapshot, snapshotDuration)
  const live = getProfessionalService(serviceId)!
  assert.equal(live.name, 'Nový název')
  assert.equal(live.price, 1500)
})

check('M – deaktivovaná služba nejde nově rezervovat', () => {
  updateProfessionalService(
    serviceId,
    { durationMinutes: snapshotDuration, active: false },
    PRO_ID,
  )
  const live = getProfessionalService(serviceId)!
  assert.equal(listBookableServices(PRO_ID).some((s) => s.id === serviceId), false)
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service: live,
    date: dateIsoLocal(nextMondayAt(10)),
    availability: getAvailability(PRO_ID),
    bookings: loadBookings(),
  })
  assert.equal(slots.length, 0)

  // Build a future start from availability window without using deactivated service slots
  const day = nextMondayAt(11)
  const startAt = day.toISOString()
  const attempt = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt,
    petExists: true,
    clientRequestId: 'cr_svc_m_should_fail',
  })
  assert.equal(attempt.ok, false)
  if (!attempt.ok) assert.equal(attempt.error, 'service_disabled')
})

check('N – aktivní služba jde rezervovat', () => {
  activateProfessionalService(serviceId, PRO_ID)
  updateProfessionalService(
    serviceId,
    {
      durationMinutes: 30,
      publicVisibility: 'public',
      bookingEnabled: true,
      priceType: 'fixed',
      price: 700,
    },
    PRO_ID,
  )
  const service = getProfessionalService(serviceId)!
  const slot = firstFreeSlot(service)
  const result = createBooking({
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId,
    petId: PET_ID,
    startAt: slot.startAt,
    petExists: true,
    clientRequestId: 'cr_svc_n',
  })
  assert.equal(result.ok, true)
})

check('O – availability respektuje délku služby', () => {
  const long = createProfessionalService({
    professionalId: PRO_ID,
    name: 'Dlouhá prohlídka',
    category: 'veterinary',
    durationMinutes: 120,
    priceType: 'fixed',
    price: 1200,
    currency: 'CZK',
    bookingBufferBeforeMinutes: 15,
    bookingBufferAfterMinutes: 15,
  })
  assert.equal(long.ok, true)
  if (!long.ok) return
  ensureDefaultAvailability(PRO_ID)
  const day = nextMondayAt(9)
  const slots = getAvailableSlots({
    professionalId: PRO_ID,
    service: long.value,
    date: dateIsoLocal(day),
    availability: getAvailability(PRO_ID),
    bookings: [],
  })
  assert.ok(slots.length > 0)
  for (const slot of slots) {
    const mins = Math.round(
      (Date.parse(slot.endAt) - Date.parse(slot.startAt)) / 60_000,
    )
    assert.equal(mins, 120)
  }
  // With 120 + 15 + 15 step, fewer slots than bare 30-min service
  const short = getProfessionalService(serviceId)!
  const shortSlots = getAvailableSlots({
    professionalId: PRO_ID,
    service: { ...short, durationMinutes: 30, bookingBufferBeforeMinutes: 0, bookingBufferAfterMinutes: 0 },
    date: dateIsoLocal(day),
    availability: getAvailability(PRO_ID),
    bookings: [],
  })
  assert.ok(shortSlots.length > slots.length)
})

check('P – privacy', () => {
  const service = getProfessionalService(serviceId)!
  const withNotes: ProfessionalService = {
    ...service,
    notes: 'interní náklad 200 Kč',
  }
  const pub = toPublicProfessionalService(withNotes)
  assert.equal(assertPublicServiceSafe(pub), true)
  assert.equal('professionalId' in pub, false)
  assert.equal('notes' in pub, false)
  assert.equal('accountId' in pub, false)
  assert.equal(pub.name, service.name)
})

check('Q – public catalog filter', () => {
  const byCategory = queryPublicProfessionals({
    serviceCategory: 'veterinary',
  })
  assert.ok(byCategory.some((p) => p.id === PRO_ID))

  const byPrice = queryPublicProfessionals({ maxPrice: 800 })
  assert.ok(byPrice.some((p) => p.id === PRO_ID))

  const byName = queryPublicProfessionals({ serviceQuery: 'Nový název' })
  assert.ok(byName.some((p) => p.id === PRO_ID))

  const tooCheap = queryPublicProfessionals({ maxPrice: 50 })
  assert.equal(
    tooCheap.some((p) => p.id === PRO_ID),
    false,
  )
})

check('R – role-specific service suggestions', () => {
  const vet = suggestedServicesForRole('veterinarian')
  assert.ok(vet.some((s) => s.name === 'Preventivní prohlídka'))
  assert.ok(vet.some((s) => s.name === 'Kontrola'))
  const groomer = suggestedServicesForRole('groomer')
  assert.ok(groomer.some((s) => s.name === 'Koupání'))
  const shelter = suggestedServicesForRole('shelter')
  assert.ok(shelter.every((s) => s.bookingEnabled === false))
  const breeder = suggestedServicesForRole('breeder')
  assert.ok(breeder.every((s) => s.bookingEnabled === false))
})

check('S – review flow zůstává funkční', () => {
  // Existing booking from J may be requested — confirm after reactivation
  activateProfessionalService(serviceId, PRO_ID)
  updateProfessionalService(
    serviceId,
    {
      active: true,
      bookingEnabled: true,
      publicVisibility: 'public',
      durationMinutes: snapshotDuration,
    },
    PRO_ID,
  )

  let target = getBooking(bookingId)!
  if (target.status === 'requested') {
    const confirmed = confirmBooking(bookingId, PRO_ID)
    assert.equal(confirmed.ok, true)
    target = getBooking(bookingId)!
  }
  if (target.status === 'confirmed') {
    const completed = completeBooking(bookingId, PRO_ID)
    assert.equal(completed.ok, true)
    target = getBooking(bookingId)!
  }
  if (target.status !== 'completed') {
    const service = getProfessionalService(serviceId)!
    const slot = firstFreeSlot(service)
    const created = createBooking({
      ownerAccountId: OWNER_ID,
      professionalId: PRO_ID,
      serviceId,
      petId: PET_ID,
      startAt: slot.startAt,
      petExists: true,
      clientRequestId: 'cr_svc_review',
    })
    assert.equal(created.ok, true)
    if (!created.ok) return
    assert.equal(confirmBooking(created.value.id, PRO_ID).ok, true)
    assert.equal(completeBooking(created.value.id, PRO_ID).ok, true)
    target = getBooking(created.value.id)!
  }

  const eligibility = canCreateReview(
    target,
    OWNER_ID,
    loadProfessionalReviews(),
  )
  assert.equal(eligibility.ok, true)
  const review = createProfessionalReview({
    bookingId: target.id,
    authorAccountId: OWNER_ID,
    rating: 5,
    text: 'Skvělá péče',
  })
  assert.equal(review.ok, true)
})

check('T – persistence po reloadu', () => {
  const before = loadProfessionalServices()
  assert.ok(before.length > 0)
  const raw = memory.getItem('lovedandknown.professionalServices')
  assert.ok(raw)
  memory.setItem('lovedandknown.professionalServices', raw!)
  const after = loadProfessionalServices()
  assert.equal(after.length, before.length)
  const normalized = normalizeProfessionalService(after[0])
  assert.ok(normalized)
  assert.ok(normalized!.category)
  assert.ok(normalized!.priceType)

  const bookingsRaw = memory.getItem('lovedandknown.bookings')
  assert.ok(bookingsRaw)
  const bookings = loadBookings()
  assert.ok(bookings.some((b) => b.serviceNameSnapshot || b.serviceName))
})

console.log(`\nPassed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
