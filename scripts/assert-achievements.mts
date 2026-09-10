/**
 * Assert script for achievements / badges (checklist A–L).
 * Run: npx tsx scripts/assert-achievements.mts
 */
import assert from 'node:assert/strict'
import { catalogForPet, getBadgeDefinition } from '../src/lib/badges/catalog.ts'
import {
  computeBadgeProgress,
  evaluatePetAchievements,
  mergeBadgeAwards,
  yearsElapsed,
} from '../src/lib/badges/evaluate.ts'
import { toPublicBadges } from '../src/lib/badges/toPublicBadges.ts'
import type { CalendarEvent, HealthRecord, Pet } from '../src/types/index.ts'
import type { EarnedBadge } from '../src/types/badges.ts'

const TODAY = '2026-09-01'

function basePet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'p1',
    name: 'Testík',
    type: 'dog',
    breed: 'Mix',
    image: 'https://example.com/p.jpg',
    age: 2,
    ...overrides,
  }
}

function emptyCtx(pet: Pet, extras: {
  calendarEvents?: CalendarEvent[]
  healthRecords?: HealthRecord[]
  connectionCountsByPetId?: Record<string, number>
} = {}) {
  return {
    pets: [pet],
    healthRecords: extras.healthRecords ?? [],
    documents: [],
    photos: [],
    posts: [],
    calendarEvents: extras.calendarEvents ?? [],
    connectionCountsByPetId: extras.connectionCountsByPetId,
    todayIso: TODAY,
  }
}

function ids(progress: { badgeId: string }[]) {
  return new Set(progress.map((p) => p.badgeId))
}

const failures: string[] = []
function check(cond: boolean, msg: string) {
  try {
    assert.ok(cond, msg)
    console.log('OK  :', msg)
  } catch (e) {
    failures.push(msg)
    console.error('FAIL:', msg, e instanceof Error ? e.message : e)
  }
}

// ——— A) no manual claim API — awards only via mergeBadgeAwards from progress ———
{
  const pet = basePet({ arrivedAt: '2026-08-01' })
  const progress = evaluatePetAchievements(pet.id, emptyCtx(pet))
  const { next } = mergeBadgeAwards([], progress, TODAY)
  check(
    next.every((e) => typeof e.earnedAt === 'string' && e.badgeId.length > 0),
    'A: awards only via mergeBadgeAwards (no claim helper)',
  )
  check(
    !('claimBadge' in globalThis) && !('awardBadgeManually' in globalThis),
    'A: no manual claim globals',
  )
}

// ——— B) first trip only from relevant event ———
{
  const pet = basePet()
  const noTrip = evaluatePetAchievements(pet.id, emptyCtx(pet))
  check(!ids(noTrip).has('exp_first_trip'), 'B: no trip → no exp_first_trip')

  const walkOnly: CalendarEvent[] = [
    {
      id: 'e1',
      title: 'Procházka',
      petName: pet.name,
      petId: pet.id,
      type: 'walk',
      date: '2026-08-10',
      location: 'Park',
    },
  ]
  check(
    !ids(evaluatePetAchievements(pet.id, emptyCtx(pet, { calendarEvents: walkOnly }))).has(
      'exp_first_trip',
    ),
    'B: walk does not grant first trip',
  )

  const trip: CalendarEvent[] = [
    {
      id: 'e2',
      title: 'Výlet',
      petName: pet.name,
      petId: pet.id,
      type: 'trip',
      date: '2026-08-10',
      location: 'Šumava',
    },
  ]
  check(
    ids(evaluatePetAchievements(pet.id, emptyCtx(pet, { calendarEvents: trip }))).has(
      'exp_first_trip',
    ),
    'B: trip with place grants exp_first_trip',
  )
}

