import type {
  CalendarEvent,
  CommunityPost,
  Pet,
  PetDocument,
  PetPhoto,
  HealthRecord,
} from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { APP_TODAY, parseEventDate } from '../dashboardDates'
import { ensurePetFirstSeenDays } from './badgeData'
import { BADGE_CATALOG, isBadgeApplicableToPet } from './catalog'

export interface BadgeEvalContext {
  pets: Pet[]
  healthRecords: HealthRecord[]
  documents: PetDocument[]
  photos: PetPhoto[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
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
])

const HOME_LIKE = new Set(['doma', 'home', ''])

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim())
}

function normalizePlace(location: string | undefined): string {
  return (location ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function isPastOrToday(event: CalendarEvent): boolean {
  const d = parseEventDate(event.date)
  if (Number.isNaN(d.getTime())) return false
  d.setHours(23, 59, 59, 0)
  return d.getTime() <= APP_TODAY.getTime() + 24 * 60 * 60 * 1000
}

function petEvents(events: CalendarEvent[], petName: string): CalendarEvent[] {
  return events.filter((e) => e.petName === petName && isPastOrToday(e))
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
  if (m >= 2 && m <= 4) return 0 // spring
  if (m >= 5 && m <= 7) return 1 // summer
  if (m >= 8 && m <= 10) return 2 // autumn
  return 3 // winter
}

function hasResultNote(notes: string | undefined): boolean {
  if (!notes?.trim()) return false
  return /(vítěz|výhra|cacib|cac\b|šampion|champion|1\.\s*místo|umístěn|titul|výborný|výsledek)/i.test(
    notes,
  )
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

function push(progress: BadgeProgress[], badgeId: string, petId: string, ok: boolean) {
  if (ok) progress.push({ badgeId, petId, level: 1 })
}

export function computeBadgeProgress(ctx: BadgeEvalContext): BadgeProgress[] {
  const progress: BadgeProgress[] = []

  for (const pet of ctx.pets) {
    const events = petEvents(ctx.calendarEvents, pet.name)
    const places = uniquePlaces(events)
    const trips = ofType(events, 'trip').filter((e) => hasText(e.location))
    const trainings = ofType(events, 'training', 'course')
    const birthdays = ofType(events, 'birthday')
    const adoptions = ofType(events, 'adoption_anniversary')
    const shows = ofType(events, 'exhibition').filter((e) => hasText(e.location))
    const competitions = ofType(events, 'competition', 'exam')
    const daysActive = ensurePetFirstSeenDays(pet.id, ctx.todayIso)
    const experienceCount = events.filter((e) => EXPERIENCE_TYPES.has(e.type)).length

    const applicable = (id: string) => {
      const def = BADGE_CATALOG.find((b) => b.id === id)
      return def ? isBadgeApplicableToPet(def, pet) : false
    }

    // Milníky
    if (applicable('life_first_birthday')) {
      push(progress, 'life_first_birthday', pet.id, birthdays.length >= 1)
    }
    if (applicable('life_found_home')) {
      push(progress, 'life_found_home', pet.id, adoptions.length >= 1)
    }
    if (applicable('life_another_year')) {
      push(
        progress,
        'life_another_year',
        pet.id,
        birthdays.length >= 2 || (birthdays.length >= 1 && adoptions.length >= 1),
      )
    }

    // Společné zážitky
    if (applicable('exp_first_trip')) {
      push(progress, 'exp_first_trip', pet.id, trips.length >= 1)
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
    if (applicable('exp_first_roadtrip')) {
      push(
        progress,
        'exp_first_roadtrip',
        pet.id,
        ofType(events, 'roadtrip').some((e) => hasText(e.location)),
      )
    }
    if (applicable('exp_first_abroad')) {
      push(progress, 'exp_first_abroad', pet.id, ofType(events, 'foreign_travel').length >= 1)
    }
    if (applicable('exp_community_meetup')) {
      push(progress, 'exp_community_meetup', pet.id, ofType(events, 'community_meetup').length >= 1)
    }
    if (applicable('exp_new_friend')) {
      push(progress, 'exp_new_friend', pet.id, ofType(events, 'pet_friend').length >= 1)
    }
    if (applicable('exp_week_five')) {
      push(progress, 'exp_week_five', pet.id, maxActivitiesInAnyWeek(events) >= 5)
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

    // Chov
    if (applicable('breed_first_show')) {
      push(progress, 'breed_first_show', pet.id, shows.length >= 1)
    }
    if (applicable('breed_show_debut')) {
      push(
        progress,
        'breed_show_debut',
        pet.id,
        shows.some((e) => hasResultNote(e.notes)),
      )
    }
    if (applicable('breed_show_regular')) {
      push(progress, 'breed_show_regular', pet.id, shows.length >= 5)
    }
    if (applicable('breed_champion')) {
      const win =
        [...shows, ...competitions].some((e) => hasResultNote(e.notes)) ||
        competitions.length >= 3
      push(progress, 'breed_champion', pet.id, win)
    }
    if (applicable('breed_first_mating')) {
      push(progress, 'breed_first_mating', pet.id, ofType(events, 'mating').length >= 1)
    }
    if (applicable('breed_first_litter')) {
      push(progress, 'breed_first_litter', pet.id, ofType(events, 'birth').length >= 1)
    }
    if (applicable('breed_line')) {
      push(
        progress,
        'breed_line',
        pet.id,
        ofType(events, 'mating').length >= 1 &&
          ofType(events, 'birth').length >= 1 &&
          ofType(events, 'litter_check').length >= 1,
      )
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
          ofType(events, 'community_meetup').length >= 1 &&
          ofType(events, 'travel', 'foreign_travel', 'roadtrip').length >= 1,
      )
    }
    if (applicable('secret_still_together')) {
      push(
        progress,
        'secret_still_together',
        pet.id,
        daysActive >= 90 && experienceCount >= 5,
      )
    }
    if (applicable('secret_unexpected_friend')) {
      push(
        progress,
        'secret_unexpected_friend',
        pet.id,
        ofType(events, 'community_meetup').length >= 1 &&
          ofType(events, 'pet_friend').length >= 1,
      )
    }
    if (applicable('secret_show_heart')) {
      push(
        progress,
        'secret_show_heart',
        pet.id,
        shows.length >= 1 && ofType(events, 'birth').length >= 1,
      )
    }
  }

  return progress
}

/** Progress for active challenges (for UI). */
export function computeChallengeProgress(
  ctx: BadgeEvalContext,
  pet: Pet,
): ChallengeProgress[] {
  const events = petEvents(ctx.calendarEvents, pet.name)
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

    if (item.level > existing.level) {
      const upgraded: EarnedBadge = {
        ...existing,
        level: item.level,
        earnedAt: todayIso,
        revealed: true,
      }
      byKey.set(key, upgraded)
      newlyAwarded.push(upgraded)
    }
  }

  return { next: Array.from(byKey.values()), newlyAwarded }
}

export function toIsoDay(date = new Date()): string {
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
