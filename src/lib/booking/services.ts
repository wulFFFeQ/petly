import {
  createBookingId,
  loadProfessionalServices,
  saveProfessionalServices,
} from './storage'
import { buildSeedServices } from './seed'
import type {
  BookingResult,
  ProfessionalService,
  ServiceCategory,
  ServiceLocationType,
  ServicePriceType,
  ServicePublicVisibility,
} from './types'
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

/** Public profile list: active + publicly visible (may or may not be bookable). */
export function listPublicServices(professionalId: string): ProfessionalService[] {
  return listProfessionalServices(professionalId).filter(
    (s) => s.active && s.publicVisibility === 'public',
  )
}

/** Bookable via booking engine. */
export function listBookableServices(professionalId: string): ProfessionalService[] {
  return listProfessionalServices(professionalId).filter(
    (s) => s.active && s.bookingEnabled && s.publicVisibility === 'public',
  )
}

export function isServiceBookable(service: ProfessionalService): boolean {
  return service.active && service.bookingEnabled && service.publicVisibility === 'public'
}

export type CreateServiceInput = {
  professionalId: string
  name: string
  description?: string
  category?: ServiceCategory
  durationMinutes: number
  price?: number
  currency?: string
  priceType?: ServicePriceType
  active?: boolean
  bookingEnabled?: boolean
  publicVisibility?: ServicePublicVisibility
  capacity?: number
  locationType?: ServiceLocationType
  notes?: string
  bookingBufferBeforeMinutes?: number
  bookingBufferAfterMinutes?: number
  isDemo?: boolean
}

function resolvePriceType(
  priceType: ServicePriceType | undefined,
  price: number | undefined,
): ServicePriceType {
  if (priceType) return priceType
  if (price !== undefined && price >= 0) return 'fixed'
  return 'on_request'
}

function applyPriceFields(
  target: ProfessionalService,
  priceType: ServicePriceType,
  price: number | undefined,
  currency: string | undefined,
): void {
  target.priceType = priceType
  if (priceType === 'on_request') {
    delete target.price
    delete target.currency
    return
  }
  if (price !== undefined && price >= 0) {
    target.price = price
  } else {
    delete target.price
  }
  if (currency?.trim()) {
    target.currency = currency.trim()
  } else if (priceType !== 'on_request' && !target.currency) {
    // leave unset
  }
}

export function createProfessionalService(
  input: CreateServiceInput,
): BookingResult<ProfessionalService> {
  const name = input.name.trim()
  if (!name || !input.professionalId || input.durationMinutes <= 0) {
    return { ok: false, error: 'invalid_input', message: 'Neplatné údaje služby.' }
  }
  const priceType = resolvePriceType(input.priceType, input.price)
  if (priceType !== 'on_request' && (input.price === undefined || input.price < 0)) {
    // Allow creating without price only for on_request; otherwise require price.
    // "from" and "fixed" should have a number — but "from" without price falls back to on_request UX.
  }

  const now = new Date().toISOString()
  const service: ProfessionalService = {
    id: createBookingId('svc'),
    professionalId: input.professionalId,
    name,
    durationMinutes: Math.round(input.durationMinutes),
    category: input.category ?? 'other',
    priceType,
    publicVisibility: input.publicVisibility ?? 'public',
    active: input.active ?? true,
    bookingEnabled: input.bookingEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  }
  if (input.description?.trim()) service.description = input.description.trim()
  applyPriceFields(service, priceType, input.price, input.currency)

  if (input.capacity !== undefined && input.capacity > 0) {
    service.capacity = Math.round(input.capacity)
  }
  if (input.locationType) service.locationType = input.locationType
  if (input.notes?.trim()) service.notes = input.notes.trim()
  if (input.bookingBufferBeforeMinutes !== undefined && input.bookingBufferBeforeMinutes >= 0) {
    service.bookingBufferBeforeMinutes = Math.round(input.bookingBufferBeforeMinutes)
  }
  if (input.bookingBufferAfterMinutes !== undefined && input.bookingBufferAfterMinutes >= 0) {
    service.bookingBufferAfterMinutes = Math.round(input.bookingBufferAfterMinutes)
  }
  if (input.isDemo === true) service.isDemo = true

  const all = loadProfessionalServices()
  all.push(service)
  saveProfessionalServices(all)
  return { ok: true, value: service }
}

export type UpdateServiceFields = Partial<
  Pick<
    ProfessionalService,
    | 'name'
    | 'description'
    | 'category'
    | 'durationMinutes'
    | 'price'
    | 'currency'
    | 'priceType'
    | 'active'
    | 'bookingEnabled'
    | 'publicVisibility'
    | 'capacity'
    | 'locationType'
    | 'notes'
    | 'bookingBufferBeforeMinutes'
    | 'bookingBufferAfterMinutes'
  >
>

export function updateProfessionalService(
  serviceId: string,
  updates: UpdateServiceFields,
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
  if (updates.category !== undefined) next.category = updates.category
  if (updates.durationMinutes !== undefined) {
    if (updates.durationMinutes <= 0) {
      return { ok: false, error: 'invalid_input', message: 'Neplatná délka.' }
    }
    next.durationMinutes = Math.round(updates.durationMinutes)
  }
  if (updates.publicVisibility !== undefined) next.publicVisibility = updates.publicVisibility
  if (updates.active !== undefined) next.active = updates.active
  if (updates.bookingEnabled !== undefined) next.bookingEnabled = updates.bookingEnabled

  const priceType = updates.priceType ?? next.priceType
  const price = updates.price !== undefined ? updates.price : next.price
  const currency = updates.currency !== undefined ? updates.currency : next.currency
  if (
    updates.priceType !== undefined ||
    updates.price !== undefined ||
    updates.currency !== undefined
  ) {
    applyPriceFields(next, priceType, price, currency)
  }

  if (updates.capacity !== undefined) {
    next.capacity = updates.capacity > 0 ? Math.round(updates.capacity) : undefined
  }
  if (updates.locationType !== undefined) next.locationType = updates.locationType
  if (updates.notes !== undefined) {
    next.notes = updates.notes.trim() || undefined
  }
  if (updates.bookingBufferBeforeMinutes !== undefined) {
    next.bookingBufferBeforeMinutes =
      updates.bookingBufferBeforeMinutes >= 0
        ? Math.round(updates.bookingBufferBeforeMinutes)
        : undefined
  }
  if (updates.bookingBufferAfterMinutes !== undefined) {
    next.bookingBufferAfterMinutes =
      updates.bookingBufferAfterMinutes >= 0
        ? Math.round(updates.bookingBufferAfterMinutes)
        : undefined
  }

  all[idx] = next
  saveProfessionalServices(all)
  return { ok: true, value: next }
}

/** Soft-deactivate: not newly bookable; existing bookings keep snapshots. */
export function disableProfessionalService(
  serviceId: string,
  actorProfessionalId: string,
): BookingResult<ProfessionalService> {
  return updateProfessionalService(serviceId, { active: false }, actorProfessionalId)
}

export function activateProfessionalService(
  serviceId: string,
  actorProfessionalId: string,
): BookingResult<ProfessionalService> {
  return updateProfessionalService(serviceId, { active: true }, actorProfessionalId)
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
