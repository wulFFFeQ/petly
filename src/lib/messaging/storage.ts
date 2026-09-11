import type { Conversation, Message } from '../../types'
import {
  INBOX_CONVERSATIONS_KEY,
  loadPersistedInboxConversations,
  normalizeConversation,
  savePersistedInboxConversations,
} from '../messages/inboxStorage'

export { INBOX_CONVERSATIONS_KEY }

export function createMessagingId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function loadInboxConversations(): Conversation[] {
  return loadPersistedInboxConversations()
}

export function saveInboxConversations(conversations: Conversation[]): void {
  savePersistedInboxConversations(conversations)
}

export function upsertConversation(conversation: Conversation): Conversation {
  const normalized = normalizeConversation(conversation)
  if (!normalized) throw new Error('Invalid conversation')
  const list = loadInboxConversations()
  const idx = list.findIndex((c) => c.id === normalized.id)
  if (idx >= 0) {
    list[idx] = normalized
  } else {
    list.unshift(normalized)
  }
  saveInboxConversations(list)
  return normalized
}

export function formatMessageClock(iso = new Date().toISOString()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Project account-based messages to me/them for the current viewer. */
export function projectConversationForViewer(
  conversation: Conversation,
  viewerAccountId: string | null | undefined,
): Conversation {
  if (!viewerAccountId || !conversation.participantAccountIds?.length) {
    return conversation
  }
  const messages: Message[] = conversation.messages.map((m) => {
    if (!m.senderAccountId) return m
    return {
      ...m,
      sender: m.senderAccountId === viewerAccountId ? 'me' : 'them',
    }
  })
  const last = conversation.messages[conversation.messages.length - 1]
  const unreadForViewer =
    last?.senderAccountId === viewerAccountId ? 0 : conversation.unread
  return { ...conversation, messages, unread: unreadForViewer }
}
