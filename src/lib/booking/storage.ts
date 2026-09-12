import { isServiceCategory } from './serviceCategories'
import {
  BOOKING_STATUSES,
  CANCELLATION_REASON_CODES,
  SERVICE_DEPOSIT_TYPES,
  SERVICE_PAYMENT_COLLECTIONS,
  SERVICE_PRICE_TYPES,
  type AvailabilityExceptionType,
  type Booking,
  type BookingConfirmMode,
  type BookingNoShowMode,
  type BookingStatus,
  type CancellationReasonCode,
  type ProfessionalAvailability,
  type ProfessionalAvailabilityException,
  type ProfessionalAvailabilitySettings,
  type ProfessionalBookingPolicy,
  type ProfessionalService,
  type ServiceDepositType,
  type ServiceLocationType,
  type ServicePaymentCollection,
  type ServicePriceType,
  type ServicePublicVisibility,
  type Weekday,
} from './types'

export const BOOKINGS_STORAGE_KEY = 'lovedandknown.bookings'
export const PROFESSIONAL_SERVICES_STORAGE_KEY = 'lovedandknown.professionalServices'
export const PROFESSIONAL_AVAILABILITY_STORAGE_KEY = 'lovedandknown.professionalAvailability'
export const PROFESSIONAL_AVAILABILITY_EXCEPTIONS_STORAGE_KEY =
  'lovedandknown.professionalAvailabilityExceptions'
export const PROFESSIONAL_AVAILABILITY_SETTINGS_STORAGE_KEY =
  'lovedandknown.professionalAvailabilitySettings'
export const PROFESSIONAL_BOOKING_POLICIES_STORAGE_KEY =
  'lovedandknown.professionalBookingPolicies'

export const DEFAULT_AVAILABILITY_TIMEZONE = 'Europe/Prague'

const STATUS_SET = new Set<string>(BOOKING_STATUSES)
const EXCEPTION_TYPES = new Set<AvailabilityExceptionType>(['closed', 'custom_hours'])
const PRICE_TYPE_SET = new Set<string>(SERVICE_PRICE_TYPES)
const VISIBILITY_SET = new Set<ServicePublicVisibility>(['public', 'private'])
const LOCATION_TYPES = new Set<ServiceLocationType>([
  'on_site',
  'at_client',
  'remote',
  'other',
])
const PAYMENT_COLLECTION_SET = new Set<string>(SERVICE_PAYMENT_COLLECTIONS)
const DEPOSIT_TYPE_SET = new Set<string>(SERVICE_DEPOSIT_TYPES)
const REASON_CODE_SET = new Set<string>(CANCELLATION_REASON_CODES)

