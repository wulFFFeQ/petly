/**
 * Node assert script for Community helpers (location + storage migration rules).
 * Run: node scripts/assert-community.mjs
 */

function roundPublicCoords(lat, lng) {
  return {
    publicLat: Math.round(lat * 1000) / 1000,
    publicLng: Math.round(lng * 1000) / 1000,
  }
}

function toSafePublicLabel(label) {
  const trimmed = label.trim()
  if (!trimmed) return 'Přibližná lokalita'

  const withoutNumber = trimmed
    .replace(/\b\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .trim()

  const parts = withoutNumber
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return 'Přibližná lokalita'
  if (parts.length === 1) return parts[0]

  const city = parts[parts.length - 1]
  const area = parts[0]
  if (area.toLowerCase() === city.toLowerCase()) return city
  return `${city} – ${area}`
}

function toCommunityPublicLocation(label, latitude, longitude) {
  const location = toSafePublicLabel(label)
  if (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const { publicLat, publicLng } = roundPublicCoords(latitude, longitude)
    return { location, locationLat: publicLat, locationLng: publicLng }
  }
  return { location }
}

function normalizeCommentsCount(post) {
  const comments = Array.isArray(post.comments) ? post.comments : []
  return { ...post, comments, commentsCount: comments.length }
}

/** Missing key → seed. Stored [] stays []. Never re-append seed ids. */
function loadPostsMigration(raw, seed) {
  if (raw === null) return seed.map((p) => normalizeCommentsCount(p))
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return seed.map((p) => normalizeCommentsCount(p))
  }
  if (!Array.isArray(parsed)) return seed.map((p) => normalizeCommentsCount(p))
  return parsed.map((item) => {
    const seedMatch = seed.find((s) => s.id === item.id)
    return normalizeCommentsCount({ ...seedMatch, ...item })
  })
}

const failures = []
function check(cond, msg) {
  if (!cond) {
    failures.push(msg)
    console.error('FAIL:', msg)
  } else {
    console.log('OK  :', msg)
  }
}

const seed = [
  { id: 'p1', text: 'seed1', comments: [{ id: 'c1' }, { id: 'c2' }], commentsCount: 99 },
  { id: 'p2', text: 'seed2', comments: [], commentsCount: 5 },
]

// Location privacy
const loc = toCommunityPublicLocation('Ulice 12, Kolín', 50.02781, 15.20049)
check(loc.location.includes('Kolín'), `location keeps city (got ${loc.location})`)
check(!/\b12\b/.test(loc.location), `location strips house number (got ${loc.location})`)
check(loc.locationLat === 50.028, `lat rounded to 3dp (got ${loc.locationLat})`)
check(loc.locationLng === 15.2, `lng rounded to 3dp (got ${loc.locationLng})`)

// commentsCount sync
const fixed = normalizeCommentsCount(seed[0])
check(fixed.commentsCount === 2, `commentsCount synced to 2 (got ${fixed.commentsCount})`)

// migration: null → seed
const fromNull = loadPostsMigration(null, seed)
check(fromNull.length === 2, `null storage loads seed (got ${fromNull.length})`)
check(fromNull[0].commentsCount === 2, 'seed commentsCount normalized on load')

// migration: empty stays empty
const fromEmpty = loadPostsMigration('[]', seed)
check(fromEmpty.length === 0, `empty array does not re-seed (got ${fromEmpty.length})`)

// migration: custom post preserved, no duplicate seed append
const custom = [{ id: 'post_user_1', text: 'hello', comments: [], commentsCount: 0 }]
const fromCustom = loadPostsMigration(JSON.stringify(custom), seed)
check(fromCustom.length === 1, `custom list length 1 (got ${fromCustom.length})`)
check(fromCustom[0].id === 'post_user_1', 'custom post id preserved')
check(!fromCustom.some((p) => p.id === 'p1'), 'seed p1 not re-appended')

// author ownership helper
const SELF = 'owner_self'
function isSelf(authorId, authorName, displayName = 'Tereza V.') {
  if (authorId) return authorId === SELF
  if (authorName) return authorName === displayName
  return false
}
check(isSelf('owner_self', 'Tereza V.'), 'self authorId matches')
check(!isSelf('community_sarah', 'Sarah K.'), 'other authorId rejected')
check(isSelf(undefined, 'Tereza V.'), 'legacy name fallback works')

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`)
  process.exit(1)
}
console.log('\nAll community asserts passed.')
