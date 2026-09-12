/**
 * UI-facing messaging session helpers: mutate domain + notify.
 */

import {
  emitClinicalShareReceivedNotification,
  emitMessageReceivedNotification,
  type NotificationDraft,
} from '../notifications'
import {
  createClinicalShare,
  type CreateClinicalShareInput,
  type ClinicalShareResult,
} from '../clinical/share'
import {
  getOrCreateBookingConversation,
  getOrCreateProfessionalConversation,
  requireConversationAccess,
  type MessagingResult,
} from './conversations'
import { markConversationRead, sendMessage, type SendMessageResult } from './messages'
import type { Conversation } from '../../types'
import { loadProfessionalProfiles } from '../professional/storage'
import { getBooking } from '../booking/bookings'
import { actorAccountId } from '../security/context'

export type MessagingUpsertNotification = (draft: NotificationDraft) => void

export function openBookingConversationRequest(
  bookingId: string,
  callerAccountId: string,
): MessagingResult<Conversation> {
  return getOrCreateBookingConversation({ bookingId, callerAccountId })
}

export function openProfessionalConversationRequest(
  professionalId: string,
  callerAccountId: string,
): MessagingResult<Conversation> {
  return getOrCreateProfessionalConversation({
    professionalId,
    callerAccountId,
    preferActiveBooking: true,
  })
}

function resolveShareNotificationMeta(
  conversation: Conversation,
  _senderAccountId: string,
  recipientAccountId: string,
): {
  recipientIsProfessional: boolean
} {
  const professional = conversation.professionalId
    ? loadProfessionalProfiles().find((p) => p.id === conversation.professionalId)
    : null
  return {
    recipientIsProfessional: Boolean(
      professional && professional.accountId === recipientAccountId,
    ),
  }
}

export function sendMessageRequest(
  input: {
    conversationId: string
    senderAccountId: string
    text: string
  },
  opts?: { upsertNotification?: MessagingUpsertNotification },
): MessagingResult<SendMessageResult> {
  const result = sendMessage(input)
  if (!result.ok) return result

  const { conversation, message, recipientAccountId } = result.data
  if (opts?.upsertNotification && recipientAccountId) {
    const professional = conversation.professionalId
      ? loadProfessionalProfiles().find((p) => p.id === conversation.professionalId)
      : null
    const booking = conversation.bookingId ? getBooking(conversation.bookingId) : null
    const senderIsOwner = booking
      ? booking.ownerAccountId === input.senderAccountId
      : !professional || professional.accountId !== input.senderAccountId

    let senderDisplayName = 'Uživatel'
    if (senderIsOwner) {
      senderDisplayName = booking?.ownerDisplayName?.trim() || 'Majitel'
    } else {
      senderDisplayName =
        professional?.displayName?.trim() ||
        booking?.professionalName?.trim() ||
        'Profesionál'
    }

    emitMessageReceivedNotification(opts.upsertNotification, {
      messageId: message.id,
      conversationId: conversation.id,
      recipientAccountId,
      senderDisplayName,
      bookingId: conversation.bookingId,
      professionalId: conversation.professionalId,
      recipientIsProfessional: Boolean(
        professional && professional.accountId === recipientAccountId,
      ),
    })
  }

  return result
}

/**
 * K61 — clinical share via existing Messages transport.
 * Notification contains no clinical payload.
 */
export function sendClinicalShareRequest(
  input: CreateClinicalShareInput,
  opts?: { upsertNotification?: MessagingUpsertNotification },
): MessagingResult<ClinicalShareResult> {
  const result = createClinicalShare(input)
  if (!result.ok) return result

  const { conversation, message, recipientAccountId } = result.data
  if (opts?.upsertNotification && recipientAccountId) {
    const meta = resolveShareNotificationMeta(
      conversation,
      actorAccountId(input.context) ?? '',
      recipientAccountId,
    )
    emitClinicalShareReceivedNotification(opts.upsertNotification, {
      messageId: message.id,
      conversationId: conversation.id,
      recipientAccountId,
      bookingId: conversation.bookingId,
      professionalId: conversation.professionalId,
      recipientIsProfessional: meta.recipientIsProfessional,
    })
  }

  return result
}

export function markConversationReadRequest(
  conversationId: string,
  accountId: string,
): MessagingResult<Conversation> {
  return markConversationRead({ conversationId, accountId })
}

export function accessConversationRequest(
  conversationId: string,
  accountId: string,
): MessagingResult<Conversation> {
  return requireConversationAccess(conversationId, accountId)
}
