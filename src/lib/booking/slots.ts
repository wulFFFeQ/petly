import {
  SLOT_BLOCKING_STATUSES,
  type Booking,
  type ProfessionalAvailability,
  type ProfessionalAvailabilityException,
  type ProfessionalService,
  type TimeSlot,
  type Weekday,
} from './types'

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function parseTimeToMinutes(time: string): number | null {
  const m = TIME_RE.exec(time.trim())
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** App weekday: 0=Mon … 6=Sun from YYYY-MM-DD (local parse). */
export function weekdayFromDate(dateIso: string): Weekday {
  const [y, mo, d] = dateIso.split('-').map(Number)
  const dt = new Date(y, mo - 1, d)
  const js = dt.getDay() // 0=Sun
  return ((js + 6) % 7) as Weekday
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = Date.parse(aStart)
  const ae = Date.parse(aEnd)
  const bs = Date.parse(bStart)
  const be = Date.parse(bEnd)
  if ([as, ae, bs, be].some((n) => Number.isNaN(n))) return false
  return as < be && bs < ae
}

export function bookingsBlockSlot(
  bookings: Booking[],
  professionalId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string,
): boolean {
  return bookings.some((b) => {
    if (b.professionalId !== professionalId) return false
    if (excludeBookingId && b.id === excludeBookingId) return false
    if (!SLOT_BLOCKING_STATUSES.includes(b.status)) return false
    return rangesOverlap(b.startAt, b.endAt, startAt, endAt)
  })
}

export function getProfessionalAvailability(
  professionalId: string,
  availability: ProfessionalAvailability[],
  weekday: Weekday,
): ProfessionalAvailability | null {
  return (
    availability.find(
      (a) => a.professionalId === professionalId && a.weekday === weekday && a.active,
    ) ?? null
  )
}

export function resolveDayWindow(
  professionalId: string,
  dateIso: string,
  availability: ProfessionalAvailability[],
  exceptions: ProfessionalAvailabilityException[] = [],
): { startTime: string; endTime: string } | null {
  const exception = exceptions.find(
    (e) => e.professionalId === professionalId && e.date === dateIso,
  )
  if (exception) {
    if (exception.type === 'closed') return null
    if (
      exception.type === 'custom_hours' &&
      exception.startTime &&
      exception.endTime
    ) {
      return { startTime: exception.startTime, endTime: exception.endTime }
    }
  }
  const weekday = weekdayFromDate(dateIso)
  const row = getProfessionalAvailability(professionalId, availability, weekday)
  if (!row) return null
  return { startTime: row.startTime, endTime: row.endTime }
}

function toLocalIso(dateIso: string, time: string): string {
  const [y, mo, d] = dateIso.split('-').map(Number)
  const mins = parseTimeToMinutes(time)
  if (mins === null) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const dt = new Date(y, mo - 1, d, h, m, 0, 0)
  return dt.toISOString()
}

export function addMinutesIso(startAt: string, minutes: number): string {
  const t = Date.parse(startAt)
  if (Number.isNaN(t)) return startAt
  return new Date(t + minutes * 60_000).toISOString()
}

export type GetAvailableSlotsInput = {
  professionalId: string
  service: ProfessionalService
  date: string
  availability: ProfessionalAvailability[]
  exceptions?: ProfessionalAvailabilityException[]
  bookings: Booking[]
  now?: Date
}

export function getAvailableSlots(input: GetAvailableSlotsInput): TimeSlot[] {
  const {
    professionalId,
    service,
    date,
    availability,
    exceptions = [],
    bookings,
    now = new Date(),
  } = input

  if (!service.active || !service.bookingEnabled) return []
  if (service.professionalId !== professionalId) return []

  const window = resolveDayWindow(professionalId, date, availability, exceptions)
  if (!window) return []

  const startMins = parseTimeToMinutes(window.startTime)
  const endMins = parseTimeToMinutes(window.endTime)
  if (startMins === null || endMins === null || endMins <= startMins) return []

  const duration = service.durationMinutes
  const slots: TimeSlot[] = []
  const nowMs = now.getTime()

  for (let cursor = startMins; cursor + duration <= endMins; cursor += duration) {
    const startTime = minutesToTime(cursor)
    const startAt = toLocalIso(date, startTime)
    if (!startAt) continue
    const endAt = addMinutesIso(startAt, duration)
    if (Date.parse(startAt) < nowMs) continue
    if (bookingsBlockSlot(bookings, professionalId, startAt, endAt)) continue
    slots.push({ startAt, endAt })
  }

  return slots
}

export function isSlotAvailable(input: {
  professionalId: string
  service: ProfessionalService
  startAt: string
  endAt: string
  availability: ProfessionalAvailability[]
  exceptions?: ProfessionalAvailabilityException[]
  bookings: Booking[]
  now?: Date
  excludeBookingId?: string
}): boolean {
  const {
    professionalId,
    service,
    startAt,
    endAt,
    availability,
    exceptions = [],
    bookings,
    now = new Date(),
    excludeBookingId,
  } = input

  if (!service.active || !service.bookingEnabled) return false
  if (service.professionalId !== professionalId) return false

  const startMs = Date.parse(startAt)
  const endMs = Date.parse(endAt)
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return false
  if (startMs < now.getTime()) return false

  const expectedEnd = Date.parse(addMinutesIso(startAt, service.durationMinutes))
  if (Math.abs(expectedEnd - endMs) > 60_000) return false

  const dateIso = toDateIsoLocal(startAt)
  if (!dateIso) return false

  const window = resolveDayWindow(professionalId, dateIso, availability, exceptions)
  if (!window) return false

  const startMins = parseTimeToMinutes(window.startTime)
  const endMins = parseTimeToMinutes(window.endTime)
  const slotStart = localMinutesFromIso(startAt)
  const slotEnd = localMinutesFromIso(endAt)
  if (
    startMins === null ||
    endMins === null ||
    slotStart === null ||
    slotEnd === null ||
    slotStart < startMins ||
    slotEnd > endMins
  ) {
    return false
  }

  return !bookingsBlockSlot(bookings, professionalId, startAt, endAt, excludeBookingId)
}

function toDateIsoLocal(iso: string): string | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localMinutesFromIso(iso: string): number | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  return d.getHours() * 60 + d.getMinutes()
}
