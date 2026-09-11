import { getSelfAccount } from '../account/session'
import { isConsumerAccount } from '../professional/roles'
import { loadProfessionalProfiles } from '../professional/storage'
import type { ProfessionalProfile } from '../professional/types'
import { getAvailability, getAvailabilityExceptions } from './availability'
import { getProfessionalService } from './services'
import { addMinutesIso, isSlotAvailable } from './slots'
import {
  createBookingId,
  loadBookings,
  saveBookings,
} from './storage'
import type { Booking, BookingResult, BookingStatus } from './types'

export type CreateBookingInput = {
  ownerAccountId: string
  professionalId: string
  serviceId: string
  petId: string
  startAt: string
  note?: string
  clientRequestId?: string
  /** Display snapshots — optional; UI should pass safe names only. */
  petName?: string
  professionalName?: string
  ownerDisplayName?: string
  /** Injected pet existence check — domain stays free of AppContext. */
  petExists?: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function idempotencyKey(input: {
  ownerAccountId: string
  professionalId: string
  serviceId: string
  petId: string
  startAt: string
}): string {
  return [
    input.ownerAccountId,
    input.professionalId,
    input.serviceId,
    input.petId,
    input.startAt,
  ].join('|')
}

export function getBooking(id: string): Booking | null {
  return loadBookings().find((b) => b.id === id) ?? null
}

export type ListBookingsFilter = {
  ownerAccountId?: string
  professionalId?: string
  petId?: string
  status?: BookingStatus | BookingStatus[]
}

export function listBookings(filter: ListBookingsFilter = {}): Booking[] {
  let list = loadBookings()
  if (filter.ownerAccountId) {
    list = list.filter((b) => b.ownerAccountId === filter.ownerAccountId)
  }
  if (filter.professionalId) {
    list = list.filter((b) => b.professionalId === filter.professionalId)
  }
  if (filter.petId) {
    list = list.filter((b) => b.petId === filter.petId)
  }
  if (filter.status) {
    const set = new Set(Array.isArray(filter.status) ? filter.status : [filter.status])
    list = list.filter((b) => set.has(b.status))
  }
  return list.sort((a, b) => a.startAt.localeCompare(b.startAt))
}

function loadProfile(professionalId: string): ProfessionalProfile | null {
  return loadProfessionalProfiles().find((p) => p.id === professionalId) ?? null
}

export function createBooking(input: CreateBookingInput): BookingResult<Booking> {
  const self = getSelfAccount()
  if (!self || self.id !== input.ownerAccountId) {
    return { ok: false, error: 'forbidden', message: 'Rezervaci může vytvořit pouze majitel.' }
  }
  if (!isConsumerAccount(self) && !self.roles.includes('owner')) {
    return { ok: false, error: 'forbidden', message: 'Rezervaci může vytvořit pouze majitel.' }
  }

  if (input.petExists === false) {
    return { ok: false, error: 'pet_not_found', message: 'Mazlíček nenalezen.' }
  }

  const profile = loadProfile(input.professionalId)
  if (!profile) {
    return { ok: false, error: 'professional_not_found', message: 'Profesionál nenalezen.' }
  }
  if (profile.publicVisibility !== 'public') {
    return {
      ok: false,
      error: 'professional_not_public',
      message: 'Profesionál nemá veřejný profil.',
    }
  }

  const service = getProfessionalService(input.serviceId)
  if (!service || service.professionalId !== input.professionalId) {
    return { ok: false, error: 'not_found', message: 'Služba nenalezena.' }
  }
  if (!service.active) {
    return { ok: false, error: 'service_disabled', message: 'Služba není aktivní.' }
  }
  if (!service.bookingEnabled) {
    return {
      ok: false,
      error: 'booking_disabled',
      message: 'Rezervace této služby není povolena.',
    }
  }

  const endAt = addMinutesIso(input.startAt, service.durationMinutes)
  const startMs = Date.parse(input.startAt)
  if (Number.isNaN(startMs) || startMs < Date.now()) {
    return { ok: false, error: 'past_slot', message: 'Termín je v minulosti.' }
  }

  const all = loadBookings()

  if (input.clientRequestId) {
    const byClient = all.find((b) => b.clientRequestId === input.clientRequestId)
    if (byClient) return { ok: true, value: byClient }
  }

  const key = idempotencyKey(input)
  const duplicate = all.find(
    (b) =>
      idempotencyKey(b) === key &&
      (b.status === 'requested' || b.status === 'confirmed'),
  )
  if (duplicate) return { ok: true, value: duplicate }

  const available = isSlotAvailable({
    professionalId: input.professionalId,
    service,
    startAt: input.startAt,
    endAt,
    availability: getAvailability(input.professionalId),
    exceptions: getAvailabilityExceptions(input.professionalId),
    bookings: all,
  })
  if (!available) {
    return {
      ok: false,
      error: 'slot_unavailable',
      message: 'Termín už není dostupný.',
    }
  }

  const ts = nowIso()
  const booking: Booking = {
    id: createBookingId('bkg'),
    ownerAccountId: input.ownerAccountId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    petId: input.petId,
    startAt: input.startAt,
    endAt,
    status: 'requested',
    serviceName: service.name,
    createdAt: ts,
    updatedAt: ts,
  }
  if (input.note?.trim()) booking.note = input.note.trim()
  if (input.clientRequestId) booking.clientRequestId = input.clientRequestId
  if (input.petName?.trim()) booking.petName = input.petName.trim()
  if (input.professionalName?.trim()) {
    booking.professionalName = input.professionalName.trim()
  } else {
    booking.professionalName = profile.displayName
  }
  if (input.ownerDisplayName?.trim()) {
    booking.ownerDisplayName = input.ownerDisplayName.trim()
  } else if (self.displayName?.trim()) {
    booking.ownerDisplayName = self.displayName.trim()
  }
  if (service.price !== undefined) booking.price = service.price
  if (service.currency) booking.currency = service.currency

  all.push(booking)
  saveBookings(all)
  return { ok: true, value: booking }
}

function assertProfessionalOwns(
  booking: Booking,
  actorProfessionalId: string,
): BookingResult<Booking> | null {
  if (booking.professionalId !== actorProfessionalId) {
    return { ok: false, error: 'forbidden', message: 'Nemáte oprávnění k této rezervaci.' }
  }
  return null
}

function assertOwnerOwns(booking: Booking, ownerAccountId: string): BookingResult<Booking> | null {
  if (booking.ownerAccountId !== ownerAccountId) {
    return { ok: false, error: 'forbidden', message: 'Nemáte oprávnění k této rezervaci.' }
  }
  return null
}

function replaceBooking(next: Booking): Booking {
  const all = loadBookings()
  const idx = all.findIndex((b) => b.id === next.id)
  if (idx >= 0) all[idx] = next
  else all.push(next)
  saveBookings(all)
  return next
}

export function confirmBooking(
  bookingId: string,
  actorProfessionalId: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  if (booking.status !== 'requested') {
    return { ok: false, error: 'invalid_status', message: 'Rezervaci nelze potvrdit.' }
  }

  // Re-check overlap against other confirmed/requested (exclude self)
  const service = getProfessionalService(booking.serviceId)
  if (!service || !service.active || !service.bookingEnabled) {
    return { ok: false, error: 'service_disabled', message: 'Služba už není dostupná.' }
  }
  const ok = isSlotAvailable({
    professionalId: booking.professionalId,
    service,
    startAt: booking.startAt,
    endAt: booking.endAt,
    availability: getAvailability(booking.professionalId),
    exceptions: getAvailabilityExceptions(booking.professionalId),
    bookings: loadBookings(),
    excludeBookingId: booking.id,
  })
  if (!ok) {
    return { ok: false, error: 'overlap', message: 'Termín se překrývá s jinou rezervací.' }
  }

  const ts = nowIso()
  return {
    ok: true,
    value: replaceBooking({
      ...booking,
      status: 'confirmed',
      confirmedAt: ts,
      updatedAt: ts,
    }),
  }
}

export function declineBooking(
  bookingId: string,
  actorProfessionalId: string,
  reason?: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  if (booking.status !== 'requested') {
    return { ok: false, error: 'invalid_status', message: 'Rezervaci nelze odmítnout.' }
  }
  const ts = nowIso()
  return {
    ok: true,
    value: replaceBooking({
      ...booking,
      status: 'declined',
      declinedAt: ts,
      cancellationReason: reason?.trim() || undefined,
      updatedAt: ts,
    }),
  }
}

export type CancelBookingActor = {
  kind: 'owner' | 'professional'
  accountId?: string
  professionalId?: string
}

export function cancelBooking(
  bookingId: string,
  actor: CancelBookingActor,
  reason?: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }

  if (actor.kind === 'owner') {
    if (!actor.accountId) {
      return { ok: false, error: 'forbidden', message: 'Chybí účet majitele.' }
    }
    const denied = assertOwnerOwns(booking, actor.accountId)
    if (denied) return denied
  } else {
    if (!actor.professionalId) {
      return { ok: false, error: 'forbidden', message: 'Chybí profesionální profil.' }
    }
    const denied = assertProfessionalOwns(booking, actor.professionalId)
    if (denied) return denied
  }

  if (booking.status !== 'requested' && booking.status !== 'confirmed') {
    return { ok: false, error: 'invalid_status', message: 'Rezervaci nelze zrušit.' }
  }

  const ts = nowIso()
  const status: BookingStatus =
    actor.kind === 'owner' ? 'cancelled_by_owner' : 'cancelled_by_professional'

  return {
    ok: true,
    value: replaceBooking({
      ...booking,
      status,
      cancelledAt: ts,
      cancellationReason: reason?.trim() || undefined,
      updatedAt: ts,
    }),
  }
}

