/**
 * Assert professional reviews (KROK 28).
 * Run: npx tsx scripts/assert-professional-reviews.mts
 *
 * A/F – completed → accepted
 * B – requested → rejected
 * C – confirmed → rejected
 * D – cancelled → rejected
 * E – declined → rejected
 * G – duplicate → rejected
 * H – rating 1–5
 * I – privacy
 * J – verified experience
 * K – reply
 * L – report
 * M – catalog rating
 * N – rating filter
 * O – persistence
 * P – notifications
 * Q – DEMO exclusion
 */
import assert from 'node:assert/strict'
import {
  saveAccounts,
  saveProfessionalProfiles,
} from '../src/lib/professional/storage.ts'
import { queryPublicProfessionals as queryCatalog } from '../src/lib/professional/directory.ts'
import {
  BOOKINGS_STORAGE_KEY,
  createBookingId,
  loadBookings,
  saveBookings,
  type Booking,
  type BookingStatus,
} from '../src/lib/booking/index.ts'
import {
  PROFESSIONAL_REVIEWS_STORAGE_KEY,
  assertPublicReviewSafe,
  canCreateReview,
  createProfessionalReview,
  getProfessionalReviewSummary,
  getProfessionalReviews,
  loadProfessionalReviews,
  replyToProfessionalReview,
  reportProfessionalReview,
  saveProfessionalReviews,
  submitProfessionalReview,
  toPublicProfessionalReview,
  toSafeReviewAuthorDisplayName,
} from '../src/lib/reviews/index.ts'
import {
  buildProfessionalReviewNotification,
  emitProfessionalReviewNotification,
  isSafeReviewNotificationPayload,
  loadNotifications,
  migrateNotificationList,
  reviewDedupeKey,
  saveNotifications,
  upsertNotification,
} from '../src/lib/notifications/index.ts'
import { clearDemoPlan, setDemoPlan } from '../src/lib/entitlements/demo.ts'

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

const PRO_ID = 'pro_review_vet'
const PRO_ACCOUNT = 'pro_account_review'
const OWNER_ID = 'owner_self'

function seedIdentity() {
  memory.clear()
  saveAccounts([
    {
      id: OWNER_ID,
      kind: 'consumer',
      roles: ['owner'],
      displayName: 'Jana Nováková',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: PRO_ACCOUNT,
      kind: 'professional',
      roles: ['veterinarian'],
      displayName: 'MVDr. Review Pro',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveProfessionalProfiles([
    {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      type: 'veterinarian',
      displayName: 'MVDr. Review Test',
      verificationStatus: 'unverified',
      publicVisibility: 'public',
      city: 'Brno',
      services: ['Kontrola'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  saveNotifications([])
  saveProfessionalReviews([])
  saveBookings([])
}

function seedBooking(status: BookingStatus, suffix: string): Booking {
  const now = new Date().toISOString()
  const booking: Booking = {
    id: createBookingId(`bkg_${suffix}`),
    ownerAccountId: OWNER_ID,
    professionalId: PRO_ID,
    serviceId: `svc_${suffix}`,
    petId: 'pet_review_luna',
    startAt: '2026-06-01T10:00:00.000Z',
    endAt: '2026-06-01T10:30:00.000Z',
    status,
    serviceName: 'Kontrola',
    petName: 'Luna',
    professionalName: 'MVDr. Review Test',
    createdAt: now,
    updatedAt: now,
  }
  if (status === 'completed') booking.completedAt = now
  if (status === 'confirmed') booking.confirmedAt = now
  if (status === 'declined') booking.declinedAt = now
  if (status === 'cancelled_by_owner' || status === 'cancelled_by_professional') {
    booking.cancelledAt = now
  }
  saveBookings([booking, ...loadBookings()])
  return booking
}

console.log('\n=== assert-professional-reviews ===\n')

check('A/F – completed booking → accepted', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'a')
  const result = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
    title: 'Skvělé',
    text: 'Profesionální péče.',
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.rating, 5)
  assert.equal(result.value.status, 'published')
  assert.equal(result.value.bookingId, booking.id)
  assert.equal(result.value.professionalId, PRO_ID)
})

check('B – requested booking → rejected', () => {
  seedIdentity()
  const booking = seedBooking('requested', 'b')
  const result = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 4,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, 'booking_not_eligible')
})

check('C – confirmed booking → rejected', () => {
  seedIdentity()
  const booking = seedBooking('confirmed', 'c')
  const result = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 4,
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error, 'booking_not_eligible')
})

check('D – cancelled booking → rejected', () => {
  seedIdentity()
  const booking = seedBooking('cancelled_by_owner', 'd')
  const result = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 3,
  })
  assert.equal(result.ok, false)
})

