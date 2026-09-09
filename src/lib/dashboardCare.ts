import type { CalendarEvent, EventType, HealthRecord, Pet } from '../types'
import {
  buildDailyCareTasks,
  loadDailyCareCompleted,
  type DailyCareTask,
} from './dailyCareChecklist'
import {
  APP_TODAY,
  daysUntil,
  getPetStatusBadge,
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

export function buildDashboardHealthAlerts(
  pets: Pet[],
  healthRecords: HealthRecord[],
  calendarEvents: CalendarEvent[],
): DashboardHealthAlert[] {
  const alerts: DashboardHealthAlert[] = []

  for (const pet of pets) {
    if (pet.lostStatus === 'lost') continue

    if (pet.healthStatus === 'urgent') {
      alerts.push({
        id: `urgent-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – vyžaduje naléhavou pozornost`,
        urgency: 'urgent',
        href: `/pets/${pet.id}?tab=health`,
      })
      continue
    }

    const activeMeds = healthRecords.filter(
      (r) => r.petId === pet.id && r.type === 'medication' && isMedicationCurrentlyActive(r),
    )
    if (activeMeds.length > 0) {
      alerts.push({
        id: `med-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – čeká vás léčba`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
      })
    }

    const badge = getPetStatusBadge(pet, calendarEvents)
    if (badge.label.startsWith('Očkování za')) {
      alerts.push({
        id: `vax-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message: `${pet.name} – ${badge.label.toLowerCase()}`,
        urgency: badge.variant === 'warning' ? 'attention' : 'attention',
        href: `/pets/${pet.id}?tab=health`,
      })
    } else if (pet.healthStatus === 'attention' || pet.healthStatus === 'vet_check') {
      alerts.push({
        id: `status-${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        message:
          pet.healthStatus === 'vet_check'
            ? `${pet.name} – doporučena kontrola`
            : `${pet.name} – vyžaduje pozornost`,
        urgency: 'attention',
        href: `/pets/${pet.id}?tab=health`,
      })
    }

    // Upcoming vaccination from health records within 30 days (if not already covered)
    if (!alerts.some((a) => a.id === `vax-${pet.id}`)) {
      const nextVax = healthRecords
        .filter((r) => r.petId === pet.id && r.type === 'vaccination' && r.nextDueDate)
        .map((r) => ({ record: r, due: parseCzechDate(r.nextDueDate!) }))
        .filter((item) => item.due && item.due >= APP_TODAY)
        .sort((a, b) => (a.due!.getTime() - b.due!.getTime()))[0]

      if (nextVax?.due) {
        const days = daysUntil(APP_TODAY, nextVax.due)
        if (days <= 30) {
          alerts.push({
            id: `vax-${pet.id}`,
            petId: pet.id,
            petName: pet.name,
            message: `${pet.name} – očkování za ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`,
            urgency: 'attention',
            href: `/pets/${pet.id}?tab=health`,
          })
        }
      }
    }
  }

  // Deduplicate by pet preferring urgent, then med, then vax
  const byPet = new Map<string, DashboardHealthAlert>()
  const rank = (a: DashboardHealthAlert) => {
    if (a.urgency === 'urgent') return 0
    if (a.id.startsWith('med-')) return 1
    if (a.id.startsWith('vax-')) return 2
    return 3
  }
  for (const alert of alerts) {
    const existing = byPet.get(alert.petId)
    if (!existing || rank(alert) < rank(existing)) {
      byPet.set(alert.petId, alert)
    }
  }

  return [...byPet.values()].sort((a, b) => rank(a) - rank(b))
}

export function buildUrgentHealthAlerts(
  alerts: DashboardHealthAlert[],
): DashboardHealthAlert[] {
  return alerts.filter((a) => a.urgency === 'urgent')
}

export function buildSoftHealthAlerts(
  alerts: DashboardHealthAlert[],
): DashboardHealthAlert[] {
  return alerts.filter((a) => a.urgency === 'attention').slice(0, 4)
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
