import type { CalendarEvent, HealthRecord, Pet } from '../types'
import { APP_TODAY, parseCzechDate } from './dashboardDates'
import { getEventTypeLabel } from './calendarEventTypes'
import { eventOccursOnDate } from './calendarRecurrence'
import { isMedicationCurrentlyActive } from './medicationReminders'

export type DailyCareTask = {
  id: string
  title: string
  detail?: string
  time?: string
  kind: 'medication' | 'calendar'
}

function toIsoDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dailyCareStorageKey(petId: string, day: Date = APP_TODAY): string {
  return `lovedandknown.dailyCare.${petId}.${toIsoDay(day)}`
}

export function loadDailyCareCompleted(petId: string, day: Date = APP_TODAY): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(dailyCareStorageKey(petId, day))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveDailyCareCompleted(
  petId: string,
  completedIds: string[],
  day: Date = APP_TODAY,
): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      dailyCareStorageKey(petId, day),
      JSON.stringify(completedIds),
    )
  } catch {
    // ignore quota
  }
}

function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const iso = toIsoDay(day)

  if (event.type === 'heat') {
    const endIso = event.actualEndDate || event.expectedEndDate || event.date
    return iso >= event.date && iso <= endIso
  }

  if (event.type === 'pregnancy' && event.expectedBirthDate) {
    return iso >= event.date && iso <= event.expectedBirthDate
  }

  return eventOccursOnDate(event, iso)
}

/** Tasks relevant for the pet on a given day (meds + calendar). */
export function buildDailyCareTasks(
  pet: Pet,
  healthRecords: HealthRecord[],
  calendarEvents: CalendarEvent[],
  day: Date = APP_TODAY,
): DailyCareTask[] {
  const tasks: DailyCareTask[] = []

  const meds = healthRecords.filter(
    (r) => r.petId === pet.id && r.type === 'medication' && isMedicationCurrentlyActive(r),
  )

  for (const med of meds) {
    const start = parseCzechDate(med.date)
    if (start && day.getTime() < start.getTime() - 12 * 60 * 60 * 1000) continue

    tasks.push({
      id: `med:${med.id}`,
      title: med.subtitle || med.title,
      detail: med.dosage,
      time: med.scheduleTime,
      kind: 'medication',
    })
  }

  const events = calendarEvents.filter(
    (event) =>
      (event.petId === pet.id || event.petName === pet.name) && eventOccursOnDay(event, day),
  )

  for (const event of events) {
    if (event.sourceRecordId && tasks.some((t) => t.id === `med:${event.sourceRecordId}`)) {
      continue
    }
    tasks.push({
      id: `event:${event.id}`,
      title: event.title || getEventTypeLabel(event.type),
      detail: event.location || event.notes,
      time: event.time,
      kind: 'calendar',
    })
  }

  return tasks.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
}

export function dailyCareCompletionPercent(total: number, completed: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}
