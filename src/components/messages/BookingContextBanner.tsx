import { getBooking } from '../../lib/booking'
import {
  buildBookingMessageContext,
  isBookingEndedStatus,
} from '../../lib/messaging'
import type { Conversation } from '../../types'

interface BookingContextBannerProps {
  conversation: Conversation
}

/**
 * Booking context strip — not a chat message.
 * Extension point: emergency disclaimer for vet/clinic can hook here later.
 */
export function BookingContextBanner({ conversation }: BookingContextBannerProps) {
  if (!conversation.bookingId && conversation.contactType !== 'professional') {
    return null
  }

  const booking = conversation.bookingId ? getBooking(conversation.bookingId) : null
  const ctx = booking ? buildBookingMessageContext(booking) : null
  const ended = booking
    ? isBookingEndedStatus(booking.status)
    : conversation.bookingStatusSnapshot === 'Dokončeno' ||
      conversation.bookingStatusSnapshot === 'Zrušeno' ||
      conversation.bookingStatusSnapshot === 'Nedostavil/a se'

  const summary = ctx?.summaryLine ?? conversation.petContext
  const whenLine = ctx
    ? [ctx.whenLine, ctx.statusLabel].filter(Boolean).join('\n')
    : [conversation.serviceNameSnapshot, conversation.bookingStatusSnapshot]
        .filter(Boolean)
        .join(' · ')

  return (
    <div
      className="border-b border-[#E8E4DC] bg-white px-5 py-2.5"
      data-testid="booking-context-banner"
    >
      <p className="text-xs font-semibold text-[#234B54]">{summary}</p>
      {ctx ? (
        <p className="mt-0.5 text-[11px] text-[#7D8B82]">
          {ctx.whenLine}
          {ctx.whenLine ? ' · ' : ''}
          {ctx.statusLabel}
        </p>
      ) : whenLine ? (
        <p className="mt-0.5 whitespace-pre-line text-[11px] text-[#7D8B82]">{whenLine}</p>
      ) : null}
      {ended ? (
        <p
          className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#A3AEA7]"
          data-testid="booking-ended-banner"
        >
          Rezervace ukončena
        </p>
      ) : null}
      {/* Extension point: acute emergency disclaimer for veterinarian / clinic. */}
    </div>
  )
}
