import { importantContacts, petTravelPackages } from '../../data/mockData'
import type {
  CalendarEvent,
  CommunityPost,
  HealthRecord,
  Pet,
  PetDocument,
  PetPhoto,
} from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { APP_TODAY, parseEventDate, parseCzechDate } from '../dashboardDates'
import {
  ensurePetFirstSeenDays,
  getWeightMeasurementsForPet,
  isPetProfileShared,
} from './badgeData'
import { BADGE_CATALOG } from './catalog'
import {
  computeActiveCareStreak,
  computeFullCareStreak,
  countHealthEventCompliance,
} from './careStreak'

const USER_AUTHOR = 'Tereza V.'

const TRAINING_TYPES = new Set(['training', 'agility', 'socialization', 'course'])
const ACTIVITY_TYPES = new Set([
  ...TRAINING_TYPES,
  'trip',
  'travel',
  'grooming',
  'bathing',
  'doggy_daycare',
  'community_meetup',
  'exhibition',
  'competition',
])

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

function hasText(value: string | undefined | null): boolean {
  return Boolean(value && value.trim())
}

function isBasicProfileComplete(pet: Pet): boolean {
  return (
    hasText(pet.dateOfBirth) &&
    hasText(pet.gender) &&
    pet.weight != null &&
    pet.weight > 0 &&
    hasText(pet.microchip) &&
    pet.neutered != null
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

function isVaccinationCurrent(records: HealthRecord[]): boolean {
  const vaccines = records.filter((r) => r.type === 'vaccination')
  if (vaccines.length === 0) return false
  return vaccines.some((r) => {
    if (r.status === 'scheduled') return false
    if (r.nextDueDate) {
      const due = parseCzechDate(r.nextDueDate) ?? parseEventDate(r.nextDueDate)
      if (!Number.isNaN(due.getTime()) && due.getTime() < APP_TODAY.getTime()) return false
    }
    return r.status === 'completed' || r.status === 'active' || !r.status
  })
}

function countVetVisits(health: HealthRecord[], events: CalendarEvent[]): number {
  const fromHealth = health.filter(
    (r) => r.type === 'vet' || r.type === 'examination',
  ).length
  const fromCal = events.filter(
    (e) =>
      (e.type === 'vet' || e.type === 'examination' || e.type === 'dental') &&
      !e.sourceRecordId,
  ).length
  return fromHealth + fromCal
}

function activitySpanDays(events: CalendarEvent[]): { count: number; spanDays: number } {
  const activity = events.filter((e) => ACTIVITY_TYPES.has(e.type))
  if (activity.length === 0) return { count: 0, spanDays: 0 }
  const times = activity
    .map((e) => parseEventDate(e.date).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
  if (times.length === 0) return { count: activity.length, spanDays: 0 }
  const spanDays = Math.floor((times[times.length - 1]! - times[0]!) / (24 * 60 * 60 * 1000))
  return { count: activity.length, spanDays }
}

function meaningfulCommunityScore(
  posts: CommunityPost[],
  petId: string,
): number {
  let score = 0
  const own = petPosts(posts, petId)
  for (const post of own) {
    score += Math.min(3, post.likes)
    score += Math.min(3, post.commentsCount)
  }
  for (const post of posts) {
    if (post.author === USER_AUTHOR) continue
    for (const c of post.comments ?? []) {
      if (c.author === USER_AUTHOR) score += 2
    }
    if (post.liked) score += 1
  }
  return score
}

function isTravelPackReady(petId: string): boolean {
  const pack = petTravelPackages.find((p) => p.petId === petId)
  if (!pack) return false
  return (
    pack.euPassport.status === 'valid' &&
    pack.documents.length > 0 &&
    pack.documents.every((d) => d.ready)
  )
}

function hasQuietHeroSetup(pet: Pet, health: HealthRecord[]): boolean {
  const hasVet = importantContacts.some((c) => c.type === 'vet' && hasText(c.phone))
  const hasEmergency = importantContacts.some(
    (c) => c.type === 'emergency' && hasText(c.phone),
  )
  const hasEmergencyPerson = importantContacts.some(
    (c) => c.type === 'emergency_person' && hasText(c.phone),
  )
  const hasHealthProfile =
    isBasicProfileComplete(pet) &&
    (health.length >= 2 || health.some((r) => r.type === 'vaccination'))
  return hasVet && hasEmergency && hasEmergencyPerson && hasHealthProfile
}

function usesMultipleCareAreas(
  health: HealthRecord[],
  docs: PetDocument[],
  events: CalendarEvent[],
  photos: number,
  posts: number,
): boolean {
  let areas = 0
  if (health.length >= 1) areas += 1
  if (docs.length >= 1) areas += 1
  if (events.some((e) => ACTIVITY_TYPES.has(e.type) || e.type === 'vet')) areas += 1
  if (photos >= 1) areas += 1
  if (posts >= 1) areas += 1
  return areas >= 3
}

function push(
  progress: BadgeProgress[],
  badgeId: string,
  petId: string,
  level: number,
) {
  if (level < 1) return
  progress.push({ badgeId, petId, level })
}

/** Compute current progress for all pet badges. */
export function computeBadgeProgress(ctx: BadgeEvalContext): BadgeProgress[] {
  const progress: BadgeProgress[] = []

  for (const pet of ctx.pets) {
    const health = petHealth(ctx.healthRecords, pet.id)
    const docs = petDocs(ctx.documents, pet.id)
    const events = petEvents(ctx.calendarEvents, pet.name)
    const posts = petPosts(ctx.posts, pet.id)
    const photoCount = ctx.photos.filter((p) => p.petId === pet.id).length
    const weights = getWeightMeasurementsForPet(pet.id)
    const birthdays = events.filter((e) => e.type === 'birthday')
    const adoptions = events.filter((e) => e.type === 'adoption_anniversary')
    const trips = events.filter((e) => e.type === 'trip')
    const travels = events.filter((e) => e.type === 'travel')
    const trainings = events.filter((e) => TRAINING_TYPES.has(e.type))
    const activeStreak = computeActiveCareStreak(pet, ctx.healthRecords, ctx.calendarEvents)
    const fullStreak = computeFullCareStreak(pet, ctx.healthRecords, ctx.calendarEvents)
    const compliance = countHealthEventCompliance(
      pet.id,
      pet.name,
      ctx.calendarEvents,
    )
    const activity = activitySpanDays(events)
    const daysActive = ensurePetFirstSeenDays(pet.id, ctx.todayIso)

    // Milníky
    if (birthdays.length >= 1) {
      push(progress, 'pet_first_birthday', pet.id, 1)
    }
    if (adoptions.length >= 1) {
      push(progress, 'pet_found_home', pet.id, 1)
    }
    if (
      birthdays.length >= 2 ||
      (birthdays.length >= 1 && adoptions.length >= 1) ||
      (birthdays.length >= 1 && (pet.age ?? 0) >= 2)
    ) {
      push(progress, 'pet_another_year', pet.id, 1)
    }

    // Péče
    if (isBasicProfileComplete(pet)) {
      push(progress, 'pet_seal_of_care', pet.id, 1)
    }
    if (isVaccinationCurrent(health)) {
      push(progress, 'pet_vaccination', pet.id, 1)
    }
    if (countVetVisits(health, events) >= 3) {
      push(progress, 'pet_under_watch', pet.id, 1)
    }
    if (health.length >= 5) {
      push(progress, 'pet_health_chronicler', pet.id, 1)
    }
    if (weights.length >= 5) {
      push(progress, 'pet_keeping_fit', pet.id, 1)
    }
    if (compliance.completed >= 5 && compliance.missed === 0) {
      push(progress, 'pet_never_miss', pet.id, 1)
    }

    // Společný život
    if (trainings.length >= 1) {
      push(progress, 'pet_first_steps', pet.id, 1)
    }
    if (trips.length >= 5) {
      push(progress, 'pet_adventurer', pet.id, 1)
    }
    if (travels.length >= 1) {
      push(progress, 'pet_world_traveler', pet.id, 1)
    }
    if (activeStreak >= 7) {
      push(progress, 'pet_day_partners', pet.id, 1)
    }
    if (activeStreak >= 30) {
      push(progress, 'pet_steady_partner', pet.id, 1)
    }
    if (activity.count >= 8 && activity.spanDays >= 21) {
      push(progress, 'pet_in_shape_together', pet.id, 1)
    }
    if (photoCount >= 10) {
      push(progress, 'pet_photographer', pet.id, 1)
    }
    if (posts.length >= 1) {
      push(progress, 'pet_community_debut', pet.id, 1)
    }
    if (meaningfulCommunityScore(ctx.posts, pet.id) >= 5) {
      push(progress, 'pet_good_partner', pet.id, 1)
    }

    // Tajné
    if (fullStreak >= 7) {
      push(progress, 'secret_steady_care', pet.id, 1)
    }
    if (
      isPetProfileShared(pet.id) &&
      (posts.some((p) => (p.comments ?? []).some((c) => c.author !== USER_AUTHOR)) ||
        meaningfulCommunityScore(ctx.posts, pet.id) >= 3)
    ) {
      push(progress, 'secret_second_home', pet.id, 1)
    }
    if (isTravelPackReady(pet.id) && travels.length >= 1) {
      push(progress, 'secret_travel_way', pet.id, 1)
    }
    if (hasQuietHeroSetup(pet, health)) {
      push(progress, 'secret_quiet_hero', pet.id, 1)
    }
    if (daysActive >= 90 && usesMultipleCareAreas(health, docs, events, photoCount, posts.length)) {
      push(progress, 'secret_my_partner', pet.id, 1)
    }
  }

  return progress
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
