import type {
  CalendarEvent,
  EventType,
  HealthRecord,
  NotificationPriority,
  NotificationType,
  Pet,
} from '../../types'
import { getEventTypeLabel } from '../calendarEventTypes'
import {
  APP_TODAY,
  daysUntil,
  formatUpcomingDate,
  isSameDay,
  parseCzechDate,
  parseEventDate,
} from '../dashboardDates'
import type { NotificationDraft } from './model'

const BREEDING_TYPES = new Set<EventType>([
  'heat',
  'mating',
  'pregnancy',
  'pregnancy_check',
  'birth',
  'litter_check',
  'weaning',
  'breeding_other',
])

const SKIP_EVENT_TYPES = new Set<EventType>([
  'feeding',
  'walk',
  'document_expiry',
])

function mapEventType(type: EventType): NotificationType {
  if (type === 'vaccination') return 'vaccination'
  if (type === 'vet' || type === 'checkup' || type === 'examination') return 'vet'
  if (type === 'medication') return 'medication'
  if (BREEDING_TYPES.has(type)) return 'breeding'
  return 'calendar'
}

function bucketForDays(days: number): 'overdue' | 'today' | 'upcoming' | null {
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days >= 1 && days <= 7) return 'upcoming'
  return null
}

function priorityFor(
  type: NotificationType,
  bucket: 'overdue' | 'today' | 'upcoming',
): NotificationPriority {
  if (bucket === 'overdue') return 'important'
  if (bucket === 'today' && (type === 'vet' || type === 'vaccination')) return 'important'
  return 'normal'
}

function titleForEvent(
  event: CalendarEvent,
  petName: string,
  bucket: 'overdue' | 'today' | 'upcoming',
): string {
  const label = event.title?.trim() || getEventTypeLabel(event.type)
  if (bucket === 'overdue') return `Zmeškaná událost: ${label}`
  if (bucket === 'today') return `Dnes: ${label} · ${petName}`
  return `Blížící se: ${label} · ${petName}`
}

function messageForEvent(
  event: CalendarEvent,
  petName: string,
  bucket: 'overdue' | 'today' | 'upcoming',
): string {
  const when =
    bucket === 'today'
      ? event.time
        ? `Dnes v ${event.time}`
        : 'Dnes'
      : bucket === 'overdue'
        ? `Termín ${formatUpcomingDate(event.date, event.time)}`
        : formatUpcomingDate(event.date, event.time)
  return `${when} · ${petName}`
}

export function buildCalendarNotificationDrafts(
  events: CalendarEvent[],
  pets: Pet[],
): NotificationDraft[] {
  const drafts: NotificationDraft[] = []
  const petName = (petId: string) => pets.find((p) => p.id === petId)?.name ?? 'Mazlíček'

  for (const event of events) {
    if (SKIP_EVENT_TYPES.has(event.type)) continue
    // Medication reminders are owned by medicationReminders.ts
    if (event.sourceRecordId && event.type === 'medication') continue

    const date = parseEventDate(event.date)
    if (Number.isNaN(date.getTime())) continue
    const days = daysUntil(APP_TODAY, date)
    const bucket = bucketForDays(days)
    if (!bucket) continue

    const type = mapEventType(event.type)
    const name = petName(event.petId ?? '')
    drafts.push({
      id: `n_cal_${event.id}_${bucket}`,
      type,
      title: titleForEvent(event, name, bucket),
      message: messageForEvent(event, name, bucket),
      priority: priorityFor(type, bucket),
      dedupeKey: `cal:${event.id}:${bucket}`,
      petId: event.petId,
      petName: name,
      href: `/calendar?eventId=${encodeURIComponent(event.id)}`,
      sourceEventId: event.id,
      time: messageForEvent(event, name, bucket),
    })
  }

  return drafts
}

export function buildHealthNotificationDrafts(
  records: HealthRecord[],
  pets: Pet[],
): NotificationDraft[] {
  const drafts: NotificationDraft[] = []
  const petName = (petId: string) => pets.find((p) => p.id === petId)?.name ?? 'Mazlíček'

  for (const pet of pets) {
    if (pet.lostStatus === 'lost') continue

    if (pet.healthStatus === 'urgent' || pet.healthAssessment?.urgentWarning) {
      const message =
        pet.healthAssessment?.urgentWarning ||
        `${pet.name} vyžaduje naléhavou pozornost.`
      drafts.push({
        id: `n_health_urgent_${pet.id}`,
        type: 'health',
        title: `${pet.name} – naléhavá zdravotní pozornost`,
        message,
        priority: 'urgent',
        dedupeKey: `health:urgent:${pet.id}`,
        petId: pet.id,
        petName: pet.name,
        href: `/pets/${pet.id}?tab=health`,
        time: message,
      })
    }
  }

  for (const record of records) {
    const name = petName(record.petId)

    if (record.type === 'vaccination' && record.nextDueDate) {
      const due = parseCzechDate(record.nextDueDate) ?? parseEventDate(record.nextDueDate)
      if (!Number.isNaN(due.getTime())) {
        const days = daysUntil(APP_TODAY, due)
        if (days < 0) {
          drafts.push({
            id: `n_vax_${record.id}_overdue`,
            type: 'vaccination',
            title: `Zmeškané očkování u ${name}`,
            message: `${record.subtitle || record.title} · mělo být ${record.nextDueDate}`,
            priority: 'important',
            dedupeKey: `vax:${record.id}:overdue`,
            petId: record.petId,
            petName: name,
            href: `/pets/${record.petId}?tab=health`,
            sourceRecordId: record.id,
            time: record.nextDueDate,
          })
        } else if (days <= 14) {
          const when = isSameDay(due, APP_TODAY)
            ? 'Dnes'
            : days === 1
              ? 'Zítra'
              : `Za ${days} dní`
          drafts.push({
            id: `n_vax_${record.id}_upcoming`,
            type: 'vaccination',
            title: `Naplánované očkování u ${name}`,
            message: `${record.subtitle || record.title} · ${when}`,
            priority: days <= 3 ? 'important' : 'normal',
            dedupeKey: `vax:${record.id}:upcoming`,
            petId: record.petId,
            petName: name,
            href: `/pets/${record.petId}?tab=health`,
            sourceRecordId: record.id,
            time: `${when} · ${name}`,
          })
        }
      }
    }

    if (
      record.status === 'scheduled' &&
      (record.type === 'vet' || record.type === 'examination' || record.type === 'vaccination')
    ) {
      const due = parseCzechDate(record.date)
      if (!due) continue
      const days = daysUntil(APP_TODAY, due)
      const bucket = bucketForDays(days)
      if (!bucket) continue

      const type: NotificationType =
        record.type === 'vaccination' ? 'vaccination' : record.type === 'vet' ? 'vet' : 'health'
      const label = record.subtitle || record.title
      drafts.push({
        id: `n_rec_${record.id}_${bucket}`,
        type,
        title:
          bucket === 'overdue'
            ? `Zmeškaný termín: ${label}`
            : bucket === 'today'
              ? `Dnes: ${label} · ${name}`
              : `${label} u ${name}`,
        message:
          bucket === 'overdue'
            ? `Termín ${record.date} · ${name}`
            : `${record.date}${record.doctor ? ` · ${record.doctor}` : ''} · ${name}`,
        priority: bucket === 'overdue' || bucket === 'today' ? 'important' : 'normal',
        dedupeKey: `record:${record.id}:${bucket}`,
        petId: record.petId,
        petName: name,
        href: `/pets/${record.petId}?tab=health`,
        sourceRecordId: record.id,
        time: record.date,
      })
    }
  }

  return drafts
}