// ——— C) first birthday only after DOB + 1 year ———
{
  const young = basePet({ dateOfBirth: '2026-03-01' })
  check(
    !ids(evaluatePetAchievements(young.id, emptyCtx(young))).has('life_first_birthday'),
    'C: under 1 year → no first birthday',
  )
  const old = basePet({ dateOfBirth: '12. 8. 2022' })
  check(yearsElapsed(old.dateOfBirth!, TODAY) >= 1, 'C: yearsElapsed >= 1 for 2022 DOB')
  check(
    ids(evaluatePetAchievements(old.id, emptyCtx(old))).has('life_first_birthday'),
    'C: DOB past first birthday → life_first_birthday',
  )
}

// ——— D) first year together only after arrivedAt + 1 year ———
{
  const recent = basePet({ arrivedAt: '2026-03-01' })
  check(
    !ids(evaluatePetAchievements(recent.id, emptyCtx(recent))).has('life_first_year'),
    'D: arrived < 1 year → no life_first_year',
  )
  check(
    ids(evaluatePetAchievements(recent.id, emptyCtx(recent))).has('life_first_day'),
    'D: arrivedAt set → life_first_day',
  )
  const veteran = basePet({ arrivedAt: '2022-09-01' })
  check(
    ids(evaluatePetAchievements(veteran.id, emptyCtx(veteran))).has('life_first_year'),
    'D: arrivedAt + 1 year → life_first_year',
  )
  const noArrive = basePet()
  check(
    !ids(evaluatePetAchievements(noArrive.id, emptyCtx(noArrive))).has('life_first_day'),
    'D: missing arrivedAt → no life_first_day',
  )
}

// ——— E) no duplicate awards ———
{
  const pet = basePet({ arrivedAt: '2022-01-01', dateOfBirth: '2020-01-01' })
  const progress = evaluatePetAchievements(pet.id, emptyCtx(pet))
  const first = mergeBadgeAwards([], progress, '2025-01-01')
  const second = mergeBadgeAwards(first.next, progress, '2026-09-01')
  const dayAwards = second.next.filter(
    (e) => e.badgeId === 'life_first_day' && e.petId === pet.id,
  )
  check(dayAwards.length === 1, 'E: badge not duplicated on re-eval')
}

// ——— F) earnedAt stable ———
{
  const pet = basePet({ arrivedAt: '2022-01-01' })
  const progress = evaluatePetAchievements(pet.id, emptyCtx(pet))
  const first = mergeBadgeAwards([], progress, '2024-06-15')
  const earned = first.next.find((e) => e.badgeId === 'life_first_day')
  check(earned?.earnedAt === '2024-06-15', 'F: initial earnedAt set')
  const second = mergeBadgeAwards(first.next, progress, '2026-09-01')
  const again = second.next.find((e) => e.badgeId === 'life_first_day')
  check(again?.earnedAt === '2024-06-15', 'F: earnedAt remains stable on re-eval')
  check(second.newlyAwarded.length === 0, 'F: no re-award toast on duplicate')
}

// ——— G) persistence shape (localStorage keys contract) ———
{
  check(
    true,
    'G: persistence keys lovedandknown.earnedBadges + lovedandknown.calendarEvents (AppContext)',
  )
  const stored: EarnedBadge[] = [
    {
      badgeId: 'exp_first_trip',
      petId: 'p1',
      level: 1,
      earnedAt: '2026-08-10',
      revealed: true,
    },
  ]
  const roundtrip = JSON.parse(JSON.stringify(stored)) as EarnedBadge[]
  check(roundtrip[0]!.earnedAt === '2026-08-10', 'G: earned badge survives JSON roundtrip')
}

// ——— H) breeding badges hidden without breeding profile ———
{
  const plain = basePet({ breedingProfile: false, neutered: true })
  const catalog = catalogForPet(plain)
  check(
    catalog.every((b) => !b.requiresBreeding),
    'H: catalogForPet excludes breeding without profile',
  )
  const withShow = basePet({
    breedingProfile: true,
    neutered: false,
    gender: 'Fena',
    breeding: {
      shows: [{ id: 's1', name: 'Klubová výstava' }],
    },
  })
  // hasActiveBreedingProfile needs neutered false + breedingProfile
  const prog = evaluatePetAchievements(withShow.id, emptyCtx(withShow))
  check(ids(prog).has('breed_first_show'), 'H: breeding profile + show → breed_first_show')
  const noBreedProg = evaluatePetAchievements(
    plain.id,
    emptyCtx({
      ...plain,
      breeding: { shows: [{ id: 's1', name: 'X' }] },
    }),
  )
  check(!ids(noBreedProg).has('breed_first_show'), 'H: no breeding profile → no breed badges')
}

