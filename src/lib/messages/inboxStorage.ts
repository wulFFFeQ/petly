import type { Conversation } from '../../types'
import { loadConversationPrefs } from '../archivedConversations'

/**
 * Persist community / Discover / vet inbox threads (not lost/emergency —
 * those live in AppContext lostPet storage).
 */
const INBOX_KEY = 'lovedandknown.inboxConversations'

function isInboxConversation(c: Conversation): boolean {
  return c.contactType !== 'lost_finder' && c.contactType !== 'emergency_finder'
}

export function loadPersistedInboxConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(INBOX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Conversation =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as Conversation).id === 'string' &&
        typeof (item as Conversation).contactType === 'string' &&
        isInboxConversation(item as Conversation),
    )
  } catch {
    return []
  }
}

export function savePersistedInboxConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return
  try {
    const inbox = conversations.filter(isInboxConversation)
    window.localStorage.setItem(INBOX_KEY, JSON.stringify(inbox))
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

  // Persisted Discover threads not in seed should appear first-ish after seed order.
  const seedIds = new Set(seed.map((c) => c.id))
  const ordered: Conversation[] = []
  for (const conversation of persisted) {
    if (!seedIds.has(conversation.id)) ordered.push(conversation)
  }
  for (const conversation of seed) {
    ordered.push(byId.get(conversation.id) ?? conversation)
  }

  // Deduplicate while preserving order
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

export { INBOX_KEY as INBOX_CONVERSATIONS_KEY }
