import {
  createBookingId,
  DEFAULT_AVAILABILITY_TIMEZONE,
  loadAvailabilityExceptions,
  loadAvailabilitySettings,
  loadProfessionalAvailability,
  saveAvailabilityExceptions,
  saveAvailabilitySettings,
  saveProfessionalAvailability,
} from './storage'
import { buildFullWeekAvailability } from './seed'
import { parseTimeToMinutes } from './slots'
import type {
  BookingResult,
  DayTimeWindow,
  ProfessionalAvailability,
  ProfessionalAvailabilityException,
  ProfessionalAvailabilitySettings,
  Weekday,
} from './types'

export function getAvailability(professionalId: string): ProfessionalAvailability[] {
  return loadProfessionalAvailability()
    .filter((a) => a.professionalId === professionalId)
    .sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday
      return a.startTime.localeCompare(b.startTime)
    })
}

export function getAvailabilityExceptions(
  professionalId: string,
): ProfessionalAvailabilityException[] {
  return loadAvailabilityExceptions()
    .filter((e) => e.professionalId === professionalId)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''))
}

export function ensureDefaultAvailability(
  professionalId: string,
): ProfessionalAvailability[] {
  const existing = getAvailability(professionalId)
  if (existing.length > 0) return existing
  const seeded = buildFullWeekAvailability(professionalId)
  const all = loadProfessionalAvailability()
  saveProfessionalAvailability([...all, ...seeded])
  ensureAvailabilitySettings(professionalId)
  return seeded
}

export function getAvailabilitySettings(
  professionalId: string,
): ProfessionalAvailabilitySettings {
  const found = loadAvailabilitySettings().find((s) => s.professionalId === professionalId)
  if (found) return found
  return { professionalId, timezone: DEFAULT_AVAILABILITY_TIMEZONE }
}

export function ensureAvailabilitySettings(
  professionalId: string,
): ProfessionalAvailabilitySettings {
  const all = loadAvailabilitySettings()
  const existing = all.find((s) => s.professionalId === professionalId)
  if (existing) {
    if (!existing.timezone) {
      const next = { ...existing, timezone: DEFAULT_AVAILABILITY_TIMEZONE }
      saveAvailabilitySettings([
        ...all.filter((s) => s.professionalId !== professionalId),
        next,
      ])
      return next
    }
    return existing
  }
  const created: ProfessionalAvailabilitySettings = {
    professionalId,
    timezone: DEFAULT_AVAILABILITY_TIMEZONE,
  }
  saveAvailabilitySettings([...all, created])
  return created
}

export function setAvailabilityTimezone(
  professionalId: string,
  timezone: string,
): ProfessionalAvailabilitySettings {
  const all = loadAvailabilitySettings()
  const next: ProfessionalAvailabilitySettings = {
    professionalId,
    timezone: timezone.trim() || DEFAULT_AVAILABILITY_TIMEZONE,
  }
  saveAvailabilitySettings([
    ...all.filter((s) => s.professionalId !== professionalId),
    next,
  ])
  return next
}

/** @deprecated Prefer WeeklyAvailabilityDay — kept for single-interval callers. */
export type WeeklyAvailabilityRow = {
  weekday: Weekday
  active: boolean
  startTime: string
  endTime: string
}

export type WeeklyAvailabilityDay = {
  weekday: Weekday
  active: boolean
  intervals: DayTimeWindow[]
}

function intervalsOverlap(a: DayTimeWindow, b: DayTimeWindow): boolean {
  const as = parseTimeToMinutes(a.startTime)
  const ae = parseTimeToMinutes(a.endTime)
  const bs = parseTimeToMinutes(b.startTime)
  const be = parseTimeToMinutes(b.endTime)
  if (as === null || ae === null || bs === null || be === null) return true
  return as < be && bs < ae
}

function validateDay(day: WeeklyAvailabilityDay): string | null {
  if (!day.active) return null
  if (!day.intervals.length) return 'Aktivní den potřebuje alespoň jeden interval.'
  for (const iv of day.intervals) {
    const s = parseTimeToMinutes(iv.startTime)
    const e = parseTimeToMinutes(iv.endTime)
    if (s === null || e === null) return 'Neplatný formát času (HH:mm).'
    if (e <= s) return 'Konec intervalu musí být po začátku.'
  }
  for (let i = 0; i < day.intervals.length; i++) {
    for (let j = i + 1; j < day.intervals.length; j++) {
      if (intervalsOverlap(day.intervals[i], day.intervals[j])) {
        return 'Intervaly ve stejném dni se nesmí překrývat.'
      }
    }
  }
  return null
}

function toDays(input: WeeklyAvailabilityDay[] | WeeklyAvailabilityRow[]): WeeklyAvailabilityDay[] {
  if (input.length === 0) return []
  const first = input[0] as WeeklyAvailabilityDay | WeeklyAvailabilityRow
  if ('intervals' in first) {
    return input as WeeklyAvailabilityDay[]
  }
  return (input as WeeklyAvailabilityRow[]).map((r) => ({
    weekday: r.weekday,
    active: r.active,
    intervals: [{ startTime: r.startTime, endTime: r.endTime }],
  }))
}

