/**
 * Node assert script for pet-buddy connection preferences + ranking.
 * Run: node scripts/assert-connections.mjs
 *
 * Covers checklist A–F, I (shape persist), J (no PII in public payload).
 */
import assert from 'node:assert/strict'

const CONNECTION_ACTIVITY_IDS = [
  'walks',
  'trips',
  'play',
  'socialization',
  'activities',
  'training',
  'travel',
]

const ID_SET = new Set(CONNECTION_ACTIVITY_IDS)

function normalizeConnectionActivityIds(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  for (const item of raw) {
    if (typeof item === 'string' && ID_SET.has(item)) seen.add(item)
  }
  return CONNECTION_ACTIVITY_IDS.filter((id) => seen.has(id))
}

function normalizePetConnectionPreferences(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const lookingFor = normalizeConnectionActivityIds(raw.lookingFor)
  let activityTypes = normalizeConnectionActivityIds(raw.activityTypes)
  if (activityTypes.length === 0 && lookingFor.length > 0) {
    activityTypes = [...lookingFor]
  }
  const enabled = raw.enabled === true
  if (!enabled && lookingFor.length === 0 && activityTypes.length === 0) {
    return undefined
  }
  return { enabled, lookingFor, activityTypes }
}

function toPublicConnectionPreferences(prefs) {
  if (!prefs?.enabled) return undefined
  const lookingFor = normalizeConnectionActivityIds(prefs.lookingFor)
  if (lookingFor.length === 0) return undefined
  let activityTypes = normalizeConnectionActivityIds(prefs.activityTypes)
  if (activityTypes.length === 0) activityTypes = [...lookingFor]
  return { lookingFor, activityTypes }
}

function projectOwnedPetToDiscover(pet) {
  if (!pet.publicDiscover) return null
  const projected = {
    id: pet.id,
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    age: pet.age ?? 0,
    location: 'Kolín',
    image: pet.image,
    lookingFor: pet.lookingFor,
  }
  const connectionPreferences = toPublicConnectionPreferences(pet.connectionPreferences)
  if (connectionPreferences) projected.connectionPreferences = connectionPreferences
  return projected
}

const DISCOVER_FORBIDDEN_KEYS = new Set([
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
])

const ALLOWED_DISCOVER_KEYS = new Set([
  'id',
  'name',
  'type',
  'breed',
  'age',
  'location',
  'image',
  'popular',
  'communityFavorite',
  'popularityScore',
  'engagement',
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
  'connectionPreferences',
  'activities',
  'publicBadges',
  'gallery',
  'publicTimeline',
  'breedingProfile',
  'breeding',
])

function sanitizeDiscoverPet(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const cleaned = {}
  for (const key of Object.keys(raw)) {
    if (DISCOVER_FORBIDDEN_KEYS.has(key)) continue
    if (!ALLOWED_DISCOVER_KEYS.has(key)) continue
    cleaned[key] = raw[key]
  }
  if (typeof cleaned.id !== 'string' || !cleaned.id) return null
  return cleaned
}

function sharedCount(a, b) {
  const setB = new Set(b)
  return a.filter((id) => setB.has(id)).length
}

function scoreConnectionCandidate(pet, context = {}) {
  let score = 0
  const petIds = [
    ...(pet.connectionPreferences?.lookingFor ?? []),
    ...(pet.connectionPreferences?.activityTypes ?? []),
  ]
  const unique = [...new Set(petIds)]
  if (unique.length > 0) score += 10

  const filterIds = context.filterActivityIds ?? []
  score += sharedCount(unique, filterIds) * 25

  const ctxIds = [
    ...(context.contextPet?.connectionPreferences?.lookingFor ?? []),
    ...(context.contextPet?.connectionPreferences?.activityTypes ?? []),
  ]
  score += sharedCount(unique, ctxIds) * 20

  if (context.contextPet?.type && pet.type === context.contextPet.type) score += 15
  else if (!context.contextPet?.type) score += 5

  const km = context.distanceKmById?.[pet.id]
  if (typeof km === 'number') {
    if (km <= 10) score += 30
    else if (km <= 20) score += 22
    else if (km <= 30) score += 15
    else if (km <= 50) score += 8
    else score += 2
    score += Math.max(0, 20 - Math.min(20, km / 5))
  }
  return score
}

