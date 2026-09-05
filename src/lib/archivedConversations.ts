const ARCHIVED_CONVERSATIONS_KEY = 'loved-known-archived-conversations'

export function loadArchivedConversationIds(): string[] {
  try {
    const raw = localStorage.getItem(ARCHIVED_CONVERSATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function saveArchivedConversationIds(ids: string[]) {
  localStorage.setItem(ARCHIVED_CONVERSATIONS_KEY, JSON.stringify(ids))
}
