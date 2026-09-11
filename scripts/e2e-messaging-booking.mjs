/**
 * E2E: Booking messaging (KROK 32)
 * Run: node scripts/e2e-messaging-booking.mjs
 * Requires: npm run dev
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = path.join(process.cwd(), 'scripts', 'e2e-artifacts')
const failures = []

function assert(cond, msg) {
  if (!cond) {
    failures.push(msg)
    console.error('FAIL:', msg)
  } else {
    console.log('OK  :', msg)
  }
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({
    path: path.join(OUT, `messaging-booking-${name}.png`),
    fullPage: true,
  })
}

const OWNER_ID = 'owner_self'
const PRO_ACCOUNT = 'e2e_msg_pro_account'
const PRO_ID = 'e2e_msg_vet'
const PET_ID = 'e2e_msg_luna'
const SERVICE_ID = 'e2e_msg_svc'
const BOOKING_ID = 'e2e_msg_booking'
const FOREIGN_CONV = 'conv_foreign_acl'

function daysFromNow(offset, hour = 10) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function endOf(startIso, minutes = 30) {
  const d = new Date(startIso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

const startAt = daysFromNow(8, 14)

const SEED_ACCOUNT = {
  id: OWNER_ID,
  kind: 'consumer',
  roles: ['owner', 'veterinarian'],
  displayName: 'E2E Msg Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILE = {
  id: PRO_ID,
  accountId: OWNER_ID,
  type: 'veterinarian',
  displayName: 'E2E Msg Vet',
  verificationStatus: 'unverified',
  publicVisibility: 'public',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_SERVICE = {
  id: SERVICE_ID,
  professionalId: PRO_ID,
  name: 'Kontrola',
  durationMinutes: 30,
  category: 'veterinary',
  priceType: 'fixed',
  price: 500,
  currency: 'CZK',
  publicVisibility: 'public',
  active: true,
  bookingEnabled: true,
  isDemo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_BOOKING = {
  id: BOOKING_ID,
  ownerAccountId: OWNER_ID,
  professionalId: PRO_ID,
  serviceId: SERVICE_ID,
  petId: PET_ID,
  startAt,
  endAt: endOf(startAt),
  status: 'confirmed',
  petName: 'Luna',
  professionalName: 'E2E Msg Vet',
  serviceNameSnapshot: 'Kontrola',
  ownerDisplayName: 'E2E Msg Owner',
  confirmedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const FOREIGN_THREAD = {
  id: FOREIGN_CONV,
  name: 'Cizí majitel',
  avatar: '',
  role: 'Veterinář',
  petContext: 'Cizí · Služba',
  contactType: 'professional',
  lastMessage: 'tajemství',
  time: '',
  unread: 0,
  messages: [],
  participantAccountIds: ['other_owner', 'other_pro'],
  bookingId: 'bkg_foreign',
  professionalId: 'pro_foreign',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.addInitScript(
    ({ account, profile, service, booking, foreign, petId }) => {
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.selfAccountId', account.id)
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify([profile]))
      localStorage.setItem('lovedandknown.professionalServices', JSON.stringify([service]))
      localStorage.setItem('lovedandknown.bookings', JSON.stringify([booking]))
      localStorage.setItem('lovedandknown.inboxConversations', JSON.stringify([foreign]))
      sessionStorage.setItem('lovedandknown.e2e', '1')
      // minimal pet for booking detail display
      const pets = [
        {
          id: petId,
          name: 'Luna',
          type: 'dog',
          breed: 'Labradorský retrívr',
          age: 3,
          gender: 'female',
          weight: 28,
          avatar:
            'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=200&q=80',
        },
      ]
      localStorage.setItem('lovedandknown.pets', JSON.stringify(pets))
    },
    {
      account: SEED_ACCOUNT,
      profile: SEED_PROFILE,
      service: SEED_SERVICE,
      booking: SEED_BOOKING,
      foreign: FOREIGN_THREAD,
      petId: PET_ID,
    },
  )

  try {
    await page.goto(`${BASE}/bookings/${BOOKING_ID}`, { waitUntil: 'networkidle' })
    await shot(page, 'booking-detail')

    const section = page.getByTestId('booking-communication-section')
    assert(await section.isVisible(), 'communication section visible')
    assert(await page.getByTestId('booking-communication-empty').isVisible(), 'empty state')

    await page.getByTestId('booking-communication-cta').click()
    await page.waitForURL(/\/messages/)
    await shot(page, 'messages-opened')

    const composer = page.getByTestId('booking-message-composer')
    assert(await composer.isVisible(), 'booking composer visible')
    assert(await page.getByTestId('booking-context-banner').isVisible(), 'booking context banner')

    await page.getByTestId('booking-message-input').fill('Ahoj z E2E')
    await page.getByTestId('booking-message-send').click()
    await page.waitForTimeout(300)
    assert(
      await page.getByTestId('chat-thread').getByText('Ahoj z E2E').isVisible(),
      'sent message appears in thread',
    )

    // Denied direct URL
    await page.goto(`${BASE}/messages?conversationId=${FOREIGN_CONV}`, {
      waitUntil: 'networkidle',
    })
    await shot(page, 'denied')
    assert(await page.getByTestId('messaging-denied').isVisible(), 'ACL deny on foreign conversation')

    // Mobile-ish viewport list → detail
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/bookings/${BOOKING_ID}`, { waitUntil: 'networkidle' })
    await page.getByTestId('booking-communication-cta').click()
    await page.waitForURL(/\/messages/)
    await shot(page, 'mobile-messages')
    assert(await page.getByTestId('booking-message-composer').isVisible(), 'mobile composer')
  } catch (err) {
    failures.push(String(err))
    console.error(err)
    await shot(page, 'error')
  } finally {
    await browser.close()
  }

  console.log(`\nE2E messaging-booking: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${failures.length} failures)`)
  if (failures.length) process.exit(1)
}

main()
