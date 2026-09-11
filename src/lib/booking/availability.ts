import {
  createBookingId,
  loadAvailabilityExceptions,
  loadProfessionalAvailability,
  saveAvailabilityExceptions,
  saveProfessionalAvailability,
} from './storage'
import { buildFullWeekAvailability } from './seed'
import type {
  BookingResult,
  ProfessionalAvailability,
  ProfessionalAvailabilityException,
  Weekday,
} from './types'

export function getAvailability(professionalId: string): ProfessionalAvailability[] {
  return loadProfessionalAvailability()
    .filter((a) => a.professionalId === professionalId)
    .sort((a, b) => a.weekday - b.weekday)
}

export function getAvailabilityExceptions(
  professionalId: string,
): ProfessionalAvailabilityException[] {
  return loadAvailabilityExceptions().filter((e) => e.professionalId === professionalId)
}

export function ensureDefaultAvailability(
  professionalId: string,
): ProfessionalAvailability[] {
  const existing = getAvailability(professionalId)
  if (existing.length > 0) return existing
  const seeded = buildFullWeekAvailability(professionalId)
  const all = loadProfessionalAvailability()
  saveProfessionalAvailability([...all, ...seeded])
  return seeded
}

export type WeeklyAvailabilityRow = {
  weekday: Weekday
  active: boolean
  startTime: string
  endTime: string
}

export function setWeeklyAvailability(
  professionalId: string,
  rows: WeeklyAvailabilityRow[],
): BookingResult<ProfessionalAvailability[]> {
  if (!professionalId || rows.length === 0) {
    return { ok: false, error: 'invalid_input', message: 'Neplatná dostupnost.' }
  }
  const nowRows: ProfessionalAvailability[] = rows.map((r) => {
    const existing = getAvailability(professionalId).find((a) => a.weekday === r.weekday)
    return {
      id: existing?.id ?? createBookingId('av'),
      professionalId,
      weekday: r.weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      active: r.active,
    }
  })

  const others = loadProfessionalAvailability().filter(
    (a) => a.professionalId !== professionalId,
  )
  saveProfessionalAvailability([...others, ...nowRows])
  return { ok: true, value: nowRows.sort((a, b) => a.weekday - b.weekday) }
}

/** Extension point for future exceptions UI. */
export function upsertAvailabilityException(
  exception: Omit<ProfessionalAvailabilityException, 'id'> & { id?: string },
): ProfessionalAvailabilityException {
  const all = loadAvailabilityExceptions()
  const id = exception.id ?? createBookingId('avx')
  const next: ProfessionalAvailabilityException = {
    id,
    professionalId: exception.professionalId,
    date: exception.date,
    type: exception.type,
    startTime: exception.startTime,
    endTime: exception.endTime,
  }
  const idx = all.findIndex((e) => e.id === id)
  if (idx >= 0) all[idx] = next
  else all.push(next)
  saveAvailabilityExceptions(all)
  return next
}
