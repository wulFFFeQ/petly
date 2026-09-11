import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import type { Conversation } from '../../types'
import {
  findConversationByBookingId,
  openBookingConversationRequest,
} from '../../lib/messaging'
import { formatMessageClock } from '../../lib/messaging'

export type BookingCommunicationRole = 'owner' | 'professional'

interface BookingCommunicationSectionProps {
  bookingId: string
  callerAccountId: string
  role: BookingCommunicationRole
  /** Bump to re-read conversation from storage. */
  revision?: number
}

function messagesHref(role: BookingCommunicationRole, conversationId: string): string {
  const q = `conversationId=${encodeURIComponent(conversationId)}`
  return role === 'professional' ? `/professional/messages?${q}` : `/messages?${q}`
}

export function BookingCommunicationSection({
  bookingId,
  callerAccountId,
  role,
  revision = 0,
}: BookingCommunicationSectionProps) {
  const navigate = useNavigate()
  void revision

  const conversation: Conversation | null = findConversationByBookingId(bookingId)
  const hasMessages = Boolean(conversation && conversation.messages.length > 0)
  const last = conversation?.messages[conversation.messages.length - 1]
  const lastPreview = last?.text ?? ''
  const lastTime =
    last?.createdAt != null
      ? formatMessageClock(last.createdAt)
      : last?.time || conversation?.time || ''

  const ctaLabel =
    role === 'owner' ? 'Napsat profesionálovi' : 'Napsat majiteli'
  const openLabel = hasMessages ? 'Otevřít konverzaci' : 'Napsat'

  const open = () => {
    const result = openBookingConversationRequest(bookingId, callerAccountId)
    if (!result.ok) {
      return
    }
    navigate(messagesHref(role, result.data.id))
  }

  return (
    <Card variant="elevated" data-testid="booking-communication-section">
      <p className="text-sm font-bold text-[#191E1B]">Komunikace</p>
      {!hasMessages ? (
        <p className="mt-1 text-xs text-[#7D8B82]" data-testid="booking-communication-empty">
          Zatím žádné zprávy.
        </p>
      ) : (
        <div className="mt-2" data-testid="booking-communication-preview">
          <p className="text-xs text-[#4A564F] line-clamp-2">{lastPreview}</p>
          {lastTime ? (
            <p className="mt-0.5 text-[10px] font-medium text-[#7D8B82]">{lastTime}</p>
          ) : null}
        </div>
      )}
      <Button
        variant={hasMessages ? 'secondary' : 'primary'}
        size="sm"
        className="mt-3"
        data-testid="booking-communication-cta"
        aria-label={ctaLabel}
        onClick={open}
      >
        {openLabel}
      </Button>
      {!hasMessages ? (
        <p className="mt-1 text-[10px] text-[#A3AEA7]">{ctaLabel}</p>
      ) : null}
    </Card>
  )
}
