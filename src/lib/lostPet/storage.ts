import type { Conversation } from '../../types'
import type {
  LostPetAnnouncement,
  LostPetReport,
  SafeContactChannel,
} from '../../types/lostPet'

const ANNOUNCEMENTS_KEY = 'lovedandknown.lostPetAnnouncements'
const REPORTS_KEY = 'lovedandknown.lostPetReports'
const CONVERSATIONS_KEY = 'lovedandknown.lostPetConversations'
const SAFE_CONTACT_KEY = 'lovedandknown.safeContactChannels'
/** Legacy key — migrated once into SAFE_CONTACT_KEY. */
const LEGACY_CHAT_KEY = 'lovedandknown.lostPetChats'

export function loadLostAnnouncements(): LostPetAnnouncement[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(ANNOUNCEMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LostPetAnnouncement[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLostAnnouncements(items: LostPetAnnouncement[]) {
  try {
    window.localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}

export function loadLostReports(): LostPetReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LostPetReport[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLostReports(items: LostPetReport[]) {
  try {
    window.localStorage.setItem(REPORTS_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}

export function loadLostConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Conversation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLostConversations(items: Conversation[]) {
  try {
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}

/** @deprecated Use SafeContactChannel */
export type LostPetChatThread = SafeContactChannel

function migrateLegacyThreads(raw: unknown): SafeContactChannel[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const legacy = item as Partial<SafeContactChannel> & {
      conversationId?: string
      messages?: SafeContactChannel['messages']
    }
    return {
      id: legacy.id ?? `sc-${legacy.conversationId ?? Date.now()}`,
      conversationId: legacy.conversationId ?? legacy.id ?? `lost-conv-${Date.now()}`,
      announcementId: legacy.announcementId ?? '',
      reportId: legacy.reportId ?? '',
      petId: legacy.petId ?? '',
      petName: legacy.petName ?? 'Mazlíček',
      finderAnonymousId: legacy.finderAnonymousId ?? '',
      status: legacy.status ?? 'active',
      createdAt: legacy.createdAt ?? new Date().toISOString(),
      closedAt: legacy.closedAt,
      closedReason: legacy.closedReason,
      thankYouSentAt: legacy.thankYouSentAt,
      messages: Array.isArray(legacy.messages) ? legacy.messages : [],
      contactExchange: legacy.contactExchange,
    }
  })
}

export function loadSafeContactChannels(): SafeContactChannel[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SAFE_CONTACT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      return migrateLegacyThreads(parsed)
    }
    const legacy = window.localStorage.getItem(LEGACY_CHAT_KEY)
    if (legacy) {
      const migrated = migrateLegacyThreads(JSON.parse(legacy) as unknown)
      window.localStorage.setItem(SAFE_CONTACT_KEY, JSON.stringify(migrated))
      return migrated
    }
    return []
  } catch {
    return []
  }
}

export function saveSafeContactChannels(items: SafeContactChannel[]) {
  try {
    window.localStorage.setItem(SAFE_CONTACT_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}

/** @deprecated */
export function loadLostChatThreads(): SafeContactChannel[] {
  return loadSafeContactChannels()
}

/** @deprecated */
export function saveLostChatThreads(items: SafeContactChannel[]) {
  saveSafeContactChannels(items)
}