export function completeBooking(
  bookingId: string,
  actorProfessionalId: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  if (booking.status !== 'confirmed') {
    return { ok: false, error: 'invalid_status', message: 'Dokončit lze jen potvrzenou rezervaci.' }
  }
  const ts = nowIso()
  return {
    ok: true,
    value: replaceBooking({
      ...booking,
      status: 'completed',
      completedAt: ts,
      updatedAt: ts,
    }),
  }
}

export function markNoShow(
  bookingId: string,
  actorProfessionalId: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  if (booking.status !== 'confirmed') {
    return { ok: false, error: 'invalid_status', message: 'No-show lze označit jen u potvrzené rezervace.' }
  }
  const ts = nowIso()
  return {
    ok: true,
    value: replaceBooking({
      ...booking,
      status: 'no_show',
      updatedAt: ts,
    }),
  }
}

/** Partition helpers for professional workspace lists. */
export function partitionProfessionalBookings(
  professionalId: string,
  now = new Date(),
): {
  neue: Booking[]
  confirmed: Booking[]
  today: Booking[]
  upcoming: Booking[]
  history: Booking[]
} {
  const all = listBookings({ professionalId })
  const todayIso = toLocalDateIso(now)
  const neue = all.filter((b) => b.status === 'requested')
  const confirmed = all.filter((b) => b.status === 'confirmed')
  const today = confirmed.filter((b) => toLocalDateIso(new Date(b.startAt)) === todayIso)
  const upcoming = confirmed.filter(
    (b) => Date.parse(b.startAt) >= now.getTime() && toLocalDateIso(new Date(b.startAt)) !== todayIso,
  )
  const history = all.filter((b) =>
    ['declined', 'cancelled_by_owner', 'cancelled_by_professional', 'completed', 'no_show'].includes(
      b.status,
    ),
  )
  return { neue, confirmed, today, upcoming, history }
}

function toLocalDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
