import {
  BOOKING_STATUSES,
  type AvailabilityExceptionType,
  type Booking,
  type BookingStatus,
  type ProfessionalAvailability,
  type ProfessionalAvailabilityException,
  type ProfessionalService,
  type Weekday,
} from './types'

export const BOOKINGS_STORAGE_KEY = 'lovedandknown.bookings'
export const PROFESSIONAL_SERVICES_STORAGE_KEY = 'lovedandknown.professionalServices'
export const PROFESSIONAL_AVAILABILITY_STORAGE_KEY = 'lovedandknown.professionalAvailability'
export const PROFESSIONAL_AVAILABILITY_EXCEPTIONS_STORAGE_KEY =
  'lovedandknown.professionalAvailabilityExceptions'

const STATUS_SET = new Set<string>(BOOKING_STATUSES)
const EXCEPTION_TYPES = new Set<AvailabilityExceptionType>(['closed', 'custom_hours'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function createBookingId(prefix = 'bkg'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function normalizeBooking(raw: unknown): Booking | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const ownerAccountId = asString(raw.ownerAccountId)
  const professionalId = asString(raw.professionalId)
  const serviceId = asString(raw.serviceId)
  const petId = asString(raw.petId)
  const startAt = asString(raw.startAt)
  const endAt = asString(raw.endAt)
  const status = asString(raw.status)
  if (
    !id ||
    !ownerAccountId ||
    !professionalId ||
    !serviceId ||
    !petId ||
    !startAt ||
    !endAt ||
    !status ||
    !STATUS_SET.has(status)
  ) {
    return null
  }
  const createdAt = asString(raw.createdAt) ?? new Date(0).toISOString()
  const updatedAt = asString(raw.updatedAt) ?? createdAt
  const booking: Booking = {
    id,
    ownerAccountId,
    professionalId,
    serviceId,
    petId,
    startAt,
    endAt,
    status: status as BookingStatus,
    createdAt,
    updatedAt,
  }
  if (asString(raw.note)) booking.note = asString(raw.note)
  if (asString(raw.serviceName)) booking.serviceName = asString(raw.serviceName)
  if (asString(raw.petName)) booking.petName = asString(raw.petName)
  if (asString(raw.professionalName)) booking.professionalName = asString(raw.professionalName)
  if (asString(raw.ownerDisplayName)) booking.ownerDisplayName = asString(raw.ownerDisplayName)
  const price = asNumber(raw.price)
  if (price !== undefined && price >= 0) booking.price = price
  if (asString(raw.currency)) booking.currency = asString(raw.currency)
  if (asString(raw.clientRequestId)) booking.clientRequestId = asString(raw.clientRequestId)
  if (asString(raw.cancelledAt)) booking.cancelledAt = asString(raw.cancelledAt)
  if (asString(raw.cancellationReason)) booking.cancellationReason = asString(raw.cancellationReason)
  if (asString(raw.confirmedAt)) booking.confirmedAt = asString(raw.confirmedAt)
  if (asString(raw.completedAt)) booking.completedAt = asString(raw.completedAt)
  if (asString(raw.declinedAt)) booking.declinedAt = asString(raw.declinedAt)
  return booking
}

export function normalizeProfessionalService(raw: unknown): ProfessionalService | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const professionalId = asString(raw.professionalId)
  const name = asString(raw.name)
  const durationMinutes = asNumber(raw.durationMinutes)
  if (!id || !professionalId || !name || durationMinutes === undefined || durationMinutes <= 0) {
    return null
  }
  const createdAt = asString(raw.createdAt) ?? new Date(0).toISOString()
  const updatedAt = asString(raw.updatedAt) ?? createdAt
  const service: ProfessionalService = {
    id,
    professionalId,
    name,
    durationMinutes: Math.round(durationMinutes),
    active: asBool(raw.active, true),
    bookingEnabled: asBool(raw.bookingEnabled, true),
    createdAt,
    updatedAt,
  }
  if (asString(raw.description)) service.description = asString(raw.description)
  const price = asNumber(raw.price)
  if (price !== undefined && price >= 0) service.price = price
  if (asString(raw.currency)) service.currency = asString(raw.currency)
  return service
}

export function normalizeProfessionalAvailability(raw: unknown): ProfessionalAvailability | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const professionalId = asString(raw.professionalId)
  const weekday = asNumber(raw.weekday)
  const startTime = asString(raw.startTime)
  const endTime = asString(raw.endTime)
  if (
    !id ||
    !professionalId ||
    weekday === undefined ||
    weekday < 0 ||
    weekday > 6 ||
    !startTime ||
    !endTime
  ) {
    return null
  }
  return {
    id,
    professionalId,
    weekday: weekday as Weekday,
    startTime,
    endTime,
    active: asBool(raw.active, true),
  }
}

export function normalizeAvailabilityException(
  raw: unknown,
): ProfessionalAvailabilityException | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const professionalId = asString(raw.professionalId)
  const date = asString(raw.date)
  const type = asString(raw.type)
  if (!id || !professionalId || !date || !type || !EXCEPTION_TYPES.has(type as AvailabilityExceptionType)) {
    return null
  }
  const exception: ProfessionalAvailabilityException = {
    id,
    professionalId,
    date,
    type: type as AvailabilityExceptionType,
  }
  if (asString(raw.startTime)) exception.startTime = asString(raw.startTime)
  if (asString(raw.endTime)) exception.endTime = asString(raw.endTime)
  return exception
}

function loadArray<T>(
  key: string,
  normalize: (raw: unknown) => T | null,
): T[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: T[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      const n = normalize(item)
      if (!n) continue
      const id = (n as { id: string }).id
      if (seen.has(id)) continue
      seen.add(id)
      out.push(n)
    }
    return out
  } catch {
    return []
  }
}

function saveArray(key: string, items: unknown[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(key, JSON.stringify(items))
}

export function loadBookings(): Booking[] {
  return loadArray(BOOKINGS_STORAGE_KEY, normalizeBooking)
}

export function saveBookings(bookings: Booking[]): void {
  saveArray(
    BOOKINGS_STORAGE_KEY,
    bookings.map((b) => normalizeBooking(b)).filter(Boolean),
  )
}

export function loadProfessionalServices(): ProfessionalService[] {
  return loadArray(PROFESSIONAL_SERVICES_STORAGE_KEY, normalizeProfessionalService)
}

export function saveProfessionalServices(services: ProfessionalService[]): void {
  saveArray(
    PROFESSIONAL_SERVICES_STORAGE_KEY,
    services.map((s) => normalizeProfessionalService(s)).filter(Boolean),
  )
}

export function loadProfessionalAvailability(): ProfessionalAvailability[] {
  return loadArray(PROFESSIONAL_AVAILABILITY_STORAGE_KEY, normalizeProfessionalAvailability)
}

export function saveProfessionalAvailability(rows: ProfessionalAvailability[]): void {
  saveArray(
    PROFESSIONAL_AVAILABILITY_STORAGE_KEY,
    rows.map((r) => normalizeProfessionalAvailability(r)).filter(Boolean),
  )
}

export function loadAvailabilityExceptions(): ProfessionalAvailabilityException[] {
  return loadArray(
    PROFESSIONAL_AVAILABILITY_EXCEPTIONS_STORAGE_KEY,
    normalizeAvailabilityException,
  )
}

export function saveAvailabilityExceptions(rows: ProfessionalAvailabilityException[]): void {
  saveArray(
    PROFESSIONAL_AVAILABILITY_EXCEPTIONS_STORAGE_KEY,
    rows.map((r) => normalizeAvailabilityException(r)).filter(Boolean),
  )
}
