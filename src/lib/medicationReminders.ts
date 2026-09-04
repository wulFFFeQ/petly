import type { AppNotification, CalendarEvent, HealthRecord, Pet } from '../types'
import { parseCzechDate } from './dashboardDates'

export const REMINDER_DURATION_PRESETS = [
  { value: 1, label: '1 den' },
  { value: 3, label: '3 dny' },
  { value: 5, label: '5 dní' },
  { value: 7, label: '1 týden' },
  { value: 14, label: '2 týdny' },
  { value: 21, label: '3 týdny' },
  { value: 30, label: '1 měsíc' },
] as const

export const MAX_REMINDER_DAYS = 30

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatCzechShort(date: Date): string {
  return `${date.getDate()}. ${date.getMonth() + 1}.`
}

export function normalizeReminderDays(days?: number): number {
  if (days == null || Number.isNaN(days)) return 7
  return Math.max(1, Math.min(Math.round(days), MAX_REMINDER_DAYS))
}

export function formatReminderDaysLabel(days: number): string {
  const n = normalizeReminderDays(days)
  if (n === 1) return '1 den'
  if (n >= 2 && n <= 4) return `${n} dny`
  return `${n} dní`
}

/** Resolve when the reminder series should start (ISO date + HH:mm). */
export function resolveReminderSchedule(record: HealthRecord): { date: string; time: string } {
  const time =
    record.scheduleTime && /^\d{1,2}:\d{2}$/.test(record.scheduleTime.trim())
      ? record.scheduleTime.trim()
      : '09:00'

  const today = new Date()
  today.setHours(12, 0, 0, 0)

  const parsed = parseCzechDate(record.date)
  if (parsed) {
    const scheduled = new Date(parsed)
    scheduled.setHours(12, 0, 0, 0)
    if (scheduled.getTime() >= today.getTime() - 12 * 60 * 60 * 1000) {
      return { date: toIsoDate(scheduled), time }
    }
  }

  // Past one-off date or active daily med → start today
  return { date: toIsoDate(today), time }
}

export function buildMedicationReminderEvents(
  record: HealthRecord,
  petName: string,
): CalendarEvent[] {
  const { date, time } = resolveReminderSchedule(record)
  const days = normalizeReminderDays(record.reminderDays)
  const start = new Date(`${date}T12:00:00`)

  return Array.from({ length: days }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return {
      id: `cal_rem_${record.id}_${index}`,
      title: `Lék · ${record.subtitle}`,
      petName,
      type: 'medication' as const,
      date: toIsoDate(day),
      time,
      location: 'Doma',
      notes: [
        `Den ${index + 1} z ${days}`,
        record.dosage ? `Dávkování: ${record.dosage}` : null,
        'Připomínka z profilu mazlíčka',
      ]
        .filter(Boolean)
        .join(' · '),
      sourceRecordId: record.id,
    }
  })
}

/** @deprecated use buildMedicationReminderEvents */
export function buildMedicationReminderEvent(
  record: HealthRecord,
  petName: string,
): CalendarEvent {
  return buildMedicationReminderEvents(record, petName)[0]
}

export function buildMedicationReminderNotification(
  record: HealthRecord,
  petName: string,
): AppNotification {
  const { date, time } = resolveReminderSchedule(record)
  const days = normalizeReminderDays(record.reminderDays)
  const start = new Date(`${date}T12:00:00`)
  const end = new Date(start)
  end.setDate(start.getDate() + days - 1)

  const today = new Date()
  const isToday =
    start.getFullYear() === today.getFullYear() &&
    start.getMonth() === today.getMonth() &&
    start.getDate() === today.getDate()

  const rangeLabel =
    days === 1
      ? isToday
        ? `Dnes v ${time}`
        : `${formatCzechShort(start)} v ${time}`
      : `${isToday ? 'Dnes' : formatCzechShort(start)}–${formatCzechShort(end)} · denně v ${time}`

  return {
    id: `n_rem_${record.id}`,
    title: `Připomínka léku (${formatReminderDaysLabel(days)}): ${record.subtitle}`,
    time: `${rangeLabel} · ${petName}`,
    unread: true,
    kind: 'medication_reminder',
    sourceRecordId: record.id,
  }
}

export function petNameForRecord(pets: Pet[], petId: string): string {
  return pets.find((pet) => pet.id === petId)?.name ?? 'Mazlíček'
}
