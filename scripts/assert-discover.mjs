/**
 * Node assert script for Discover privacy + distance helpers.
 * Run: node scripts/assert-discover.mjs
 *
 * Uses dynamic import of compiled logic via duplicated pure JS checks
 * so we don't need a separate Vitest stack.
 */
import assert from 'node:assert/strict'

const DISCOVER_FORBIDDEN_KEYS = [
  'microchip',
  'microchipNumber',
  'microchipVerification',
  'phone',
  'email',
  'address',
  'street',
  'postalCode',
  'weight',
  'healthRecords',
  'health',
  'medications',
  'documents',
  'privateNotes',
  'ownerPhone',
  'ownerEmail',
  'ownerAddress',
  'vetPhone',
  'emergencyContacts',
]

const ALLOWED_DISCOVER_KEYS = new Set([
  'id',
  'name',
  'type',
  'breed',
  'age',
  'location',
  'image',
  'popular',
  'distance',
  'verified',
  'ownerName',
  'ownerId',
  'bio',
  'gender',
  'personality',
  'likes',
  'dislikes',
  'lookingFor',
  'activities',
  'publicBadges',
  'gallery',
  'publicTimeline',
  'breedingProfile',
  'breeding',
])

const FORBIDDEN_SET = new Set(DISCOVER_FORBIDDEN_KEYS)

function collectForbiddenDiscoverKeys(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.keys(raw).filter((key) => FORBIDDEN_SET.has(key))
}

function sanitizeDiscoverPet(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const cleaned = {}
  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_SET.has(key)) continue
    if (!ALLOWED_DISCOVER_KEYS.has(key)) continue
    cleaned[key] = raw[key]
  }
  if (typeof cleaned.id !== 'string' || !cleaned.id) return null
  if (typeof cleaned.name !== 'string' || !cleaned.name) return null
  if (cleaned.type !== 'dog' && cleaned.type !== 'cat') return null
  if (typeof cleaned.breed !== 'string') return null
  if (typeof cleaned.age !== 'number') return null
  if (typeof cleaned.location !== 'string') return null
  if (typeof cleaned.image !== 'string') return null
  return cleaned
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const earthKm = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)))
}

function formatDiscoverDistanceKm(km) {
  if (!Number.isFinite(km) || km < 0) return ''
  if (km < 10) {
    const rounded = Math.round(km * 10) / 10
    return `${String(rounded).replace('.', ',')} km`
  }
  return `${Math.round(km)} km`
}

const failures = []
function check(cond, msg) {
  try {
    assert.ok(cond, msg)
    console.log('OK  :', msg)
  } catch (err) {
    failures.push(err.message)
    console.error('FAIL:', err.message)
  }
}

const basePet = {
  id: 'd-test',
  name: 'Test',
  type: 'dog',
  breed: 'Mix',
  age: 2,
  location: 'Kolín',
  image: 'https://example.com/dog.jpg',
  bio: 'Veřejný bio',
}

const leaky = {
  ...basePet,
  microchip: '985112004563210',
  phone: '+420777111222',
  email: 'owner@example.com',
  address: 'Ulice 12',
  weight: 12.5,
  healthRecords: [{ id: 'h1' }],
  medications: ['Apoquel'],
  documents: [{ id: 'doc1' }],
}

const forbidden = collectForbiddenDiscoverKeys(leaky)
check(forbidden.includes('microchip'), 'detects microchip leak key')
check(forbidden.includes('phone'), 'detects phone leak key')
check(forbidden.includes('email'), 'detects email leak key')
check(forbidden.includes('address'), 'detects address leak key')

const clean = sanitizeDiscoverPet(leaky)
check(clean != null, 'sanitize returns pet')
check(clean && !('microchip' in clean), 'strips microchip')
check(clean && !('phone' in clean), 'strips phone')
check(clean && !('email' in clean), 'strips email')
check(clean && !('address' in clean), 'strips address')
check(clean && !('weight' in clean), 'strips weight')
check(clean && !('healthRecords' in clean), 'strips healthRecords')
check(clean && !('medications' in clean), 'strips medications')
check(clean && clean.name === 'Test', 'keeps public name')
check(clean && clean.bio === 'Veřejný bio', 'keeps public bio')

check(sanitizeDiscoverPet({ ...basePet, type: 'bird' }) == null, 'rejects invalid type')
check(sanitizeDiscoverPet({ ...basePet, id: '' }) == null, 'rejects empty id')

const kolin = { latitude: 50.0281, longitude: 15.2006 }
const praha = { latitude: 50.0755, longitude: 14.4378 }
const km = haversineKm(kolin, praha)
check(km > 40 && km < 70, `Kolín–Praha distance in expected band (${km.toFixed(1)} km)`)
check(formatDiscoverDistanceKm(1.44) === '1,4 km', 'formats sub-10 km with comma')
check(formatDiscoverDistanceKm(12.4) === '12 km', 'formats larger distances as whole km')
check(!(km <= 30 + 0.05), 'Praha is outside 30 km nearby of Kolín')

const kutna = { latitude: 49.9484, longitude: 15.2682 }
const kmNearby = haversineKm(kolin, kutna)
check(kmNearby <= 30 + 0.05, `Kutná Hora is nearby Kolín (${kmNearby.toFixed(1)} km)`)

if (failures.length) {
  console.error(`\n${failures.length} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll discover assert checks passed')