/**
 * Replace weekly availability for a professional.
 * Accepts multi-interval days or legacy single-window rows.
 * Inactive day → one placeholder row; active day → one row per interval.
 */
export function setWeeklyAvailability(
  professionalId: string,
  input: WeeklyAvailabilityDay[] | WeeklyAvailabilityRow[],
): BookingResult<ProfessionalAvailability[]> {
  if (!professionalId || input.length === 0) {
    return { ok: false, error: 'invalid_input', message: 'Neplatná dostupnost.' }
  }

  const days = toDays(input)
  for (const day of days) {
    const err = validateDay(day)
    if (err) return { ok: false, error: 'invalid_input', message: err }
  }

  const existing = getAvailability(professionalId)
  const reusedIds = new Set<string>()
  const nowRows: ProfessionalAvailability[] = []

  for (const day of days) {
    if (!day.active) {
      const prev =
        existing.find((a) => a.weekday === day.weekday && !reusedIds.has(a.id)) ??
        existing.find((a) => a.weekday === day.weekday)
      const id = prev && !reusedIds.has(prev.id) ? prev.id : createBookingId('av')
      reusedIds.add(id)
      const placeholder = day.intervals[0] ?? { startTime: '09:00', endTime: '17:00' }
      nowRows.push({
        id,
        professionalId,
        weekday: day.weekday,
        startTime: placeholder.startTime,
        endTime: placeholder.endTime,
        active: false,
      })
      continue
    }

    const sorted = [...day.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime))
    for (const iv of sorted) {
      const prev = existing.find(
        (a) =>
          a.weekday === day.weekday &&
          a.startTime === iv.startTime &&
          a.endTime === iv.endTime &&
          !reusedIds.has(a.id),
      )
      const fallback = existing.find(
        (a) => a.weekday === day.weekday && !reusedIds.has(a.id),
      )
      const id = prev?.id ?? fallback?.id ?? createBookingId('av')
      reusedIds.add(id)
      nowRows.push({
        id,
        professionalId,
        weekday: day.weekday,
        startTime: iv.startTime,
        endTime: iv.endTime,
        active: true,
      })
    }
  }

  const others = loadProfessionalAvailability().filter(
    (a) => a.professionalId !== professionalId,
  )
  saveProfessionalAvailability([...others, ...nowRows])
  ensureAvailabilitySettings(professionalId)
  return {
    ok: true,
    value: nowRows.sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday
      return a.startTime.localeCompare(b.startTime)
    }),
  }
}

/** Group stored rows into UI-friendly day drafts (multi-interval aware). */
export function availabilityToWeeklyDays(
  rows: ProfessionalAvailability[],
): WeeklyAvailabilityDay[] {
  const byDay = new Map<Weekday, ProfessionalAvailability[]>()
  for (const r of rows) {
    const list = byDay.get(r.weekday) ?? []
    list.push(r)
    byDay.set(r.weekday, list)
  }
  const days: WeeklyAvailabilityDay[] = []
  for (let w = 0; w <= 6; w++) {
    const weekday = w as Weekday
    const list = (byDay.get(weekday) ?? []).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    )
    const active = list.some((r) => r.active)
    const intervals = (active ? list.filter((r) => r.active) : list).map((r) => ({
      startTime: r.startTime,
      endTime: r.endTime,
    }))
    days.push({
      weekday,
      active,
      intervals:
        intervals.length > 0 ? intervals : [{ startTime: '09:00', endTime: '17:00' }],
    })
  }
  return days
}

export function upsertAvailabilityException(
  exception: Omit<ProfessionalAvailabilityException, 'id'> & { id?: string },
): BookingResult<ProfessionalAvailabilityException> {
  if (!exception.professionalId || !exception.date) {
    return { ok: false, error: 'invalid_input', message: 'Neplatná výjimka.' }
  }
  if (exception.type === 'custom_hours') {
    const s = exception.startTime ? parseTimeToMinutes(exception.startTime) : null
    const e = exception.endTime ? parseTimeToMinutes(exception.endTime) : null
    if (s === null || e === null || e <= s) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'Vlastní dostupnost vyžaduje platný interval Od–Do.',
      }
    }
  }

  const all = loadAvailabilityExceptions()
  const id = exception.id ?? createBookingId('avx')
  const next: ProfessionalAvailabilityException = {
    id,
    professionalId: exception.professionalId,
    date: exception.date,
    type: exception.type,
  }
  if (exception.startTime) next.startTime = exception.startTime
  if (exception.endTime) next.endTime = exception.endTime
  if (exception.label?.trim()) next.label = exception.label.trim()

  const idx = all.findIndex((e) => e.id === id)
  if (idx >= 0) all[idx] = next
  else all.push(next)
  saveAvailabilityExceptions(all)
  return { ok: true, value: next }
}

export function removeAvailabilityException(
  professionalId: string,
  exceptionId: string,
): BookingResult<true> {
  const all = loadAvailabilityExceptions()
  const target = all.find((e) => e.id === exceptionId)
  if (!target || target.professionalId !== professionalId) {
    return { ok: false, error: 'not_found', message: 'Výjimka nenalezena.' }
  }
  saveAvailabilityExceptions(all.filter((e) => e.id !== exceptionId))
  return { ok: true, value: true }
}
