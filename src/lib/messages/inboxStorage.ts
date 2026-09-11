import type { Conversation, ConversationContactType, Message } from '../../types'
import { loadConversationPrefs } from '../archivedConversations'

/**
 * Persist community / Discover / vet / professional inbox threads (not lost/emergency —
 * those live in AppContext lostPet storage).
 */
export const INBOX_CONVERSATIONS_KEY = 'lovedandknown.inboxConversations'

const CONTACT_TYPES = new Set<ConversationContactType>([
  'vet',
  'trainer',
  'community',
  'lost_finder',
  'emergency_finder',
  'professional',
])

function isInboxConversation(c: Conversation): boolean {
  return c.contactType !== 'lost_finder' && c.contactType !== 'emergency_finder'
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = asString(r.id)
  const text = asString(r.text)
  if (!id) return null
  const senderRaw = asString(r.sender)
  const sender: 'me' | 'them' = senderRaw === 'them' ? 'them' : 'me'
  const msg: Message = {
    id,
    sender,
    text,
    time: asString(r.time) || '',
  }
  const senderAccountId = asString(r.senderAccountId)
  if (senderAccountId) msg.senderAccountId = senderAccountId
  const createdAt = asString(r.createdAt)
  if (createdAt) msg.createdAt = createdAt
  const readAt = asString(r.readAt)
  if (readAt) msg.readAt = readAt
  if (r.attachment && typeof r.attachment === 'object') {
    msg.attachment = r.attachment as Message['attachment']
  }
  return msg
}

export function normalizeConversation(raw: unknown): Conversation | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = asString(r.id)
  const contactType = asString(r.contactType) as ConversationContactType
  if (!id || !CONTACT_TYPES.has(contactType)) return null

  const messagesRaw = Array.isArray(r.messages) ? r.messages : []
  const messages = messagesRaw
    .map(normalizeMessage)
    .filter((m): m is Message => Boolean(m))

  const conversation: Conversation = {
    id,
    name: asString(r.name, 'Kontakt'),
    avatar: asString(r.avatar),
    petContext: asString(r.petContext),
    contactType,
    lastMessage: asString(r.lastMessage),
    time: asString(r.time),
    unread: Math.max(0, asNumber(r.unread, 0)),
    messages,
  }

  const role = asString(r.role)
  if (role) conversation.role = role
  if (typeof r.online === 'boolean') conversation.online = r.online
  if (typeof r.archived === 'boolean') conversation.archived = r.archived

  const petId = asString(r.petId)
  if (petId) conversation.petId = petId
  const contactPetId = asString(r.contactPetId)
  if (contactPetId) conversation.contactPetId = contactPetId
  const contactAuthorId = asString(r.contactAuthorId)
  if (contactAuthorId) conversation.contactAuthorId = contactAuthorId
  const lostAnnouncementId = asString(r.lostAnnouncementId)
  if (lostAnnouncementId) conversation.lostAnnouncementId = lostAnnouncementId
  const lostReportId = asString(r.lostReportId)
  if (lostReportId) conversation.lostReportId = lostReportId
  const finderAnonymousId = asString(r.finderAnonymousId)
  if (finderAnonymousId) conversation.finderAnonymousId = finderAnonymousId

  if (Array.isArray(r.participantAccountIds)) {
    const ids = r.participantAccountIds
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim())
    if (ids.length) conversation.participantAccountIds = [...new Set(ids)]
  }
  const bookingId = asString(r.bookingId)
  if (bookingId) conversation.bookingId = bookingId
  const professionalId = asString(r.professionalId)
  if (professionalId) conversation.professionalId = professionalId
  const createdAt = asString(r.createdAt)
  if (createdAt) conversation.createdAt = createdAt
  const updatedAt = asString(r.updatedAt)
  if (updatedAt) conversation.updatedAt = updatedAt
  const serviceNameSnapshot = asString(r.serviceNameSnapshot)
  if (serviceNameSnapshot) conversation.serviceNameSnapshot = serviceNameSnapshot
  const bookingStatusSnapshot = asString(r.bookingStatusSnapshot)
  if (bookingStatusSnapshot) conversation.bookingStatusSnapshot = bookingStatusSnapshot

  return conversation
}

export function loadPersistedInboxConversations(): Conversation[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(INBOX_CONVERSATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeConversation)
      .filter((c): c is Conversation => Boolean(c) && isInboxConversation(c))
  } catch {
    return []
  }
}

export function savePersistedInboxConversations(conversations: Conversation[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    const inbox = conversations
      .map(normalizeConversation)
      .filter((c): c is Conversation => Boolean(c) && isInboxConversation(c))
    localStorage.setItem(INBOX_CONVERSATIONS_KEY, JSON.stringify(inbox))
  } catch {
    // best-effort
  }
}

/** Merge seed conversations with persisted overrides (persisted wins by id). */
export function mergeInboxConversations(
  seed: Conversation[],
  persisted: Conversation[],
): Conversation[] {
  const prefs = loadConversationPrefs()
  const archivedIds = new Set(prefs.archivedIds)
  const byId = new Map<string, Conversation>()

  for (const conversation of seed) {
    byId.set(conversation.id, conversation)
  }
  for (const conversation of persisted) {
    byId.set(conversation.id, conversation)
  }

  const seedIds = new Set(seed.map((c) => c.id))
  const ordered: Conversation[] = []
  for (const conversation of persisted) {
    if (!seedIds.has(conversation.id)) ordered.push(conversation)
  }
  for (const conversation of seed) {
    ordered.push(byId.get(conversation.id) ?? conversation)
  }

  const seen = new Set<string>()
  const unique: Conversation[] = []
  for (const conversation of ordered) {
    if (seen.has(conversation.id)) continue
    seen.add(conversation.id)
    const merged = byId.get(conversation.id) ?? conversation
    unique.push({
      ...merged,
      archived: archivedIds.has(merged.id) ? true : merged.archived,
      unread:
        merged.id in prefs.unreadById ? prefs.unreadById[merged.id] : merged.unread,
    })
  }
  return unique
}

export { INBOX_CONVERSATIONS_KEY as INBOX_KEY }
