import {
  createBookingId,
  loadProfessionalServices,
  saveProfessionalServices,
} from './storage'
import { buildSeedServices } from './seed'
import type { BookingResult, ProfessionalService } from './types'
import type { ProfessionalType } from '../professional/types'

export function listProfessionalServices(
  professionalId: string,
  opts?: { includeInactive?: boolean },
): ProfessionalService[] {
  const all = loadProfessionalServices().filter((s) => s.professionalId === professionalId)
  if (opts?.includeInactive) return all
  return all.filter((s) => s.active)
}

export function getProfessionalService(serviceId: string): ProfessionalService | null {
  return loadProfessionalServices().find((s) => s.id === serviceId) ?? null
}

export function listBookableServices(professionalId: string): ProfessionalService[] {
  return listProfessionalServices(professionalId).filter(
    (s) => s.active && s.bookingEnabled,
  )
}

export type CreateServiceInput = {
  professionalId: string
  name: string
  description?: string
  durationMinutes: number
  price?: number
  currency?: string
  active?: boolean
  bookingEnabled?: boolean
}

export function createProfessionalService(
  input: CreateServiceInput,
): BookingResult<ProfessionalService> {
  const name = input.name.trim()
  if (!name || !input.professionalId || input.durationMinutes <= 0) {
    return { ok: false, error: 'invalid_input', message: 'Neplatné údaje služby.' }
  }
  const now = new Date().toISOString()
  const service: ProfessionalService = {
    id: createBookingId('svc'),
    professionalId: input.professionalId,
    name,
    durationMinutes: Math.round(input.durationMinutes),
    active: input.active ?? true,
    bookingEnabled: input.bookingEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  }
  if (input.description?.trim()) service.description = input.description.trim()
  if (input.price !== undefined && input.price >= 0) service.price = input.price
  if (input.currency?.trim()) service.currency = input.currency.trim()

  const all = loadProfessionalServices()
  all.push(service)
  saveProfessionalServices(all)
  return { ok: true, value: service }
}

export function updateProfessionalService(
  serviceId: string,
  updates: Partial<
    Pick<
      ProfessionalService,
      | 'name'
      | 'description'
      | 'durationMinutes'
      | 'price'
      | 'currency'
      | 'active'
      | 'bookingEnabled'
    >
  >,
  actorProfessionalId: string,
): BookingResult<ProfessionalService> {
  const all = loadProfessionalServices()
  const idx = all.findIndex((s) => s.id === serviceId)
  if (idx < 0) return { ok: false, error: 'not_found', message: 'Služba nenalezena.' }
  if (all[idx].professionalId !== actorProfessionalId) {
    return { ok: false, error: 'forbidden', message: 'Nemáte oprávnění upravit tuto službu.' }
  }
  const current = all[idx]
  const next: ProfessionalService = {
    ...current,
    updatedAt: new Date().toISOString(),
  }
  if (updates.name !== undefined) {
    const name = updates.name.trim()
    if (!name) return { ok: false, error: 'invalid_input', message: 'Název je povinný.' }
    next.name = name
  }
  if (updates.description !== undefined) {
    next.description = updates.description.trim() || undefined
  }
  if (updates.durationMinutes !== undefined) {
    if (updates.durationMinutes <= 0) {
      return { ok: false, error: 'invalid_input', message: 'Neplatná délka.' }
    }
    next.durationMinutes = Math.round(updates.durationMinutes)
  }
  if (updates.price !== undefined) {
    next.price = updates.price >= 0 ? updates.price : undefined
  }
  if (updates.currency !== undefined) {
    next.currency = updates.currency.trim() || undefined
  }
  if (updates.active !== undefined) next.active = updates.active
  if (updates.bookingEnabled !== undefined) next.bookingEnabled = updates.bookingEnabled

  all[idx] = next
  saveProfessionalServices(all)
  return { ok: true, value: next }
}

export function disableProfessionalService(
  serviceId: string,
  actorProfessionalId: string,
): BookingResult<ProfessionalService> {
  return updateProfessionalService(
    serviceId,
    { active: false, bookingEnabled: false },
    actorProfessionalId,
  )
}

/** Seed DEMO services if professional has none yet. */
export function ensureSeedServices(
  professionalId: string,
  type: ProfessionalType,
): ProfessionalService[] {
  const existing = listProfessionalServices(professionalId, { includeInactive: true })
  if (existing.length > 0) return existing
  const seeded = buildSeedServices(professionalId, type)
  const all = loadProfessionalServices()
  saveProfessionalServices([...all, ...seeded])
  return seeded
}
