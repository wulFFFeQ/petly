import type { CalendarEvent, EventType, HealthRecord, Pet } from '../types'
import {
  buildDailyCareTasks,
  loadDailyCareCompleted,
  type DailyCareTask,
} from './dailyCareChecklist'
import {
  APP_TODAY,
  daysUntil,
  parseCzechDate,
  parseEventDate,
} from './dashboardDates'
import { getEventTypeLabel } from './calendarEventTypes'
import { isMedicationCurrentlyActive } from './medicationReminders'

/** Types that can be marked done from the dashboard (daily care / preventive). */
const COMPLETABLE_EVENT_TYPES = new Set<EventType>([
  'medication',
  'feeding',
  'grooming',
  'bathing',
  'nail_trim',
  'teeth_cleaning',
  'ear_cleaning',
  'coat_care',
  'deworming',
  'antiparasitic',
  'vaccination',
  'dental',
  'rehab',
])

export type DashboardTodayItem = {
  id: string
  petId: string
  petName: string
  petImage?: string
  label: string
  detail?: string
  time?: string
  kind: DailyCareTask['kind']
  eventType?: EventType
  eventId?: string
  recordId?: string
  completable: boolean
}

export type DashboardHealthAlert = {
  id: string
  petId: string
  petName: string
  message: string
  urgency: 'urgent' | 'attention'
  href: string
  /** Lower = higher priority */
  priority: number
}

export function isCompletableEventType(type: EventType): boolean {
  return COMPLETABLE_EVENT_TYPES.has(type)
}

export function isCompletableDailyTask(
  task: DailyCareTask,
  calendarEvents: CalendarEvent[],
): boolean {
  if (task.kind === 'medication') return true
  const eventId = task.id.replace(/^event:/, '')
  const event = calendarEvents.find((item) => item.id === eventId)
  if (!event) return false
  return isCompletableEventType(event.type)
}

export function buildDashboardTodayItems(
  pets: Pet[],
  healthRecords: HealthRecord[],
  calendarEvents: CalendarEvent[],
): DashboardTodayItem[] {
  const items: DashboardTodayItem[] = []

  for (const pet of pets) {
    const tasks = buildDailyCareTasks(pet, healthRecords, calendarEvents, APP_TODAY)
    for (const task of tasks) {
      const completable = isCompletableDailyTask(task, calendarEvents)
      let eventType: EventType | undefined
      let eventId: string | undefined
      let recordId: string | undefined
      let label = task.title

      if (task.kind === 'medication') {
        recordId = task.id.replace(/^med:/, '')
        eventType = 'medication'
        label = task.title || 'Léky / léčba'
      } else {
        eventId = task.id.replace(/^event:/, '')
        const event = calendarEvents.find((item) => item.id === eventId)
        eventType = event?.type
        label = event ? getEventTypeLabel(event.type) : task.title
      }

      items.push({
        id: task.id,
        petId: pet.id,
        petName: pet.name,
        petImage: pet.image,
        label,
        detail: task.detail,
        time: task.time,
        kind: task.kind,
        eventType,
        eventId,
        recordId,
        completable,
      })
    }
  }

  return items.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
}

export function loadAllDailyCareCompleted(
  pets: Pet[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const pet of pets) {
    map[pet.id] = loadDailyCareCompleted(pet.id, APP_TODAY)
  }
  return map
}

/**
 * Pouze skutečná zdravotní pozornost — ne běžné budoucí preventivní termíny
 * (očkování za týdny, odčervení, plánované kontroly), které patří do Nadchází.
 */
export function buildDashboardHealthAlerts(
  pets: Pet[],
  healthRecords: HealthRecord[],
  _calendarEvents: CalendarEvent[],
): DashboardHealthAlert[] {
  const alerts: DashboardHealthAlert[] = []

  for (const pet of pets) {
    if (pet.lostStatus === 'lost') continue

    if (pet.healthStatus === 'urgent' || pet.healthAssessment?.urgentWarning) {
      alerts.push({
        id: `urgent-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message:
          pet.healthAssessment?.urgentWarning ||
          `${pet.name} – vyžaduje naléhavou pozornost`,
        urgency: 'urgent',
        href: `/pets/${pet.id}?tab=health`,
        priority: 0,
      })
    } else if (pet.healthStatus === 'attention') {
      alerts.push({
        id: `status-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – vyžaduje pozornost`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
        priority: 1,
      })
    } else if (pet.healthStatus === 'vet_check') {
      alerts.push({
        id: `status-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – čeká vás kontrola`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
        priority: 2,
      })
    }

    // Aktivní léčba — ano i když je dnešní dávka v „Dnes“
    const hasActiveTreatment = healthRecords.some(
      (r) => r.petId === pet.id && isMedicationCurrentlyActive(r),
    )
    if (hasActiveTreatment) {
      alerts.push({
        id: `med-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – probíhající léčba`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
        priority: 3,
      })
    }

    // Zmeškané očkování (termín už prošel)
    const overdueVax = healthRecords
      .filter((r) => r.petId === pet.id && r.type === 'vaccination' && r.nextDueDate)
      .map((r) => ({ record: r, due: parseCzechDate(r.nextDueDate!) }))
      .filter((item): item is { record: HealthRecord; due: Date } => {
        if (!item.due) return false
        return daysUntil(APP_TODAY, item.due) < 0
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime())[0]

    if (overdueVax) {
      alerts.push({
        id: `overdue-vax-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – zmeškané očkování`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
        priority: 1,
      })
    }

    // Zmeškané naplánované klinické záznamy
    const overdueScheduled = healthRecords.filter((r) => {
      if (r.petId !== pet.id) return false
      if (r.status !== 'scheduled') return false
      if (r.type !== 'vet' && r.type !== 'examination' && r.type !== 'vaccination') return false
      const due = parseCzechDate(r.date)
      if (!due) return false
      return daysUntil(APP_TODAY, due) < 0
    })[0]

    if (overdueScheduled) {
      alerts.push({
        id: `overdue-${overdueScheduled.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – zmeškaný termín: ${overdueScheduled.subtitle || overdueScheduled.title}`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
        priority: 1,
      })
    }
  }

  // Jedna položka na mazlíčka (nejvyšší priorita), max 3 celkem
  const byPet = new Map<string, DashboardHealthAlert>()
  for (const alert of [...alerts].sort((a, b) => a.priority - b.priority)) {
    if (!byPet.has(alert.petId)) byPet.set(alert.petId, alert)
  }

  return [...byPet.values()].sort((a, b) => a.priority - b.priority).slice(0, 3)
}

export function buildUrgentHealthAlerts(
  alerts: DashboardHealthAlert[],
): DashboardHealthAlert[] {
  return alerts.filter((a) => a.urgency === 'urgent')
}

export function buildSoftHealthAlerts(
  alerts: DashboardHealthAlert[],
): DashboardHealthAlert[] {
  return alerts.filter((a) => a.urgency === 'attention').slice(0, 3)
}

export function sortUpcomingEvents(events: CalendarEvent[], limit = 5): CalendarEvent[] {
  return [...events]
    .filter((e) => parseEventDate(e.date) > APP_TODAY)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
    .slice(0, limit)
}
