import type {
  CalendarEvent,
  CommunityPost,
  HealthRecord,
  Pet,
  PetDocument,
} from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { BADGE_CATALOG } from './catalog'

const USER_AUTHOR = 'Tereza V.'

export interface BadgeEvalContext {
  pets: Pet[]
  healthRecords: HealthRecord[]
  documents: PetDocument[]
  posts: CommunityPost[]
  calendarEvents: CalendarEvent[]
  /** True when an action happened during night hours (23–5). */
  nightOwlEligible: boolean
  /** ISO date for new awards (YYYY-MM-DD). */
  todayIso: string
}

export interface BadgeProgress {
  badgeId: string
  petId?: string
  /** Highest level currently satisfied (0 = not earned). */
  level: number
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim())
}

function isProfileComplete(pet: Pet): boolean {
  return (
    hasText(pet.dateOfBirth) &&
    hasText(pet.gender) &&
    pet.weight != null &&
    pet.weight > 0 &&
    hasText(pet.microchip) &&
    pet.neutered != null
  )
}

function isProfileLifestyleFilled(pet: Pet): boolean {
  return (
    hasText(pet.diet) ||
    hasText(pet.favoriteToy) ||
    hasText(pet.supplements) ||
    pet.healthAssessment != null
  )
}

function petHealth(records: HealthRecord[], petId: string): HealthRecord[] {
  return records.filter((r) => r.petId === petId)
}

function petDocs(documents: PetDocument[], petId: string): PetDocument[] {
  return documents.filter((d) => d.petId === petId)
}

function petEvents(events: CalendarEvent[], petName: string): CalendarEvent[] {
  return events.filter((e) => e.petName === petName)
}

function petPosts(posts: CommunityPost[], petId: string): CommunityPost[] {
  return posts.filter((p) => p.petId === petId)
}

const TRAINING_TYPES = new Set(['training', 'agility', 'socialization', 'course'])
const ACTIVITY_TYPES = new Set([
  ...TRAINING_TYPES,
  'trip',
  'travel',
  'grooming',
  'bathing',
  'doggy_daycare',
  'community_meetup',
])

function countOwnComments(posts: CommunityPost[]): number {
  let count = 0
  for (const post of posts) {
    if (post.author === USER_AUTHOR) continue
    for (const comment of post.comments ?? []) {
      if (comment.author === USER_AUTHOR) count += 1
    }
  }
  return count
}

function countOwnLikes(posts: CommunityPost[]): number {
  return posts.filter((p) => p.author !== USER_AUTHOR && p.liked).length
}

function carefulProfileLevel(
  pet: Pet,
  health: HealthRecord[],
  docs: PetDocument[],
  events: CalendarEvent[],
): number {
  let level = 1
  if (isProfileComplete(pet)) level = 2
  if (level >= 2 && isProfileLifestyleFilled(pet)) level = 3
  if (level >= 3 && health.length >= 3) level = 4
  if (
    level >= 4 &&
    health.some((r) => r.type === 'vaccination') &&
    docs.length >= 1 &&
    events.length >= 1
  ) {
    level = 5
  }
  return level
}

function userGuardianLevel(ctx: BadgeEvalContext): number {
  if (ctx.pets.length === 0) return 0
  const complete = ctx.pets.filter(isProfileComplete)
  if (complete.length === 0) return 0
  let level = 1
  if (complete.length === ctx.pets.length) level = 2
  if (
    level >= 2 &&
    ctx.pets.every((pet) => petHealth(ctx.healthRecords, pet.id).length >= 3)
  ) {
    level = 3
  }
  return level
}

