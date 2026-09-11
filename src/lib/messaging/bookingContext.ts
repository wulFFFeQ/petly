import type { Booking, BookingStatus } from '../booking/types'

const ENDED: BookingStatus[] = [
  'completed',
  'cancelled_by_owner',
  'cancelled_by_professional',
  'no_show',
  'declined',
]

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Čeká na potvrzení',
  confirmed: 'Potvrzeno',
  declined: 'Odmítnuto',
  cancelled_by_owner: 'Zrušeno',
  cancelled_by_professional: 'Zrušeno',
  completed: 'Dokončeno',
  no_show: 'Nedostavil/a se',
}

export type BookingMessageContext = {
  petName: string
  serviceName: string
  dateLabel: string
  timeLabel: string
  statusLabel: string
  status: BookingStatus
  isEnded: boolean
  /** Single-line summary for banners / list. */
  summaryLine: string
  whenLine: string
}

function formatDateCs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`
}

function formatTimeCs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function isBookingEndedStatus(status: BookingStatus): boolean {
  return ENDED.includes(status)
}

/**
 * Minimal public booking context for messaging UI.
 * Never includes health, contacts, microchip, or internal notes.
 */
export function buildBookingMessageContext(
  booking: Pick<
    Booking,
    | 'petName'
    | 'serviceName'
    | 'serviceNameSnapshot'
    | 'startAt'
    | 'status'
  >,
): BookingMessageContext {
  const petName = (booking.petName ?? 'Mazlíček').trim() || 'Mazlíček'
  const serviceName =
    (booking.serviceNameSnapshot ?? booking.serviceName ?? 'Služba').trim() || 'Služba'
  const dateLabel = formatDateCs(booking.startAt)
  const timeLabel = formatTimeCs(booking.startAt)
  const statusLabel = STATUS_LABEL[booking.status] ?? booking.status
  const isEnded = isBookingEndedStatus(booking.status)
  const whenLine = [dateLabel, timeLabel].filter(Boolean).join(' · ')
  const summaryLine = `${petName} · ${serviceName}`
  return {
    petName,
    serviceName,
    dateLabel,
    timeLabel,
    statusLabel,
    status: booking.status,
    isEnded,
    summaryLine,
    whenLine,
  }
}