function durationMinutesBetween(startAt: string, endAt: string): number | undefined {
  const start = Date.parse(startAt)
  const end = Date.parse(endAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return undefined
  return Math.round((end - start) / 60_000)
}

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

  const serviceNameSnapshot =
    asString(raw.serviceNameSnapshot) ?? asString(raw.serviceName)
  if (serviceNameSnapshot) {
    booking.serviceNameSnapshot = serviceNameSnapshot
    booking.serviceName = serviceNameSnapshot
  }

  if (asString(raw.petName)) booking.petName = asString(raw.petName)
  if (asString(raw.professionalName)) booking.professionalName = asString(raw.professionalName)
  if (asString(raw.ownerDisplayName)) booking.ownerDisplayName = asString(raw.ownerDisplayName)

  const priceSnapshot = asNumber(raw.priceSnapshot) ?? asNumber(raw.price)
  if (priceSnapshot !== undefined && priceSnapshot >= 0) {
    booking.priceSnapshot = priceSnapshot
    booking.price = priceSnapshot
  }
  const currencySnapshot = asString(raw.currencySnapshot) ?? asString(raw.currency)
  if (currencySnapshot) {
    booking.currencySnapshot = currencySnapshot
    booking.currency = currencySnapshot
  }

  const durationSnapshot =
    asNumber(raw.durationSnapshot) ?? durationMinutesBetween(startAt, endAt)
  if (durationSnapshot !== undefined && durationSnapshot > 0) {
    booking.durationSnapshot = Math.round(durationSnapshot)
  }

  if (asString(raw.clientRequestId)) booking.clientRequestId = asString(raw.clientRequestId)
  if (asString(raw.cancelledAt)) booking.cancelledAt = asString(raw.cancelledAt)
  if (asString(raw.cancellationReason)) booking.cancellationReason = asString(raw.cancellationReason)
  const reasonCode = asString(raw.cancellationReasonCode)
  if (reasonCode && REASON_CODE_SET.has(reasonCode)) {
    booking.cancellationReasonCode = reasonCode as CancellationReasonCode
  }
  if (asString(raw.confirmedAt)) booking.confirmedAt = asString(raw.confirmedAt)
  if (asString(raw.completedAt)) booking.completedAt = asString(raw.completedAt)
  if (asString(raw.declinedAt)) booking.declinedAt = asString(raw.declinedAt)
  if (asString(raw.originalStartAt)) booking.originalStartAt = asString(raw.originalStartAt)
  if (asString(raw.originalEndAt)) booking.originalEndAt = asString(raw.originalEndAt)
  if (asString(raw.rescheduledAt)) booking.rescheduledAt = asString(raw.rescheduledAt)
  if (asString(raw.noShowAt)) booking.noShowAt = asString(raw.noShowAt)
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

  const price = asNumber(raw.price)
  let priceType: ServicePriceType = 'on_request'
  const rawPriceType = asString(raw.priceType)
  if (rawPriceType && PRICE_TYPE_SET.has(rawPriceType)) {
    priceType = rawPriceType as ServicePriceType
  } else if (price !== undefined && price >= 0) {
    priceType = 'fixed'
  }

  const category = isServiceCategory(raw.category) ? raw.category : 'other'

  let publicVisibility: ServicePublicVisibility = 'public'
  const rawVis = asString(raw.publicVisibility)
  if (rawVis && VISIBILITY_SET.has(rawVis as ServicePublicVisibility)) {
    publicVisibility = rawVis as ServicePublicVisibility
  }

  const service: ProfessionalService = {
    id,
    professionalId,
    name,
    durationMinutes: Math.round(durationMinutes),
    category,
    priceType,
    publicVisibility,
    active: asBool(raw.active, true),
    bookingEnabled: asBool(raw.bookingEnabled, true),
    createdAt,
    updatedAt,
  }
  if (asString(raw.description)) service.description = asString(raw.description)

  if (priceType === 'on_request') {
    // Never keep a fake price for on_request.
  } else if (price !== undefined && price >= 0) {
    service.price = price
    if (asString(raw.currency)) service.currency = asString(raw.currency)
  }

  const capacity = asNumber(raw.capacity)
  if (capacity !== undefined && capacity > 0) service.capacity = Math.round(capacity)

  const locationType = asString(raw.locationType)
  if (locationType && LOCATION_TYPES.has(locationType as ServiceLocationType)) {
    service.locationType = locationType as ServiceLocationType
  }
  if (asString(raw.notes)) service.notes = asString(raw.notes)

  const bufBefore = asNumber(raw.bookingBufferBeforeMinutes)
  if (bufBefore !== undefined && bufBefore >= 0) {
    service.bookingBufferBeforeMinutes = Math.round(bufBefore)
  }
  const bufAfter = asNumber(raw.bookingBufferAfterMinutes)
  if (bufAfter !== undefined && bufAfter >= 0) {
    service.bookingBufferAfterMinutes = Math.round(bufAfter)
  }

  if (typeof raw.isDemo === 'boolean') service.isDemo = raw.isDemo

  const paymentCollection = asString(raw.paymentCollection)
  if (paymentCollection && PAYMENT_COLLECTION_SET.has(paymentCollection)) {
    service.paymentCollection = paymentCollection as ServicePaymentCollection
  } else {
    service.paymentCollection = 'pay_on_site'
  }

  service.requiresDeposit = asBool(raw.requiresDeposit, false)
  const depositType = asString(raw.depositType)
  if (depositType && DEPOSIT_TYPE_SET.has(depositType)) {
    service.depositType = depositType as ServiceDepositType
  }
  const depositValue = asNumber(raw.depositValue)
  if (depositValue !== undefined && depositValue >= 0) {
    service.depositValue = depositValue
  }
  // Keep deposit fields consistent with collection mode
  if (service.paymentCollection === 'deposit') {
    service.requiresDeposit = true
  } else if (service.paymentCollection === 'pay_on_site') {
    service.requiresDeposit = false
  }

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
  if (asString(raw.label)) exception.label = asString(raw.label)
  return exception
}

