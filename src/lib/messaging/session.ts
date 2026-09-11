/**
 * UI-facing messaging session helpers: mutate domain + notify.
 */

import {
  emitMessageReceivedNotification,
  type NotificationDraft,
} from '../notifications'
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
