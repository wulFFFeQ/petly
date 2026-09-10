import type {
  CalendarEvent,
  CommunityPost,
  Pet,
  PetDocument,
  PetPhoto,
  HealthRecord,
} from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { APP_TODAY, parseCzechDate, parseEventDate } from '../dashboardDates'
import { BADGE_CATALOG, isBadgeApplicableToPet } from './catalog'

export interface BadgeEvalContext {
  pets: Pet[]
  healthRecords: HealthRecord[]
  documents: PetDocument[]
  photos: PetPhoto[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
  /** Community connection threads per owned pet id. */
  connectionCountsByPetId?: Record<string, number>
  todayIso: string
}

export interface BadgeProgress {
  badgeId: string
  petId?: string
  level: number
}

export interface ChallengeProgress {
  challengeId: string
  petId: string
  complete: boolean
  /** 0–1 progress hint for UI */
  ratio: number
  detail: string
}

const EXPERIENCE_TYPES = new Set([
  'trip',
  'travel',
  'swimming',
  'roadtrip',
  'foreign_travel',
  'training',
  'agility',
  'socialization',
  'course',
  'doggy_daycare',
  'community_meetup',
  'pet_friend',
  'exhibition',
  'competition',
  'exam',
  'seminar',
  'walk',
  'sport',
])

const TRAVEL_TYPES = new Set(['travel', 'roadtrip', 'foreign_travel'])
const ADVENTURE_TYPES = new Set(['trip', 'travel', 'roadtrip', 'foreign_travel'])
const PLAY_TYPES = new Set(['walk', 'sport'])
const CARE_EVENT_TYPES = new Set([
  'vet',
  'vaccination',
  'examination',
  'medication',
  'grooming',
  'coat_care',
  'dental',
  'care_other',
  'bathing',
])
const HEALTH_CAL_TYPES = new Set(['vet', 'vaccination', 'examination', 'medication'])
const CARE_HEALTH_TYPES = new Set(['vet', 'vaccination', 'examination', 'medication', 'assessment'])

const HOME_LIKE = new Set(['doma', 'home', ''])

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim())
}

