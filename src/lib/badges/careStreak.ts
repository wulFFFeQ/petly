import type { CalendarEvent, HealthRecord, Pet } from '../../types'
import {
  APP_TODAY,
  parseEventDate,
} from '../dashboardDates'
import {
  buildDailyCareTasks,
  loadDailyCareCompleted,
} from '../dailyCareChecklist'

function addDays(base: Date, delta: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + delta)
  d.setHours(12, 0, 0, 0)
  return d
}

/**
 * Full daily-care streak: consecutive days with scheduled tasks all completed.
 * Days with zero tasks are skipped (do not break, do not count).
 */
export function computeFullCareStreak(
  pet: Pet,
  healthRecords: HealthRecord[],
  calendarEvents: CalendarEvent[],
  through: Date = APP_TODAY,
): number {
  if (typeof window === 'undefined') return 0

  let streak = 0
  for (let i = 0; i < 120; i += 1) {
    const day = addDays(through, -i)
    const tasks = buildDailyCareTasks(pet, healthRecords, calendarEvents, day)
    if (tasks.length === 0) continue

    const done = new Set(loadDailyCareCompleted(pet.id, day))
    if (!tasks.every((t) => done.has(t.id))) break
    streak += 1
  }
  return streak
}

/** Active care: consecutive days with at least one care task completed. */
export function computeActiveCareStreak(
  pet: Pet,
  healthRecords: HealthRecord[],
  calendarEvents: CalendarEvent[],
  through: Date = APP_TODAY,
): number {
  if (typeof window === 'undefined') return 0

  let streak = 0
  for (let i = 0; i < 120; i += 1) {
    const day = addDays(through, -i)
    const tasks = buildDailyCareTasks(pet, healthRecords, calendarEvents, day)
    if (tasks.length === 0) continue

    const done = loadDailyCareCompleted(pet.id, day)
    if (!tasks.some((t) => done.includes(t.id))) break
    streak += 1
  }
  return streak
}

export const HEALTH_CALENDAR_TYPES = new Set([
  'vet',
  'vaccination',
  'deworming',
  'antiparasitic',
  'medication',
  'examination',
  'lab',
  'surgery',
  'rehab',
  'dental',
])

export function countHealthEventCompliance(
  petId: string,
  petName: string,
  calendarEvents: CalendarEvent[],
  through: Date = APP_TODAY,
): { completed: number; missed: number } {
  if (typeof window === 'undefined') return { completed: 0, missed: 0 }

  const throughTime = through.getTime()
  let completed = 0
  let missed = 0

  for (const event of calendarEvents) {
    if (event.petName !== petName) continue
    if (!HEALTH_CALENDAR_TYPES.has(event.type)) continue
    if (event.sourceRecordId) continue

    const eventDay = parseEventDate(event.date)
    if (Number.isNaN(eventDay.getTime())) continue
    eventDay.setHours(12, 0, 0, 0)
    if (eventDay.getTime() > throughTime) continue

    const done = new Set(loadDailyCareCompleted(petId, eventDay))
    if (done.has(`event:${event.id}`)) {
      completed += 1
    } else if (eventDay.getTime() < throughTime - 20 * 60 * 60 * 1000) {
      missed += 1
    }
  }

  return { completed, missed }
}
