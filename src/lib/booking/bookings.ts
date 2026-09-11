import { getSelfAccount } from '../account/session'
import { isConsumerAccount } from '../professional/roles'
import { loadProfessionalProfiles } from '../professional/storage'
import type { ProfessionalProfile } from '../professional/types'
import { getAvailability, getAvailabilityExceptions } from './availability'
import {
  canOwnerCancelByPolicy,
  ensureDefaultBookingPolicy,
  formatOwnerCancelPolicyHint,
} from './policy'
import { getProfessionalService } from './services'
import { addMinutesIso, isSlotAvailable } from './slots'
import {
  createBookingId,
  loadBookings,
  saveBookings,
} from './storage'
import type {
  Booking,
  BookingResult,
  BookingStatus,
  CancellationReasonCode,
} from './types'
import { DEMO_ALLOW_EARLY_COMPLETE_KEY } from './types'

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

function isDemoEarlyCompleteAllowed(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(DEMO_ALLOW_EARLY_COMPLETE_KEY) === '1'
  } catch {
    return false
  }
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
  if (service.publicVisibility !== 'public') {
    return {
      ok: false,
      error: 'booking_disabled',
      message: 'Služba není veřejně rezervovatelná.',
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
      (b.status === 'requested' ||
        b.status === 'payment_pending' ||
        b.status === 'confirmed'),
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
    serviceNameSnapshot: service.name,
    serviceName: service.name,
    durationSnapshot: service.durationMinutes,
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
  if (service.priceType !== 'on_request' && service.price !== undefined) {
    booking.priceSnapshot = service.price
    booking.price = service.price
  }
  if (service.priceType !== 'on_request' && service.currency) {
    booking.currencySnapshot = service.currency
    booking.currency = service.currency
  }

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

function serviceForSlotCheck(booking: Booking) {
  const liveService = getProfessionalService(booking.serviceId)
  const duration =
    booking.durationSnapshot ??
    Math.round((Date.parse(booking.endAt) - Date.parse(booking.startAt)) / 60_000)
  return (
    liveService ?? {
      id: booking.serviceId,
      professionalId: booking.professionalId,
      name: booking.serviceNameSnapshot ?? booking.serviceName ?? 'Služba',
      durationMinutes: duration > 0 ? duration : 30,
      category: 'other' as const,
      priceType: 'on_request' as const,
      publicVisibility: 'public' as const,
      active: true,
      bookingEnabled: true,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }
  )
}

/**
 * Backend-only: confirm booking after verified payment success.
 * Frontend / professional UI must NOT call this — use confirmBooking for pay_on_site.
 * Accepts payment_pending → confirmed (and requested for legacy online-payment bookings).
 */
export function confirmBookingAfterVerifiedPayment(
  bookingId: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  if (booking.status !== 'payment_pending' && booking.status !== 'requested') {
    return {
      ok: false,
      error: 'invalid_status',
      message: 'Rezervaci nelze potvrdit po platbě z tohoto stavu.',
    }
  }

  const serviceForSlot = serviceForSlotCheck(booking)
  const ok = isSlotAvailable({
    professionalId: booking.professionalId,
    service: serviceForSlot,
    startAt: booking.startAt,
    endAt: booking.endAt,
    availability: getAvailability(booking.professionalId),
    exceptions: getAvailabilityExceptions(booking.professionalId),
    bookings: loadBookings(),
    excludeBookingId: booking.id,
    skipServiceBookableCheck: true,
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

export function confirmBooking(
  bookingId: string,
  actorProfessionalId: string,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  // Professionals confirm pay_on_site (requested). payment_pending → confirmed is event-driven only.
  if (booking.status !== 'requested') {
    return { ok: false, error: 'invalid_status', message: 'Rezervaci nelze potvrdit.' }
  }

  const serviceForSlot = serviceForSlotCheck(booking)

  const ok = isSlotAvailable({
    professionalId: booking.professionalId,
    service: serviceForSlot,
    startAt: booking.startAt,
    endAt: booking.endAt,
    availability: getAvailability(booking.professionalId),
    exceptions: getAvailabilityExceptions(booking.professionalId),
    bookings: loadBookings(),
    excludeBookingId: booking.id,
    /** Lifecycle confirm: do not require live service still bookable. */
    skipServiceBookableCheck: true,
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

export type CancelBookingOptions = {
  reason?: string
  reasonCode?: CancellationReasonCode
  /** Skip policy check (tests / DEMO override). Default false. */
  skipPolicyCheck?: boolean
  now?: Date
}

export function cancelBooking(
  bookingId: string,
  actor: CancelBookingActor,
  reasonOrOptions?: string | CancelBookingOptions,
): BookingResult<Booking> {
  const opts: CancelBookingOptions =
    typeof reasonOrOptions === 'string'
      ? { reason: reasonOrOptions }
      : reasonOrOptions ?? {}

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

  if (
    booking.status !== 'requested' &&
    booking.status !== 'payment_pending' &&
    booking.status !== 'confirmed'
  ) {
    return { ok: false, error: 'invalid_status', message: 'Rezervaci nelze zrušit.' }
  }

  if (actor.kind === 'professional') {
    const hasReason = Boolean(opts.reasonCode) || Boolean(opts.reason?.trim())
    if (!hasReason) {
      return {
        ok: false,
        error: 'reason_required',
        message: 'Uveďte důvod zrušení.',
      }
    }
  }

  if (actor.kind === 'owner' && !opts.skipPolicyCheck) {
    const policy = ensureDefaultBookingPolicy(booking.professionalId)
    const check = canOwnerCancelByPolicy(booking, policy, opts.now ?? new Date())
    if (!check.allowed) {
      return {
        ok: false,
        error: 'policy_blocked',
        message: formatOwnerCancelPolicyHint(check),
      }
    }
  }

  const ts = nowIso()
  const status: BookingStatus =
    actor.kind === 'owner' ? 'cancelled_by_owner' : 'cancelled_by_professional'

  const next: Booking = {
    ...booking,
    status,
    cancelledAt: ts,
    updatedAt: ts,
  }
  if (opts.reason?.trim()) next.cancellationReason = opts.reason.trim()
  else delete next.cancellationReason
  if (opts.reasonCode) next.cancellationReasonCode = opts.reasonCode

  return {
    ok: true,
    value: replaceBooking(next),
  }
}

export type CompleteBookingOptions = {
  allowEarlyComplete?: boolean
  now?: Date
}

export function completeBooking(
  bookingId: string,
  actorProfessionalId: string,
  options?: CompleteBookingOptions,
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  if (booking.status !== 'confirmed') {
    return { ok: false, error: 'invalid_status', message: 'Dokončit lze jen potvrzenou rezervaci.' }
  }

  const now = options?.now ?? new Date()
  const startMs = Date.parse(booking.startAt)
  const allowEarly =
    options?.allowEarlyComplete === true || isDemoEarlyCompleteAllowed()
  if (Number.isFinite(startMs) && now.getTime() < startMs && !allowEarly) {
    return {
      ok: false,
      error: 'too_early',
      message: 'Rezervaci nelze dokončit před plánovaným termínem.',
    }
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
  options?: { now?: Date },
): BookingResult<Booking> {
  const booking = getBooking(bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }
  const denied = assertProfessionalOwns(booking, actorProfessionalId)
  if (denied) return denied
  if (booking.status !== 'confirmed') {
    return {
      ok: false,
      error: 'invalid_status',
      message: 'No-show lze označit jen u potvrzené rezervace.',
    }
  }

  const now = options?.now ?? new Date()
  const startMs = Date.parse(booking.startAt)
  if (Number.isFinite(startMs) && now.getTime() < startMs) {
    return {
      ok: false,
      error: 'too_early',
      message: 'No-show lze označit až po začátku termínu.',
    }
  }

  const ts = nowIso()
  return {
    ok: true,
    value: replaceBooking({
      ...booking,
      status: 'no_show',
      noShowAt: ts,
      updatedAt: ts,
    }),
  }
}

export type RescheduleBookingInput = {
  bookingId: string
  newStartAt: string
  actor: CancelBookingActor
  now?: Date
  clientRequestId?: string
}

/**
 * Direct reschedule: move booking to a new available slot on the same record.
 * Preserves originalStartAt/originalEndAt on first move.
 */
export function rescheduleBooking(input: RescheduleBookingInput): BookingResult<Booking> {
  const booking = getBooking(input.bookingId)
  if (!booking) return { ok: false, error: 'not_found', message: 'Rezervace nenalezena.' }

  if (input.actor.kind === 'owner') {
    if (!input.actor.accountId) {
      return { ok: false, error: 'forbidden', message: 'Chybí účet majitele.' }
    }
    const denied = assertOwnerOwns(booking, input.actor.accountId)
    if (denied) return denied
  } else {
    if (!input.actor.professionalId) {
      return { ok: false, error: 'forbidden', message: 'Chybí profesionální profil.' }
    }
    const denied = assertProfessionalOwns(booking, input.actor.professionalId)
    if (denied) return denied
  }

  if (
    booking.status !== 'requested' &&
    booking.status !== 'payment_pending' &&
    booking.status !== 'confirmed'
  ) {
    return { ok: false, error: 'invalid_status', message: 'Rezervaci nelze přesunout.' }
  }

  const policy = ensureDefaultBookingPolicy(booking.professionalId)
  if (!policy.allowReschedule) {
    return {
      ok: false,
      error: 'reschedule_disabled',
      message: 'Přesun rezervace není u tohoto profesionála povolen.',
    }
  }

  const service = serviceForSlotCheck(booking)
  const newEndAt = addMinutesIso(input.newStartAt, service.durationMinutes)
  const startMs = Date.parse(input.newStartAt)
  const now = input.now ?? new Date()
  if (Number.isNaN(startMs) || startMs < now.getTime()) {
    return { ok: false, error: 'past_slot', message: 'Nový termín je v minulosti.' }
  }

  if (booking.startAt === input.newStartAt && booking.endAt === newEndAt) {
    return { ok: true, value: booking }
  }

  const available = isSlotAvailable({
    professionalId: booking.professionalId,
    service,
    startAt: input.newStartAt,
    endAt: newEndAt,
    availability: getAvailability(booking.professionalId),
    exceptions: getAvailabilityExceptions(booking.professionalId),
    bookings: loadBookings(),
    excludeBookingId: booking.id,
    skipServiceBookableCheck: true,
  })
  if (!available) {
    return {
      ok: false,
      error: 'slot_unavailable',
      message: 'Nový termín není dostupný.',
    }
  }

  const ts = nowIso()
  const next: Booking = {
    ...booking,
    startAt: input.newStartAt,
    endAt: newEndAt,
    durationSnapshot: service.durationMinutes,
    originalStartAt: booking.originalStartAt ?? booking.startAt,
    originalEndAt: booking.originalEndAt ?? booking.endAt,
    rescheduledAt: ts,
    updatedAt: ts,
  }
  if (input.clientRequestId) next.clientRequestId = input.clientRequestId

  return { ok: true, value: replaceBooking(next) }
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
    (b) =>
      Date.parse(b.startAt) >= now.getTime() && toLocalDateIso(new Date(b.startAt)) !== todayIso,
  )
  const history = all.filter((b) =>
    ['declined', 'cancelled_by_owner', 'cancelled_by_professional', 'completed', 'no_show'].includes(
      b.status,
    ),
  )
  return { neue, confirmed, today, upcoming, history }
}

/** Consumer „Moje rezervace“ sections. */
export function partitionOwnerBookings(
  ownerAccountId: string,
  now = new Date(),
): {
  pending: Booking[]
  upcoming: Booking[]
  past: Booking[]
  cancelled: Booking[]
} {
  const all = listBookings({ ownerAccountId })
  const nowMs = now.getTime()
  const pending = all
    .filter((b) => b.status === 'requested')
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const upcoming = all
    .filter((b) => b.status === 'confirmed' && Date.parse(b.startAt) >= nowMs)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const past = all
    .filter(
      (b) =>
        b.status === 'completed' ||
        b.status === 'no_show' ||
        (b.status === 'confirmed' && Date.parse(b.startAt) < nowMs),
    )
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
  const cancelled = all
    .filter((b) =>
      ['declined', 'cancelled_by_owner', 'cancelled_by_professional'].includes(b.status),
    )
    .sort((a, b) => b.startAt.localeCompare(a.startAt))
  return { pending, upcoming, past, cancelled }
}

function toLocalDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
