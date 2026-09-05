const CONVERSATION_PREFS_KEY = 'loved-known-conversation-prefs'

export type ConversationPrefs = {
  archivedIds: string[]
  unreadById: Record<string, number>
}

const EMPTY_PREFS: ConversationPrefs = {
  archivedIds: [],
  unreadById: {},
}

export function loadConversationPrefs(): ConversationPrefs {
  try {
    const raw = localStorage.getItem(CONVERSATION_PREFS_KEY)
    if (!raw) {
      // Migrate older archive-only storage if present.
      const legacy = localStorage.getItem('loved-known-archived-conversations')
      if (legacy) {
        const parsed = JSON.parse(legacy) as unknown
        if (Array.isArray(parsed)) {
          return {
            archivedIds: parsed.filter((id): id is string => typeof id === 'string'),
            unreadById: {},
          }
        }
      }
      return { ...EMPTY_PREFS, unreadById: {} }
    }

    const parsed = JSON.parse(raw) as Partial<ConversationPrefs>
    const archivedIds = Array.isArray(parsed.archivedIds)
      ? parsed.archivedIds.filter((id): id is string => typeof id === 'string')
      : []
    const unreadById: Record<string, number> = {}
    if (parsed.unreadById && typeof parsed.unreadById === 'object') {
      for (const [id, value] of Object.entries(parsed.unreadById)) {
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          unreadById[id] = Math.floor(value)
        }
      }
    }
    return { archivedIds, unreadById }
  } catch {
    return { ...EMPTY_PREFS, unreadById: {} }
  }
}

export function saveConversationPrefs(prefs: ConversationPrefs) {
  localStorage.setItem(CONVERSATION_PREFS_KEY, JSON.stringify(prefs))
}
