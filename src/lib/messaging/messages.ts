import type { ClinicalShareAttachment, Conversation, Message } from '../../types'
import {
  assertClinicalShareAttachmentSafe,
  assertMessagingPayloadSafe,
  isClinicalShareAttachment,
} from './privacy'
import {
  canAccessConversation,
  type MessagingErrorCode,
  type MessagingResult,
} from './conversations'
import {
  createMessagingId,
  formatMessageClock,
  loadInboxConversations,
  projectConversationForViewer,
  upsertConversation,
} from './storage'

function fail<T>(code: MessagingErrorCode, message: string): MessagingResult<T> {
  return { ok: false, code, message }
}

export type SendMessageResult = {
  conversation: Conversation
  message: Message
  recipientAccountId: string | null
}

/**
 * Send a text message (optional clinical_share attachment) in an account conversation.
 * Does not mutate booking state. Does not grant clinical access.
 */
export function sendMessage(input: {
  conversationId: string
  senderAccountId: string
  text: string
  attachment?: ClinicalShareAttachment
}): MessagingResult<SendMessageResult> {
  const text = input.text.trim()
  const hasAttachment = Boolean(input.attachment)
  if (!text && !hasAttachment) {
    return fail('invalid', 'Zpráva nesmí být prázdná')
  }

  if (input.attachment) {
    try {
      assertClinicalShareAttachmentSafe(input.attachment)
    } catch (err) {
      return fail(
        'invalid',
        err instanceof Error ? err.message : 'Neplatná příloha',
      )
    }
  }

  const list = loadInboxConversations()
  const idx = list.findIndex((c) => c.id === input.conversationId)
  if (idx < 0) return fail('not_found', 'Konverzace nenalezena')

  const conversation = list[idx]!
  if (!canAccessConversation(input.senderAccountId, conversation)) {
    return fail('forbidden', 'Nemáte přístup ke konverzaci')
  }
  if (!conversation.participantAccountIds?.length) {
    return fail('invalid', 'Tato konverzace nepodporuje account messaging')
  }

  const now = new Date().toISOString()
  const message: Message = {
    id: createMessagingId('msg'),
    sender: 'me',
    text: text || 'Sdílen klinický záznam',
    time: formatMessageClock(now),
    senderAccountId: input.senderAccountId,
    createdAt: now,
    ...(input.attachment ? { attachment: input.attachment } : {}),
  }
  assertMessagingPayloadSafe(message)

  const recipientAccountId =
    conversation.participantAccountIds.find((id) => id !== input.senderAccountId) ??
    null

  const messages = [...conversation.messages, message]
  const unreadForRecipient = recipientAccountId
    ? messages.filter(
        (m) => m.senderAccountId === input.senderAccountId && !m.readAt,
      ).length
    : 0

  const lastMessage = input.attachment ? 'Sdílen klinický záznam' : text

  const updated: Conversation = {
    ...conversation,
    messages,
    lastMessage,
    time: 'Právě teď',
    updatedAt: now,
    unread: unreadForRecipient,
  }
  assertMessagingPayloadSafe({
    id: updated.id,
    bookingId: updated.bookingId,
    participantAccountIds: updated.participantAccountIds,
    lastMessage: updated.lastMessage,
  })

  const saved = upsertConversation(updated)
  return {
    ok: true,
    data: {
      conversation: projectConversationForViewer(saved, input.senderAccountId),
      message,
      recipientAccountId,
    },
  }
}

/**
 * Mark conversation read for viewer: clear unread + stamp readAt on others' messages.
 */
export function markConversationRead(input: {
  conversationId: string
  accountId: string
}): MessagingResult<Conversation> {
  const list = loadInboxConversations()
  const idx = list.findIndex((c) => c.id === input.conversationId)
  if (idx < 0) return fail('not_found', 'Konverzace nenalezena')

  const conversation = list[idx]!
  if (!canAccessConversation(input.accountId, conversation)) {
    return fail('forbidden', 'Nemáte přístup ke konverzaci')
  }

  const now = new Date().toISOString()
  const messages = conversation.messages.map((m) => {
    if (m.senderAccountId && m.senderAccountId !== input.accountId && !m.readAt) {
      return { ...m, readAt: now }
    }
    return m
  })

  const saved = upsertConversation({
    ...conversation,
    messages,
    unread: 0,
    updatedAt: conversation.updatedAt ?? now,
  })

  return {
    ok: true,
    data: projectConversationForViewer(saved, input.accountId),
  }
}

/**
 * Unread count for account-based threads only (not booking notification bell).
 * Uses conversation.unread when the viewer is not the last sender.
 */
export function getUnreadCountForAccount(accountId: string): number {
  const list = loadInboxConversations()
  let total = 0
  for (const c of list) {
    if (!canAccessConversation(accountId, c)) continue
    if (!c.participantAccountIds?.length) continue
    if (c.archived) continue
    if (c.unread <= 0) continue
    const last = c.messages[c.messages.length - 1]
    if (last?.senderAccountId === accountId) continue
    total += c.unread
  }
  return total
}

export function countUnreadMessagesInConversation(
  conversation: Conversation,
  accountId: string,
): number {
  if (!canAccessConversation(accountId, conversation)) return 0
  return conversation.messages.filter(
    (m) => m.senderAccountId && m.senderAccountId !== accountId && !m.readAt,
  ).length
}

export { isClinicalShareAttachment }