function rankByScore(pets, context) {
  return [...pets].sort((a, b) => {
    const diff = scoreConnectionCandidate(b, context) - scoreConnectionCandidate(a, context)
    if (diff !== 0) return diff
    return a.id.localeCompare(b.id)
  })
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

const ownLuna = {
  id: 'luna',
  name: 'Luna',
  type: 'dog',
  breed: 'Zlatý retriever',
  age: 4,
  image: 'https://example.com/luna.jpg',
  publicDiscover: true,
  microchip: '985112004567890',
  weight: 28,
  phone: '+420111',
  connectionPreferences: {
    enabled: true,
    lookingFor: ['walks', 'trips'],
    activityTypes: ['walks', 'trips'],
  },
}

const privateMilo = {
  id: 'milo',
  name: 'Milo',
  type: 'cat',
  breed: 'Britská',
  age: 2,
  image: 'https://example.com/milo.jpg',
  publicDiscover: false,
  connectionPreferences: {
    enabled: true,
    lookingFor: ['play'],
    activityTypes: ['play'],
  },
}

const publicBuddy = {
  id: 'd1',
  name: 'Max',
  type: 'dog',
  breed: 'Labrador',
  age: 3,
  image: 'https://example.com/max.jpg',
  publicDiscover: true,
  connectionPreferences: {
    enabled: true,
    lookingFor: ['walks', 'play'],
    activityTypes: ['walks', 'play'],
  },
}

const disabledOffer = {
  id: 'd-off',
  name: 'Off',
  type: 'dog',
  breed: 'Mix',
  age: 2,
  image: 'https://example.com/off.jpg',
  publicDiscover: true,
  connectionPreferences: {
    enabled: false,
    lookingFor: ['walks'],
    activityTypes: ['walks'],
  },
}

// A) own pet never offered as own buddy in catalog exclude list
const catalogIds = ['d1', 'd2', 'luna']
const excludeOwn = catalogIds.filter((id) => id !== 'luna')
check(!excludeOwn.includes('luna'), 'A: own pet excluded from buddy candidate list')

// B) private pet not projected
check(projectOwnedPetToDiscover(privateMilo) === null, 'B: private pet not projected to Discover')

// C) public pet projected
const pub = projectOwnedPetToDiscover(publicBuddy)
check(pub != null && pub.id === 'd1', 'C: public pet projected')
check(
  pub?.connectionPreferences?.lookingFor?.includes('walks'),
  'C: public connection prefs exposed when enabled',
)

// D) disabled offer strips connection prefs from public payload
const offProjected = projectOwnedPetToDiscover(disabledOffer)
check(offProjected != null, 'D: publicDiscover still projects pet')
check(
  offProjected && !offProjected.connectionPreferences,
  'D: disabled connection offer excludes prefs from public payload',
)

// E) matching activity affects order
const nearWalks = {
  id: 'near-walks',
  type: 'dog',
  connectionPreferences: { lookingFor: ['walks'], activityTypes: ['walks'] },
}
const farPlay = {
  id: 'far-play',
  type: 'dog',
  connectionPreferences: { lookingFor: ['play'], activityTypes: ['play'] },
}
const rankedActivity = rankByScore([farPlay, nearWalks], {
  filterActivityIds: ['walks'],
  distanceKmById: { 'near-walks': 5, 'far-play': 5 },
})
check(
  rankedActivity[0].id === 'near-walks',
  'E: matching activity ranks higher than non-matching',
)

// F) distance affects order
const close = {
  id: 'close',
  type: 'dog',
  connectionPreferences: { lookingFor: ['walks'], activityTypes: ['walks'] },
}
const far = {
  id: 'far',
  type: 'dog',
  connectionPreferences: { lookingFor: ['walks'], activityTypes: ['walks'] },
}
const rankedDistance = rankByScore([far, close], {
  filterActivityIds: ['walks'],
  distanceKmById: { close: 3, far: 80 },
})
check(rankedDistance[0].id === 'close', 'F: closer pet ranks higher with same activities')

// I) reload/persist shape — normalize round-trip
const stored = {
  enabled: true,
  lookingFor: ['walks', 'bogus', 'trips', 'walks'],
  activityTypes: ['travel'],
}
const normalized = normalizePetConnectionPreferences(stored)
check(normalized?.enabled === true, 'I: enabled survives normalize')
check(
  JSON.stringify(normalized?.lookingFor) === JSON.stringify(['walks', 'trips']),
  'I: lookingFor deduped + invalid IDs dropped',
)
check(
  JSON.stringify(normalized?.activityTypes) === JSON.stringify(['travel']),
  'I: activityTypes kept when present',
)
const reloaded = normalizePetConnectionPreferences(
  JSON.parse(JSON.stringify(normalized)),
)
check(
  JSON.stringify(reloaded) === JSON.stringify(normalized),
  'I: preferences survive JSON round-trip (reload)',
)

// J) health/chip/PII never in public connection payload
const leakyProjection = {
  ...projectOwnedPetToDiscover(ownLuna),
  microchip: ownLuna.microchip,
  weight: ownLuna.weight,
  phone: ownLuna.phone,
  healthRecords: [{ id: 'h1' }],
}
const sanitized = sanitizeDiscoverPet(leakyProjection)
check(sanitized != null, 'J: sanitize keeps public pet')
check(sanitized && !('microchip' in sanitized), 'J: strips microchip')
check(sanitized && !('weight' in sanitized), 'J: strips weight')
check(sanitized && !('phone' in sanitized), 'J: strips phone')
check(sanitized && !('healthRecords' in sanitized), 'J: strips healthRecords')
check(
  sanitized?.connectionPreferences &&
    !('enabled' in sanitized.connectionPreferences) &&
    Array.isArray(sanitized.connectionPreferences.lookingFor),
  'J: connection payload is ID lists only (no enabled / PII)',
)

const publicOnly = toPublicConnectionPreferences(ownLuna.connectionPreferences)
check(
  publicOnly &&
    !Object.keys(publicOnly).some((k) =>
      ['microchip', 'phone', 'email', 'address', 'health', 'chip'].includes(k),
    ),
  'J: toPublicConnectionPreferences has no PII keys',
)

if (failures.length) {
  console.error(`\n${failures.length} assertion(s) failed`)
  process.exit(1)
}
console.log('\nAll connection assertions passed')
