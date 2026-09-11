import {
  SLOT_BLOCKING_STATUSES,
  type Booking,
  type DayTimeWindow,
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

function bufferBefore(service: ProfessionalService): number {
  return Math.max(0, service.bookingBufferBeforeMinutes ?? 0)
}

function bufferAfter(service: ProfessionalService): number {
  return Math.max(0, service.bookingBufferAfterMinutes ?? 0)
}

/** Expand a booking window by service buffers for overlap checks. */
export function bufferedRange(
  startAt: string,
  endAt: string,
  service: ProfessionalService,
): { startAt: string; endAt: string } {
  const before = bufferBefore(service)
  const after = bufferAfter(service)
  return {
    startAt: before > 0 ? addMinutesIso(startAt, -before) : startAt,
    endAt: after > 0 ? addMinutesIso(endAt, after) : endAt,
  }
}

export function bookingsBlockSlot(
  bookings: Booking[],
  professionalId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string,
  /** When provided, also expand existing booking windows by these buffers. */
  occupyingService?: ProfessionalService,
): boolean {
  return bookings.some((b) => {
    if (b.professionalId !== professionalId) return false
    if (excludeBookingId && b.id === excludeBookingId) return false
    if (!SLOT_BLOCKING_STATUSES.includes(b.status)) return false
    let bStart = b.startAt
    let bEnd = b.endAt
    if (occupyingService) {
      const expanded = bufferedRange(b.startAt, b.endAt, occupyingService)
      bStart = expanded.startAt
      bEnd = expanded.endAt
    }
    return rangesOverlap(bStart, bEnd, startAt, endAt)
  })
}

/** First active window for weekday (legacy single-window callers). */
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

/** All active working-hour rows for a weekday (multi-interval). */
export function getProfessionalAvailabilityWindows(
  professionalId: string,
  availability: ProfessionalAvailability[],
  weekday: Weekday,
): DayTimeWindow[] {
  return availability
    .filter(
      (a) => a.professionalId === professionalId && a.weekday === weekday && a.active,
    )
    .map((a) => ({ startTime: a.startTime, endTime: a.endTime }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/**
 * Resolve working windows for a calendar date.
 * Exceptions win: any closed → []; else all custom_hours for that date;
 * otherwise weekly active intervals.
 */
export function resolveDayWindows(
  professionalId: string,
  dateIso: string,
  availability: ProfessionalAvailability[],
  exceptions: ProfessionalAvailabilityException[] = [],
): DayTimeWindow[] {
  const dayExceptions = exceptions.filter(
    (e) => e.professionalId === professionalId && e.date === dateIso,
  )
  if (dayExceptions.some((e) => e.type === 'closed')) return []

  const custom = dayExceptions.filter(
    (e) =>
      e.type === 'custom_hours' &&
      e.startTime &&
      e.endTime &&
      parseTimeToMinutes(e.startTime) !== null &&
      parseTimeToMinutes(e.endTime) !== null,
  )
  if (custom.length > 0) {
    return custom
      .map((e) => ({ startTime: e.startTime!, endTime: e.endTime! }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  if (dayExceptions.length > 0 && custom.length === 0) {
    // Non-closed exceptions without valid hours → treat as no override, fall through
  }

  const weekday = weekdayFromDate(dateIso)
  return getProfessionalAvailabilityWindows(professionalId, availability, weekday)
}

/** Legacy single-window helper — first window or null. */
export function resolveDayWindow(
  professionalId: string,
  dateIso: string,
  availability: ProfessionalAvailability[],
  exceptions: ProfessionalAvailabilityException[] = [],
): DayTimeWindow | null {
  const windows = resolveDayWindows(professionalId, dateIso, availability, exceptions)
  return windows[0] ?? null
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

function isNewlyBookable(service: ProfessionalService): boolean {
  return (
    service.active &&
    service.bookingEnabled &&
    service.publicVisibility === 'public'
  )
}

function slotFitsWindow(
  slotStartMins: number,
  slotEndMins: number,
  window: DayTimeWindow,
): boolean {
  const startMins = parseTimeToMinutes(window.startTime)
  const endMins = parseTimeToMinutes(window.endTime)
  if (startMins === null || endMins === null) return false
  return slotStartMins >= startMins && slotEndMins <= endMins
}

function collectSlotsInWindow(
  date: string,
  window: DayTimeWindow,
  service: ProfessionalService,
  professionalId: string,
  bookings: Booking[],
  nowMs: number,
): TimeSlot[] {
  const startMins = parseTimeToMinutes(window.startTime)
  const endMins = parseTimeToMinutes(window.endTime)
  if (startMins === null || endMins === null || endMins <= startMins) return []

  const duration = service.durationMinutes
  const step = duration + bufferBefore(service) + bufferAfter(service)
  const slots: TimeSlot[] = []

  for (let cursor = startMins; cursor + duration <= endMins; cursor += step) {
    const startTime = minutesToTime(cursor)
    const startAt = toLocalIso(date, startTime)
    if (!startAt) continue
    const endAt = addMinutesIso(startAt, duration)
    if (Date.parse(startAt) < nowMs) continue
    const candidate = bufferedRange(startAt, endAt, service)
    if (
      bookingsBlockSlot(
        bookings,
        professionalId,
        candidate.startAt,
        candidate.endAt,
        undefined,
        service,
      )
    ) {
      continue
    }
    slots.push({ startAt, endAt })
  }
  return slots
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

  if (!isNewlyBookable(service)) return []
  if (service.professionalId !== professionalId) return []

  const windows = resolveDayWindows(professionalId, date, availability, exceptions)
  if (windows.length === 0) return []

  const nowMs = now.getTime()
  const seen = new Set<string>()
  const slots: TimeSlot[] = []

  for (const window of windows) {
    for (const slot of collectSlotsInWindow(
      date,
      window,
      service,
      professionalId,
      bookings,
      nowMs,
    )) {
      if (seen.has(slot.startAt)) continue
      seen.add(slot.startAt)
      slots.push(slot)
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt))
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
  /** When confirming an existing booking, skip active/bookingEnabled/visibility checks. */
  skipServiceBookableCheck?: boolean
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
    skipServiceBookableCheck = false,
  } = input

  if (!skipServiceBookableCheck && !isNewlyBookable(service)) return false
  if (service.professionalId !== professionalId) return false

  const startMs = Date.parse(startAt)
  const endMs = Date.parse(endAt)
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return false
  if (!skipServiceBookableCheck && startMs < now.getTime()) return false

  if (!skipServiceBookableCheck) {
    const expectedEnd = Date.parse(addMinutesIso(startAt, service.durationMinutes))
    if (Math.abs(expectedEnd - endMs) > 60_000) return false
  }

  const dateIso = toDateIsoLocal(startAt)
  if (!dateIso) return false

  const windows = resolveDayWindows(professionalId, dateIso, availability, exceptions)
  if (windows.length === 0) return false

  const slotStart = localMinutesFromIso(startAt)
  const slotEnd = localMinutesFromIso(endAt)
  if (slotStart === null || slotEnd === null) return false

  const fits = windows.some((w) => slotFitsWindow(slotStart, slotEnd, w))
  if (!fits) return false

  const candidate = bufferedRange(startAt, endAt, service)
  return !bookingsBlockSlot(
    bookings,
    professionalId,
    candidate.startAt,
    candidate.endAt,
    excludeBookingId,
    service,
  )
}

export type FindNextAvailableSlotInput = {
  professionalId: string
  service: ProfessionalService
  availability: ProfessionalAvailability[]
  exceptions?: ProfessionalAvailabilityException[]
  bookings: Booking[]
  now?: Date
  /** Inclusive start date YYYY-MM-DD; defaults to local today. */
  fromDate?: string
  horizonDays?: number
}

/** First real bookable slot within horizon, or null. Never invents fake dates. */
export function findNextAvailableSlot(
  input: FindNextAvailableSlotInput,
): TimeSlot | null {
  const {
    professionalId,
    service,
    availability,
    exceptions = [],
    bookings,
    now = new Date(),
    horizonDays = 28,
  } = input

  const start =
    input.fromDate ??
    (() => {
      const d = now
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })()

  const [y, mo, d] = start.split('-').map(Number)
  for (let i = 0; i < horizonDays; i++) {
    const dt = new Date(y, mo - 1, d + i)
    const dateIso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const slots = getAvailableSlots({
      professionalId,
      service,
      date: dateIso,
      availability,
      exceptions,
      bookings,
      now,
    })
    if (slots.length > 0) return slots[0]
  }
  return null
}

/** Format next slot for public UI: "Dnes 14:00" / "Zítra 9:30" / "15. 9. 10:00". */
export function formatNextAvailableLabel(
  slot: TimeSlot,
  now: Date = new Date(),
): string {
  const start = new Date(slot.startAt)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const slotDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const diffDays = Math.round((slotDay.getTime() - today.getTime()) / 86_400_000)
  const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  if (diffDays === 0) return `Dnes ${time}`
  if (diffDays === 1) return `Zítra ${time}`
  return `${start.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })} ${time}`
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
