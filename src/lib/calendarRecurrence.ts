import type {
  CalendarEvent,
  EventRecurrence,
  RecurrenceEditScope,
  RecurrenceFrequency,
} from '../types'

export type CalendarOccurrence = CalendarEvent & {
  /** Concrete day this occurrence falls on (YYYY-MM-DD). */
  occurrenceDate: string
  /** Stable id for React keys: `${id}@${occurrenceDate}`. */
  occurrenceId: string
  /** True when this row is expanded from a recurring series (not a one-off). */
  isRecurringOccurrence: boolean
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseIso(iso: string): Date | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  const day = next.getDate()
  next.setMonth(next.getMonth() + months)
  // Clamp overflow (e.g. Jan 31 + 1 month)
  if (next.getDate() < day) {
    next.setDate(0)
  }
  return next
}

function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12)
}

/** JS getDay(): 0=Sun … 6=Sat → app week: 0=Mon … 6=Sun */
export function jsDayToAppWeekDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

export function isRecurring(event: Pick<CalendarEvent, 'recurrence'>): boolean {
  const freq = event.recurrence?.frequency
  return Boolean(freq && freq !== 'none')
}

export function normalizeRecurrence(
  recurrence?: EventRecurrence | null,
): EventRecurrence | undefined {
  if (!recurrence || recurrence.frequency === 'none') return undefined
  const interval = Math.max(1, recurrence.interval ?? 1)
  const customUnit = recurrence.customUnit ?? 'days'
  const weekDaysSource =
    recurrence.frequency === 'weekly' ||
    (recurrence.frequency === 'custom' && customUnit === 'weeks')
      ? recurrence.weekDays
      : undefined
  return {
    frequency: recurrence.frequency,
    interval,
    customUnit: recurrence.frequency === 'custom' ? customUnit : undefined,
    weekDays: weekDaysSource?.length
      ? [...new Set(weekDaysSource)].sort((a, b) => a - b)
      : undefined,
    endDate: recurrence.endDate || undefined,
  }
}

function recurrenceActive(recurrence: EventRecurrence | undefined): recurrence is EventRecurrence {
  return Boolean(recurrence && recurrence.frequency !== 'none')
}

/**
 * Generate occurrence dates for a master event within [rangeStart, rangeEnd] inclusive.
 * Hard-capped to avoid runaway loops (approx. 3 years of daily = ~1100).
 */