function normalizePlace(location: string | undefined): string {
  return (location ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function parsePetDate(value: string | undefined | null): Date | null {
  if (!value?.trim()) return null
  const raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parseEventDate(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const czech = parseCzechDate(raw)
  if (czech && !Number.isNaN(czech.getTime())) return czech
  return null
}

function toDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
}

/** Inclusive calendar years elapsed from start → todayIso (APP_TODAY aligned). */
export function yearsElapsed(fromIsoOrCzech: string, todayIso: string): number {
  const from = parsePetDate(fromIsoOrCzech)
  const today = parseEventDate(todayIso)
  if (!from || Number.isNaN(today.getTime())) return 0
  const a = toDayStart(from)
  const b = toDayStart(today)
  if (a.getTime() > b.getTime()) return 0

  let years = b.getFullYear() - a.getFullYear()
  const monthDiff = b.getMonth() - a.getMonth()
  const dayDiff = b.getDate() - a.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1
  return Math.max(0, years)
}

export function daysElapsed(fromIsoOrCzech: string, todayIso: string): number {
  const from = parsePetDate(fromIsoOrCzech)
  const today = parseEventDate(todayIso)
  if (!from || Number.isNaN(today.getTime())) return 0
  const a = toDayStart(from)
  const b = toDayStart(today)
  if (a.getTime() > b.getTime()) return 0
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function isPastOrToday(event: CalendarEvent, todayIso: string): boolean {
  const d = parseEventDate(event.date)
  if (Number.isNaN(d.getTime())) return false
  const today = parseEventDate(todayIso)
  d.setHours(23, 59, 59, 0)
  today.setHours(23, 59, 59, 0)
  return d.getTime() <= today.getTime()
}

function isIsoOnOrBefore(iso: string, todayIso: string): boolean {
  const d = parsePetDate(iso)
  const today = parseEventDate(todayIso)
  if (!d || Number.isNaN(today.getTime())) return false
  return toDayStart(d).getTime() <= toDayStart(today).getTime()
}

function petEvents(
  events: CalendarEvent[],
  pet: Pet,
  todayIso: string,
): CalendarEvent[] {
  return events.filter((e) => {
    if (!isPastOrToday(e, todayIso)) return false
    if (e.petId && e.petId === pet.id) return true
    if (!e.petId && e.petName === pet.name) return true
    return false
  })
}

function withPlace(events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => {
    const place = normalizePlace(e.location)
    return place.length > 0 && !HOME_LIKE.has(place)
  })
}

function uniquePlaces(events: CalendarEvent[]): string[] {
  const set = new Set<string>()
  for (const e of withPlace(events)) {
    set.add(normalizePlace(e.location))
  }
  return Array.from(set)
}

function ofType(events: CalendarEvent[], ...types: string[]): CalendarEvent[] {
  const set = new Set(types)
  return events.filter((e) => set.has(e.type))
}

function seasonIndex(date: Date): number {
  const m = date.getMonth()
  if (m >= 2 && m <= 4) return 0
  if (m >= 5 && m <= 7) return 1
  if (m >= 8 && m <= 10) return 2
  return 3
}

function maxActivitiesInAnyWeek(events: CalendarEvent[]): number {
  const activity = events
    .filter((e) => EXPERIENCE_TYPES.has(e.type))
    .map((e) => parseEventDate(e.date).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)

  let best = 0
  for (let i = 0; i < activity.length; i += 1) {
    const start = activity[i]!
    const end = start + 7 * 24 * 60 * 60 * 1000
    let count = 0
    for (let j = i; j < activity.length; j += 1) {
      if (activity[j]! <= end) count += 1
      else break
    }
    if (count > best) best = count
  }
  return best
}

function petHealthRecords(records: HealthRecord[], petId: string): HealthRecord[] {
  return records.filter((r) => r.petId === petId)
}

function hasBreedingShow(pet: Pet): boolean {
  return (pet.breeding?.shows ?? []).some((s) => hasText(s.name))
}

function hasBreedingTitle(pet: Pet): boolean {
  return (pet.breeding?.titles ?? []).some((t) => hasText(t.name))
}

function hasShowResult(pet: Pet): boolean {
  return (pet.breeding?.shows ?? []).some(
    (s) => hasText(s.result) || hasText(s.titleAwarded),
  )
}

function hasHealthTest(pet: Pet): boolean {
  return (pet.breeding?.healthTests ?? []).some(
    (t) => hasText(t.name) || Boolean(t.date?.trim()),
  )
}

function hasMating(pet: Pet): boolean {
  return (pet.breeding?.matings ?? []).length >= 1
}

function hasLitter(pet: Pet): boolean {
  return (pet.breeding?.litters ?? []).length >= 1
}

function push(progress: BadgeProgress[], badgeId: string, petId: string, ok: boolean) {
  if (ok) progress.push({ badgeId, petId, level: 1 })
}

export function computeBadgeProgress(ctx: BadgeEvalContext): BadgeProgress[] {
  const progress: BadgeProgress[] = []
  const todayIso = ctx.todayIso

  for (const pet of ctx.pets) {
    const events = petEvents(ctx.calendarEvents, pet, todayIso)
    const health = petHealthRecords(ctx.healthRecords, pet.id)
    const places = uniquePlaces(events)
    const trips = ofType(events, 'trip').filter((e) => hasText(e.location))
    const trainings = ofType(events, 'training', 'course')
    const travels = events.filter((e) => TRAVEL_TYPES.has(e.type))
    const adventures = events.filter((e) => ADVENTURE_TYPES.has(e.type))
    const plays = events.filter((e) => PLAY_TYPES.has(e.type))
    const meetups = ofType(events, 'community_meetup')
    const experienceCount = events.filter((e) => EXPERIENCE_TYPES.has(e.type)).length
    const connections = ctx.connectionCountsByPetId?.[pet.id] ?? 0

    const vetHealth = health.filter((r) => r.type === 'vet')
    const vaccHealth = health.filter((r) => r.type === 'vaccination')
    const vetCal = ofType(events, 'vet')
    const vaccCal = ofType(events, 'vaccination')
    const careCal = events.filter((e) => CARE_EVENT_TYPES.has(e.type))
    const careHealth = health.filter((r) => CARE_HEALTH_TYPES.has(r.type))
    const careTotal = careCal.length + careHealth.length
    const healthCal = events.filter((e) => HEALTH_CAL_TYPES.has(e.type))

    const applicable = (id: string) => {
      const def = BADGE_CATALOG.find((b) => b.id === id)
      return def ? isBadgeApplicableToPet(def, pet) : false
    }

    // Milníky — arrivedAt / DOB
    if (applicable('life_first_day')) {
      push(
        progress,
        'life_first_day',
        pet.id,
        Boolean(pet.arrivedAt?.trim()) && isIsoOnOrBefore(pet.arrivedAt!, todayIso),
      )
    }
    if (applicable('life_first_birthday')) {
      push(
        progress,
        'life_first_birthday',
        pet.id,
        Boolean(pet.dateOfBirth?.trim()) && yearsElapsed(pet.dateOfBirth!, todayIso) >= 1,
      )
    }
    if (applicable('life_first_year')) {
      push(
        progress,
        'life_first_year',
        pet.id,
        Boolean(pet.arrivedAt?.trim()) && yearsElapsed(pet.arrivedAt!, todayIso) >= 1,
      )
    }

    // Zážitky
    if (applicable('exp_first_trip')) {
      push(progress, 'exp_first_trip', pet.id, trips.length >= 1)
    }
    if (applicable('exp_first_travel')) {
      push(progress, 'exp_first_travel', pet.id, travels.length >= 1)
    }
    if (applicable('exp_first_abroad')) {
      push(progress, 'exp_first_abroad', pet.id, ofType(events, 'foreign_travel').length >= 1)
    }
    if (applicable('exp_new_place')) {
      push(progress, 'exp_new_place', pet.id, places.length >= 2)
    }
    if (applicable('exp_little_traveler')) {
      push(progress, 'exp_little_traveler', pet.id, places.length >= 3)
    }
    if (applicable('exp_first_training')) {
      push(progress, 'exp_first_training', pet.id, trainings.length >= 1)
    }
    if (applicable('exp_community_meetup')) {
      push(progress, 'exp_community_meetup', pet.id, meetups.length >= 1)
    }
    if (applicable('exp_new_friend')) {
      push(progress, 'exp_new_friend', pet.id, ofType(events, 'pet_friend').length >= 1)
    }
    if (applicable('act_active')) {
      push(progress, 'act_active', pet.id, experienceCount >= 5)
    }
    if (applicable('act_adventurer')) {
      push(progress, 'act_adventurer', pet.id, adventures.length >= 3)
    }
    if (applicable('act_player')) {
      push(progress, 'act_player', pet.id, plays.length >= 3)
    }
    if (applicable('act_social')) {
      push(progress, 'act_social', pet.id, meetups.length >= 2 || connections >= 2)
    }
    if (applicable('exp_week_five')) {
      push(progress, 'exp_week_five', pet.id, maxActivitiesInAnyWeek(events) >= 5)
    }

    // Péče
    if (applicable('care_first_vet')) {
      push(progress, 'care_first_vet', pet.id, vetHealth.length >= 1 || vetCal.length >= 1)
    }
    if (applicable('care_prevention')) {
      push(
        progress,
        'care_prevention',
        pet.id,
        vaccHealth.length >= 1 || vaccCal.length >= 1,
      )
    }
    if (applicable('care_regular')) {
      push(progress, 'care_regular', pet.id, careTotal >= 3)
    }

    // Pes
    if (applicable('dog_first_swim')) {
      push(progress, 'dog_first_swim', pet.id, ofType(events, 'swimming').length >= 1)
    }
    if (applicable('dog_first_agility')) {
      push(progress, 'dog_first_agility', pet.id, ofType(events, 'agility').length >= 1)
    }
    if (applicable('dog_skills')) {
      const skillCount = ofType(events, 'training', 'course', 'exam').length
      push(progress, 'dog_skills', pet.id, skillCount >= 3 || ofType(events, 'exam').length >= 1)
    }
    if (applicable('dog_social')) {
      push(
        progress,
        'dog_social',
        pet.id,
        ofType(events, 'socialization', 'doggy_daycare').length >= 2,
      )
    }

    // Kočka
    if (applicable('cat_first_adventure')) {
      push(
        progress,
        'cat_first_adventure',
        pet.id,
        ofType(events, 'trip', 'travel', 'roadtrip').some((e) => hasText(e.location)),
      )
    }
    if (applicable('cat_harness_world')) {
      push(
        progress,
        'cat_harness_world',
        pet.id,
        ofType(events, 'socialization', 'course').length >= 1,
      )
    }
    if (applicable('cat_friend')) {
      push(progress, 'cat_friend', pet.id, ofType(events, 'pet_friend').length >= 1)
    }
    if (applicable('cat_calm_explorer')) {
      push(progress, 'cat_calm_explorer', pet.id, places.length >= 3)
    }

    // Chov — primárně dossier
    if (applicable('breed_first_show')) {
      push(
        progress,
        'breed_first_show',
        pet.id,
        hasBreedingShow(pet) || ofType(events, 'exhibition').length >= 1,
      )
    }
    if (applicable('breed_first_title')) {
      push(progress, 'breed_first_title', pet.id, hasBreedingTitle(pet))
    }
    if (applicable('breed_show_result')) {
      push(progress, 'breed_show_result', pet.id, hasShowResult(pet))
    }
    if (applicable('breed_health_tested')) {
      push(progress, 'breed_health_tested', pet.id, hasHealthTest(pet))
    }
    if (applicable('breed_first_mating')) {
      push(
        progress,
        'breed_first_mating',
        pet.id,
        hasMating(pet) || ofType(events, 'mating').length >= 1,
      )
    }
    if (applicable('breed_first_litter')) {
      push(
        progress,
        'breed_first_litter',
        pet.id,
        hasLitter(pet) || ofType(events, 'birth').length >= 1,
      )
    }
    if (applicable('breed_line')) {
      const matingOk = hasMating(pet) || ofType(events, 'mating').length >= 1
      const litterOk = hasLitter(pet) || ofType(events, 'birth').length >= 1
      const showOrTitle =
        hasBreedingShow(pet) ||
        hasBreedingTitle(pet) ||
        ofType(events, 'exhibition').length >= 1
      push(progress, 'breed_line', pet.id, matingOk && litterOk && showOrTitle)
    }

    // Tajné
    if (applicable('secret_explorer')) {
      push(progress, 'secret_explorer', pet.id, places.length >= 5)
    }
    if (applicable('secret_four_seasons')) {
      const seasons = new Set<number>()
      for (const e of events.filter((ev) => EXPERIENCE_TYPES.has(ev.type))) {
        const d = parseEventDate(e.date)
        if (!Number.isNaN(d.getTime())) seasons.add(seasonIndex(d))
      }
      push(progress, 'secret_four_seasons', pet.id, seasons.size >= 4)
    }
    if (applicable('secret_everywhere')) {
      push(
        progress,
        'secret_everywhere',
        pet.id,
        trips.length >= 1 &&
          trainings.length >= 1 &&
          meetups.length >= 1 &&
          travels.length >= 1,
      )
    }
    if (applicable('secret_care_and_move')) {
      const careOk = vetHealth.length + vaccHealth.length + vetCal.length + vaccCal.length >= 1
      push(progress, 'secret_care_and_move', pet.id, careOk && experienceCount >= 1)
    }
    if (applicable('secret_calendar_health')) {
      push(
        progress,
        'secret_calendar_health',
        pet.id,
        healthCal.length >= 1 && careHealth.length >= 1,
      )
    }
    if (applicable('secret_still_together')) {
      push(
        progress,
        'secret_still_together',
        pet.id,
        Boolean(pet.arrivedAt?.trim()) &&
          daysElapsed(pet.arrivedAt!, todayIso) >= 90 &&
          experienceCount >= 5,
      )
    }
    if (applicable('secret_unexpected_friend')) {
      push(
        progress,
        'secret_unexpected_friend',
        pet.id,
        meetups.length >= 1 &&
          (ofType(events, 'pet_friend').length >= 1 || connections >= 1),
      )
    }
    if (applicable('secret_show_heart')) {
      push(
        progress,
        'secret_show_heart',
        pet.id,
        (hasBreedingShow(pet) || ofType(events, 'exhibition').length >= 1) &&
          (hasLitter(pet) || ofType(events, 'birth').length >= 1),
      )
    }
  }

  return progress
}

/** Evaluate achievements for a single pet. */
export function evaluatePetAchievements(
  petId: string,
  ctx: BadgeEvalContext,
): BadgeProgress[] {
  const pet = ctx.pets.find((p) => p.id === petId)
  if (!pet) return []
  return computeBadgeProgress({ ...ctx, pets: [pet] })
}

/** Progress for active challenges (for UI). */
export function computeChallengeProgress(
  ctx: BadgeEvalContext,
  pet: Pet,
): ChallengeProgress[] {
  const events = petEvents(ctx.calendarEvents, pet, ctx.todayIso)
  const places = uniquePlaces(events)
  const trips = ofType(events, 'trip').filter((e) => hasText(e.location))
  const trainings = ofType(events, 'training', 'course')
  const weekMax = maxActivitiesInAnyWeek(events)
  const friends = ofType(events, 'pet_friend', 'socialization')

  const items: ChallengeProgress[] = [
    {
      challengeId: 'challenge_first_trip',
      petId: pet.id,
      complete: trips.length >= 1,
      ratio: trips.length >= 1 ? 1 : 0,
      detail: trips.length >= 1 ? 'Výlet zaznamenán' : 'Chybí výlet s destinací',
    },
    {
      challengeId: 'challenge_new_place',
      petId: pet.id,
      complete: places.length >= 2,
      ratio: Math.min(1, places.length / 2),
      detail: `${places.length}/2 různých míst`,
    },
    {
      challengeId: 'challenge_first_training',
      petId: pet.id,
      complete: trainings.length >= 1,
      ratio: trainings.length >= 1 ? 1 : 0,
      detail: trainings.length >= 1 ? 'Trénink zaznamenán' : 'Zaznamenejte trénink nebo kurz',
    },
    {
      challengeId: 'challenge_five_in_week',
      petId: pet.id,
      complete: weekMax >= 5,
      ratio: Math.min(1, weekMax / 5),
      detail: `Nejlepší týden: ${weekMax}/5 aktivit`,
    },
    {
      challengeId: 'challenge_new_environment',
      petId: pet.id,
      complete: ofType(events, 'pet_friend').length >= 1,
      ratio: friends.length >= 1 ? 1 : 0,
      detail:
        ofType(events, 'pet_friend').length >= 1
          ? 'Nový kamarád zaznamenán'
          : 'Seznamte se s novým prostředím / kamarádem',
    },
  ]

  return items.filter((item) => {
    const def = BADGE_CATALOG.find((b) => b.challengeId === item.challengeId)
    if (!def) return true
    return isBadgeApplicableToPet(def, pet)
  })
}

function awardKey(badgeId: string, petId?: string): string {
  return petId ? `${badgeId}::${petId}` : badgeId
}

export function mergeBadgeAwards(
  previous: EarnedBadge[],
  progress: BadgeProgress[],
  todayIso: string,
): { next: EarnedBadge[]; newlyAwarded: EarnedBadge[] } {
  const knownIds = new Set(BADGE_CATALOG.map((b) => b.id))
  const byKey = new Map<string, EarnedBadge>()

  for (const earned of previous) {
    if (!knownIds.has(earned.badgeId)) continue
    byKey.set(awardKey(earned.badgeId, earned.petId), earned)
  }

  const newlyAwarded: EarnedBadge[] = []

  for (const item of progress) {
    if (item.level < 1) continue
    const def = BADGE_CATALOG.find((b) => b.id === item.badgeId)
    if (!def) continue

    const key = awardKey(item.badgeId, item.petId)
    const existing = byKey.get(key)

    if (!existing) {
      const awarded: EarnedBadge = {
        badgeId: item.badgeId,
        petId: item.petId,
        level: item.level,
        earnedAt: todayIso,
        revealed: true,
      }
      byKey.set(key, awarded)
      newlyAwarded.push(awarded)
      continue
    }

    // Level upgrade keeps original earnedAt stable.
    if (item.level > existing.level) {
      const upgraded: EarnedBadge = {
        ...existing,
        level: item.level,
        revealed: true,
      }
      byKey.set(key, upgraded)
      newlyAwarded.push(upgraded)
    }
  }

  return { next: Array.from(byKey.values()), newlyAwarded }
}

export function toIsoDay(date: Date = APP_TODAY): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isNightOwlHour(date = new Date()): boolean {
  const hour = date.getHours()
  return hour >= 23 || hour < 5
}

export function romanLevel(level: number): string {
  const map = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return map[level] ?? String(level)
}