/** Compute current progress for all badges (pet + user). */
export function computeBadgeProgress(ctx: BadgeEvalContext): BadgeProgress[] {
  const progress: BadgeProgress[] = []

  for (const pet of ctx.pets) {
    const health = petHealth(ctx.healthRecords, pet.id)
    const docs = petDocs(ctx.documents, pet.id)
    const events = petEvents(ctx.calendarEvents, pet.name)
    const posts = petPosts(ctx.posts, pet.id)

    progress.push({
      badgeId: 'pet_new_home',
      petId: pet.id,
      level: 1,
    })

    progress.push({
      badgeId: 'pet_careful_profile',
      petId: pet.id,
      level: carefulProfileLevel(pet, health, docs, events),
    })

    const ageYears = pet.age ?? 0
    const hasBirthdayEvent = events.some((e) => e.type === 'birthday')
    if (ageYears >= 1 || hasBirthdayEvent) {
      progress.push({ badgeId: 'pet_first_birthday', petId: pet.id, level: 1 })
    }

    const hasAdoption = events.some((e) => e.type === 'adoption_anniversary')
    if (hasAdoption) {
      progress.push({ badgeId: 'pet_adoption_anniversary', petId: pet.id, level: 1 })
      progress.push({ badgeId: 'secret_adoption_day', petId: pet.id, level: 1 })
    }

    if (
      hasAdoption ||
      hasBirthdayEvent ||
      events.some((e) => e.type === 'birth' || e.type === 'litter_check')
    ) {
      progress.push({ badgeId: 'pet_life_milestone', petId: pet.id, level: 1 })
    }

    if (health.some((r) => r.type === 'vaccination')) {
      progress.push({ badgeId: 'pet_vaccination_log', petId: pet.id, level: 1 })
    }

    if (
      health.some((r) => r.type === 'vet' || r.type === 'examination') ||
      events.some((e) => e.type === 'vet' || e.type === 'examination' || e.type === 'dental')
    ) {
      progress.push({ badgeId: 'pet_vet_care', petId: pet.id, level: 1 })
    }

    if (pet.weight != null && pet.weight > 0) {
      progress.push({ badgeId: 'pet_weight_tracking', petId: pet.id, level: 1 })
    }

    if (health.length >= 5) {
      progress.push({ badgeId: 'pet_health_history', petId: pet.id, level: 1 })
    }

    if (events.some((e) => TRAINING_TYPES.has(e.type))) {
      progress.push({ badgeId: 'pet_first_training', petId: pet.id, level: 1 })
    }

    if (events.filter((e) => ACTIVITY_TYPES.has(e.type)).length >= 3) {
      progress.push({ badgeId: 'pet_regular_activity', petId: pet.id, level: 1 })
    }

    if (events.some((e) => e.type === 'trip')) {
      progress.push({ badgeId: 'pet_trip', petId: pet.id, level: 1 })
    }

    if (events.some((e) => e.type === 'travel')) {
      progress.push({ badgeId: 'pet_travel', petId: pet.id, level: 1 })
      progress.push({ badgeId: 'secret_pet_traveler', petId: pet.id, level: 1 })
    }

    if (posts.length >= 1) {
      progress.push({ badgeId: 'pet_first_community_post', petId: pet.id, level: 1 })
    }

    if (posts.some((p) => p.likes > 0 || p.commentsCount > 0)) {
      progress.push({ badgeId: 'pet_community_partner', petId: pet.id, level: 1 })
    }

    if (isProfileComplete(pet) && health.length >= 8) {
      progress.push({ badgeId: 'secret_evergreen', petId: pet.id, level: 1 })
    }
  }

  const guardian = userGuardianLevel(ctx)
  if (guardian > 0) {
    progress.push({ badgeId: 'user_careful_guardian', level: guardian })
  }

  if (ctx.healthRecords.length >= 3) {
    progress.push({ badgeId: 'user_health_overview', level: 1 })
  }

  if (ctx.calendarEvents.length >= 1) {
    progress.push({ badgeId: 'user_calendar_ok', level: 1 })
  }

  if (ctx.documents.length >= 1) {
    progress.push({ badgeId: 'user_documenter', level: 1 })
  }

  if (ctx.posts.some((p) => p.author === USER_AUTHOR)) {
    progress.push({ badgeId: 'user_community_voice', level: 1 })
  }

  if (countOwnComments(ctx.posts) >= 1) {
    progress.push({ badgeId: 'user_helps_others', level: 1 })
  }

  if (countOwnLikes(ctx.posts) >= 1) {
    progress.push({ badgeId: 'user_community_heart', level: 1 })
  }

  if (ctx.calendarEvents.some((e) => ACTIVITY_TYPES.has(e.type))) {
    progress.push({ badgeId: 'user_adventurer', level: 1 })
  }

  if (ctx.calendarEvents.some((e) => e.type === 'travel' || e.type === 'trip')) {
    progress.push({ badgeId: 'user_traveler', level: 1 })
  }

  if (ctx.nightOwlEligible) {
    progress.push({ badgeId: 'secret_night_owl', level: 1 })
  }

  if (ctx.healthRecords.length >= 10) {
    progress.push({ badgeId: 'secret_health_archive', level: 1 })
  }

  if (countOwnComments(ctx.posts) >= 3) {
    progress.push({ badgeId: 'secret_community_helper', level: 1 })
  }

  return progress
}

function awardKey(badgeId: string, petId?: string): string {
  return petId ? `${badgeId}::${petId}` : badgeId
}

/**
 * Merge computed progress into earned badges.
 * Returns next state + list of newly awarded (or leveled-up) badges for toasts.
 */
export function mergeBadgeAwards(
  previous: EarnedBadge[],
  progress: BadgeProgress[],
  todayIso: string,
): { next: EarnedBadge[]; newlyAwarded: EarnedBadge[] } {
  const byKey = new Map<string, EarnedBadge>()
  for (const earned of previous) {
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