export function normalizeAvailabilitySettings(
  raw: unknown,
): ProfessionalAvailabilitySettings | null {
  if (!isRecord(raw)) return null
  const professionalId = asString(raw.professionalId)
  if (!professionalId) return null
  const settings: ProfessionalAvailabilitySettings = { professionalId }
  if (asString(raw.timezone)) settings.timezone = asString(raw.timezone)
  return settings
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
      const id = (n as unknown as { id: string }).id
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

export function loadAvailabilitySettings(): ProfessionalAvailabilitySettings[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROFESSIONAL_AVAILABILITY_SETTINGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ProfessionalAvailabilitySettings[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      const n = normalizeAvailabilitySettings(item)
      if (!n) continue
      if (seen.has(n.professionalId)) continue
      seen.add(n.professionalId)
      out.push(n)
    }
    return out
  } catch {
    return []
  }
}

export function saveAvailabilitySettings(rows: ProfessionalAvailabilitySettings[]): void {
  if (typeof localStorage === 'undefined') return
  const cleaned = rows
    .map((r) => normalizeAvailabilitySettings(r))
    .filter((r): r is ProfessionalAvailabilitySettings => Boolean(r))
  localStorage.setItem(
    PROFESSIONAL_AVAILABILITY_SETTINGS_STORAGE_KEY,
    JSON.stringify(cleaned),
  )
}

export function normalizeBookingPolicy(raw: unknown): ProfessionalBookingPolicy | null {
  if (!isRecord(raw)) return null
  const professionalId = asString(raw.professionalId)
  if (!professionalId) return null

  let cancellationNoticeHours: number | null = 24
  if (raw.cancellationNoticeHours === null) {
    cancellationNoticeHours = null
  } else {
    const hours = asNumber(raw.cancellationNoticeHours)
    if (hours !== undefined && hours >= 0) {
      cancellationNoticeHours = Math.round(hours)
    }
  }

  let confirmMode: BookingConfirmMode = 'manual'
  const rawConfirm = asString(raw.confirmMode)
  if (rawConfirm === 'manual' || rawConfirm === 'instant') {
    confirmMode = rawConfirm
  }

  let noShowMode: BookingNoShowMode = 'after_start'
  if (asString(raw.noShowMode) === 'after_start') {
    noShowMode = 'after_start'
  }

  return {
    professionalId,
    cancellationNoticeHours,
    allowReschedule: asBool(raw.allowReschedule, true),
    // DEMO: always persist as manual even if legacy stored instant.
    confirmMode: confirmMode === 'instant' ? 'manual' : confirmMode,
    noShowMode,
  }
}

export function loadBookingPolicies(): ProfessionalBookingPolicy[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROFESSIONAL_BOOKING_POLICIES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ProfessionalBookingPolicy[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      const n = normalizeBookingPolicy(item)
      if (!n) continue
      if (seen.has(n.professionalId)) continue
      seen.add(n.professionalId)
      out.push(n)
    }
    return out
  } catch {
    return []
  }
}

export function saveBookingPolicies(rows: ProfessionalBookingPolicy[]): void {
  if (typeof localStorage === 'undefined') return
  const cleaned = rows
    .map((r) => normalizeBookingPolicy(r))
    .filter((r): r is ProfessionalBookingPolicy => Boolean(r))
  localStorage.setItem(PROFESSIONAL_BOOKING_POLICIES_STORAGE_KEY, JSON.stringify(cleaned))
}