check('E – declined booking → rejected', () => {
  seedIdentity()
  const booking = seedBooking('declined', 'e')
  const result = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 2,
  })
  assert.equal(result.ok, false)
})

check('G – druhá review ze stejného bookingu → rejected', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'g')
  const first = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
  })
  assert.equal(first.ok, true)
  const second = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 4,
  })
  assert.equal(second.ok, false)
  if (second.ok) return
  assert.equal(second.error, 'duplicate_review')
})

check('H – rating pouze 1–5', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'h')
  for (const bad of [0, 6, 3.5, -1, NaN]) {
    const result = createProfessionalReview({
      bookingId: booking.id,
      authorAccountId: OWNER_ID,
      rating: bad,
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error, 'invalid_rating')
  }
})

check('I – review privacy', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'i')
  const created = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
    text: 'Výborná péče.',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const pub = toPublicProfessionalReview(created.value)
  assert.ok(pub)
  assert.equal(assertPublicReviewSafe(pub), true)
  const json = JSON.stringify(pub)
  assert.equal(json.includes('"bookingId"'), false)
  assert.equal(json.includes('"authorAccountId"'), false)
  assert.equal(json.includes('microchip'), false)
  assert.equal(json.includes(OWNER_ID), false)
  assert.ok(pub!.authorDisplayName)
  assert.notEqual(pub!.authorDisplayName, OWNER_ID)
  assert.equal(toSafeReviewAuthorDisplayName('Jana Nováková'), 'Jana N.')
})

check('J – verified experience badge pouze z completed booking', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'j')
  assert.equal(canCreateReview(booking, OWNER_ID, []).ok, true)
  const created = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 4,
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  assert.equal(toPublicProfessionalReview(created.value)?.verifiedExperience, true)
  assert.equal(canCreateReview(null, OWNER_ID, []).ok, false)
  const confirmed = seedBooking('confirmed', 'j2')
  assert.equal(canCreateReview(confirmed, OWNER_ID, []).ok, false)
})

check('K – professional reply', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'k')
  const created = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 3,
    text: 'Bylo to průměrné.',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const replied = replyToProfessionalReview({
    reviewId: created.value.id,
    professionalId: PRO_ID,
    text: 'Děkujeme za návštěvu a zpětnou vazbu.',
  })
  assert.equal(replied.ok, true)
  if (!replied.ok) return
  assert.equal(replied.value.rating, created.value.rating)
  assert.equal(replied.value.text, created.value.text)
  assert.ok(replied.value.reply?.text.includes('Děkujeme'))
})

check('L – report', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'l')
  const created = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 1,
    text: 'Špatná zkušenost.',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  const reported = reportProfessionalReview({
    reviewId: created.value.id,
    reporterAccountId: PRO_ACCOUNT,
    reason: 'offensive',
  })
  assert.equal(reported.ok, true)
  if (!reported.ok) return
  assert.equal(reported.value.status, 'reported')
  assert.equal(reported.value.reportReason, 'offensive')
  assert.ok(reported.value.reportedAt)
  assert.notEqual(reported.value.status, 'removed')
})

check('M – catalog rating (reálná data)', () => {
  seedIdentity()
  let summary = getProfessionalReviewSummary(PRO_ID)
  assert.equal(summary.count, 0)
  assert.equal(summary.average, null)

  const booking = seedBooking('completed', 'm')
  createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
  })
  summary = getProfessionalReviewSummary(PRO_ID)
  assert.equal(summary.count, 1)
  assert.equal(summary.average, 5)
  assert.ok(summary.confidenceScore != null)

  const cards = queryCatalog({})
  const card = cards.find((c) => c.id === PRO_ID)
  assert.ok(card)
  assert.equal(card!.reviewSummary?.count, 1)
  assert.equal(card!.reviewSummary?.average, 5)
})

check('N – rating filter', () => {
  seedIdentity()
  const noneCards = queryCatalog({ minRating: 'none' })
  assert.ok(noneCards.some((c) => c.id === PRO_ID))

  const booking = seedBooking('completed', 'n')
  createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 4,
  })
  const high = queryCatalog({ minRating: 4.5 })
  assert.equal(high.some((c) => c.id === PRO_ID), false)
  const mid = queryCatalog({ minRating: 4.0 })
  assert.ok(mid.some((c) => c.id === PRO_ID))
})