export function generateOccurrenceDates(
  event: CalendarEvent,
  rangeStartIso: string,
  rangeEndIso: string,
  maxOccurrences = 1100,
): string[] {
  const start = parseIso(event.date)
  const rangeStart = parseIso(rangeStartIso)
  const rangeEnd = parseIso(rangeEndIso)
  if (!start || !rangeStart || !rangeEnd) return []

  const excluded = new Set(event.excludedDates ?? [])
  const recurrence = normalizeRecurrence(event.recurrence)

  if (!recurrenceActive(recurrence)) {
    if (event.date < rangeStartIso || event.date > rangeEndIso) return []
    if (excluded.has(event.date)) return []
    return [event.date]
  }

  const seriesEnd = recurrence.endDate ? parseIso(recurrence.endDate) : null
  const interval = Math.max(1, recurrence.interval ?? 1)
  const dates: string[] = []

  const hardEnd = seriesEnd && seriesEnd.getTime() < rangeEnd.getTime() ? seriesEnd : rangeEnd

  const usesWeekDays =
    (recurrence.frequency === 'weekly' ||
      (recurrence.frequency === 'custom' && (recurrence.customUnit ?? 'days') === 'weeks')) &&
    recurrence.weekDays?.length

  if (usesWeekDays) {
    // Walk day-by-day from max(start, rangeStart) but respect week intervals from series start.
    let cursor = start.getTime() > rangeStart.getTime() ? new Date(start) : new Date(rangeStart)
    if (cursor.getTime() < start.getTime()) cursor = new Date(start)

    let guard = 0
    while (cursor.getTime() <= hardEnd.getTime() && dates.length < maxOccurrences && guard < maxOccurrences * 2) {
      guard += 1
      const iso = toIsoDate(cursor)
      if (iso >= event.date && iso >= rangeStartIso && iso <= rangeEndIso) {
        const weekIndex = Math.floor(
          (cursor.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
        )
        const inIntervalWeek = weekIndex % interval === 0
        const appDow = jsDayToAppWeekDay(cursor.getDay())
        if (inIntervalWeek && recurrence.weekDays!.includes(appDow) && !excluded.has(iso)) {
          dates.push(iso)
        }
      }
      cursor = addDays(cursor, 1)
    }
    return dates
  }

  let cursor = new Date(start)
  let index = 0
  while (cursor.getTime() <= hardEnd.getTime() && dates.length < maxOccurrences) {
    const iso = toIsoDate(cursor)
    if (iso >= rangeStartIso && iso <= rangeEndIso && !excluded.has(iso)) {
      dates.push(iso)
    }
    if (iso > rangeEndIso && cursor.getTime() > start.getTime()) break

    index += 1
    switch (recurrence.frequency) {
      case 'daily':
        cursor = addDays(start, index * interval)
        break
      case 'custom': {
        const unit = recurrence.customUnit ?? 'days'
        if (unit === 'months') cursor = addMonths(start, index * interval)
        else if (unit === 'weeks') cursor = addDays(start, index * 7 * interval)
        else cursor = addDays(start, index * interval)
        break
      }
      case 'weekly':
        cursor = addDays(start, index * 7 * interval)
        break
      case 'monthly':
        cursor = addMonths(start, index * interval)
        break
      case 'yearly':
        cursor = addYears(start, index * interval)
        break
      default:
        return dates
    }
  }

  return dates
}

export function eventOccursOnDate(event: CalendarEvent, isoDate: string): boolean {
  return generateOccurrenceDates(event, isoDate, isoDate).includes(isoDate)
}

export function expandEventsInRange(
  events: CalendarEvent[],
  rangeStartIso: string,
  rangeEndIso: string,
): CalendarOccurrence[] {
  const out: CalendarOccurrence[] = []

  for (const event of events) {
    // Detached exceptions are one-off on their own date
    if (event.seriesId && event.originalDate) {
      if (
        event.date >= rangeStartIso &&
        event.date <= rangeEndIso &&
        !(event.excludedDates ?? []).includes(event.date)
      ) {
        out.push({
          ...event,
          occurrenceDate: event.date,
          occurrenceId: `${event.id}@${event.date}`,
          isRecurringOccurrence: false,
        })
      }
      continue
    }

    const dates = generateOccurrenceDates(event, rangeStartIso, rangeEndIso)
    const recurring = isRecurring(event)
    for (const occurrenceDate of dates) {
      out.push({
        ...event,
        date: occurrenceDate,
        occurrenceDate,
        occurrenceId: `${event.id}@${occurrenceDate}`,
        isRecurringOccurrence: recurring,
      })
    }
  }

  return out.sort((a, b) => {
    const byDate = a.occurrenceDate.localeCompare(b.occurrenceDate)
    if (byDate !== 0) return byDate
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
  })
}

export function addDaysToIso(iso: string, days: number): string {
  const d = parseIso(iso)
  if (!d) return iso
  return toIsoDate(addDays(d, days))
}

export function dayBeforeIso(iso: string): string {
  return addDaysToIso(iso, -1)
}

/** Apply recurrence edit/delete scope helpers for AppContext. */
export function applySeriesExclude(
  master: CalendarEvent,
  occurrenceDate: string,
): CalendarEvent {
  const excluded = new Set(master.excludedDates ?? [])
  excluded.add(occurrenceDate)
  return { ...master, excludedDates: [...excluded].sort() }
}

export function splitSeriesAt(
  master: CalendarEvent,
  occurrenceDate: string,
  updates: Partial<Omit<CalendarEvent, 'id'>>,
): { updatedMaster: CalendarEvent; newSeries: Omit<CalendarEvent, 'id'> } {
  const updatedMaster: CalendarEvent = {
    ...master,
    recurrence: master.recurrence
      ? {
          ...master.recurrence,
          endDate: dayBeforeIso(occurrenceDate),
        }
      : { frequency: 'none' },
  }

  const { id: _id, excludedDates: _ex, seriesId: _sid, originalDate: _od, ...rest } = {
    ...master,
    ...updates,
  }
  void _id
  void _ex
  void _sid
  void _od

  const newSeries: Omit<CalendarEvent, 'id'> = {
    ...rest,
    date: updates.date ?? occurrenceDate,
    excludedDates: undefined,
    seriesId: undefined,
    originalDate: undefined,
    recurrence: updates.recurrence !== undefined ? updates.recurrence : master.recurrence,
  }

  return { updatedMaster, newSeries }
}

export function recurrenceFrequencyLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Denně'
    case 'weekly':
      return 'Každý týden'
    case 'monthly':
      return 'Každý měsíc'
    case 'yearly':
      return 'Každý rok'
    case 'custom':
      return 'Vlastní'
    default:
      return 'Neopakovat'
  }
}

export const RECURRENCE_SCOPE_LABELS: Record<RecurrenceEditScope, string> = {
  this: 'Pouze tento výskyt',
  following: 'Tento a následující',
  series: 'Celá série',
}