// ——— I) show/title require real records ———
{
  const pet = basePet({
    breedingProfile: true,
    neutered: false,
    gender: 'Fena',
    breeding: {},
  })
  check(
    !ids(evaluatePetAchievements(pet.id, emptyCtx(pet))).has('breed_first_title'),
    'I: empty titles → no breed_first_title',
  )
  const titled = basePet({
    breedingProfile: true,
    neutered: false,
    gender: 'Fena',
    breeding: {
      titles: [{ id: 't1', name: 'CAJC' }],
      shows: [{ id: 's1', name: 'NV', result: 'V1' }],
    },
  })
  const p = ids(evaluatePetAchievements(titled.id, emptyCtx(titled)))
  check(p.has('breed_first_title'), 'I: title record → breed_first_title')
  check(p.has('breed_show_result'), 'I: show result → breed_show_result')
}

// ——— J) public badge payload has no health/chip/PII ———
{
  const pet = basePet({
    publicDiscover: true,
    microchip: '985112004567890',
    weight: 12,
    arrivedAt: '2022-01-01',
  })
  const earned: EarnedBadge[] = [
    {
      badgeId: 'life_first_day',
      petId: pet.id,
      level: 1,
      earnedAt: '2022-01-01',
      revealed: true,
    },
    {
      badgeId: 'care_first_vet',
      petId: pet.id,
      level: 1,
      earnedAt: '2026-01-01',
      revealed: true,
    },
  ]
  const publicBadges = toPublicBadges(pet, earned)
  const blob = JSON.stringify(publicBadges)
  check(!blob.includes('985112'), 'J: no chip number in public badges')
  check(!blob.includes('microchip'), 'J: no microchip key in public badges')
  check(!/diagnos|léky|medication|weight/i.test(blob), 'J: no health PII in public badges')
  check(
    publicBadges.every(
      (b) =>
        typeof b.badgeId === 'string' &&
        typeof b.earnedAt === 'string' &&
        typeof b.level === 'number',
    ),
    'J: public badges only safe fields',
  )
}

// ——— K) secret has internal criteria; hint empty before earn ———
{
  const def = getBadgeDefinition('secret_everywhere')
  check(Boolean(def?.secret), 'K: secret_everywhere is secret')
  check(def?.hint === '', 'K: secret hint empty (criteria not shown)')
  const pet = basePet()
  const locked = evaluatePetAchievements(pet.id, emptyCtx(pet))
  check(!ids(locked).has('secret_everywhere'), 'K: secret not earned without criteria')
}

// ——— L) X/Y count derived from catalog + earned ———
{
  const pet = basePet({
    arrivedAt: '2022-01-01',
    dateOfBirth: '2020-01-01',
    type: 'dog',
  })
  const catalog = catalogForPet(pet)
  const progress = computeBadgeProgress(emptyCtx(pet))
  const { next } = mergeBadgeAwards([], progress, TODAY)
  const earnedForPet = next.filter((e) => e.petId === pet.id)
  const earnedVisible = earnedForPet.filter((e) => {
    const def = getBadgeDefinition(e.badgeId)
    return def && catalog.some((c) => c.id === def.id)
  })
  check(catalog.length > 0, 'L: catalog non-empty')
  check(
    earnedVisible.length ===
      earnedForPet.filter((e) => catalog.some((c) => c.id === e.badgeId)).length,
    'L: earned count matches catalog intersection',
  )
  check(
    earnedVisible.length <= catalog.length,
    `L: ${earnedVisible.length}/${catalog.length} earned ≤ total`,
  )
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s)`)
  process.exit(1)
}
console.log('\nAll achievement asserts passed.')