check('O – reload persistence', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'o')
  const created = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
    title: 'Persist',
  })
  assert.equal(created.ok, true)
  assert.ok(memory.getItem(PROFESSIONAL_REVIEWS_STORAGE_KEY))
  const reloaded = loadProfessionalReviews()
  assert.equal(reloaded.length, 1)
  assert.equal(reloaded[0]!.title, 'Persist')
  assert.ok(loadBookings().some((b) => b.id === booking.id))
  assert.ok(memory.getItem(BOOKINGS_STORAGE_KEY))
})

check('P – notifications', () => {
  seedIdentity()
  saveNotifications([])
  const booking = seedBooking('completed', 'p')
  let list = loadNotifications()
  const upsert = (draft: Parameters<typeof upsertNotification>[1]) => {
    list = upsertNotification(list, draft)
    saveNotifications(list)
  }
  const result = submitProfessionalReview(
    {
      bookingId: booking.id,
      authorAccountId: OWNER_ID,
      rating: 5,
    },
    { upsertNotification: upsert },
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  list = migrateNotificationList(loadNotifications())
  const received = list.find(
    (n) => n.dedupeKey === reviewDedupeKey('received', result.value.id),
  )
  assert.ok(received)
  assert.equal(received!.type, 'professional_review_received')
  assert.equal(received!.title, 'Nové hodnocení')
  assert.equal(received!.recipientAccountId, PRO_ACCOUNT)
  assert.ok(isSafeReviewNotificationPayload(received))

  replyToProfessionalReview({
    reviewId: result.value.id,
    professionalId: PRO_ID,
    text: 'Děkujeme!',
  })
  assert.ok(
    buildProfessionalReviewNotification({
      event: 'reply',
      review: {
        ...result.value,
        reply: {
          text: 'Děkujeme!',
          repliedAt: new Date().toISOString(),
          professionalId: PRO_ID,
        },
      },
      professional: {
        id: PRO_ID,
        accountId: PRO_ACCOUNT,
        displayName: 'MVDr. Review Test',
      },
    }),
  )
  emitProfessionalReviewNotification(upsert, {
    event: 'reply',
    review: {
      ...result.value,
      reply: {
        text: 'Děkujeme!',
        repliedAt: new Date().toISOString(),
        professionalId: PRO_ID,
      },
    },
    professional: {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      displayName: 'MVDr. Review Test',
    },
  })
  list = loadNotifications()
  assert.ok(list.find((n) => n.dedupeKey === reviewDedupeKey('reply', result.value.id)))
  emitProfessionalReviewNotification(upsert, {
    event: 'received',
    review: result.value,
    professional: {
      id: PRO_ID,
      accountId: PRO_ACCOUNT,
      displayName: 'MVDr. Review Test',
    },
  })
  assert.equal(
    loadNotifications().filter(
      (n) => n.dedupeKey === reviewDedupeKey('received', result.value.id),
    ).length,
    1,
  )
})

check('Q – DEMO review není prezentována jako skutečná', () => {
  seedIdentity()
  const booking = seedBooking('completed', 'q')
  const demo = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
    isDemo: true,
  })
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  assert.equal(demo.value.isDemo, true)
  const summary = getProfessionalReviewSummary(PRO_ID)
  assert.equal(summary.count, 0)
  assert.equal(summary.average, null)
  assert.equal(toPublicProfessionalReview(demo.value), null)
  assert.equal(getProfessionalReviews(PRO_ID).length, 0)
  const card = queryCatalog({}).find((c) => c.id === PRO_ID)
  assert.ok(card)
  assert.equal(card!.reviewSummary?.count ?? 0, 0)
})

check('Membership – review není paywalled (Free)', () => {
  seedIdentity()
  clearDemoPlan()
  setDemoPlan('free')
  const booking = seedBooking('completed', 'free')
  const result = createProfessionalReview({
    bookingId: booking.id,
    authorAccountId: OWNER_ID,
    rating: 5,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const reply = replyToProfessionalReview({
    reviewId: result.value.id,
    professionalId: PRO_ID,
    text: 'Omlouváme se.',
  })
  assert.equal(reply.ok, true)
  if (!reply.ok) return
  assert.equal(reply.value.rating, 5)
  assert.notEqual(reply.value.status, 'removed')
})

console.log(`\nPassed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
