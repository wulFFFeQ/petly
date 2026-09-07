import type { Conversation } from '../../types'
import type { LostPetAnnouncement, LostPetChatMessage, LostPetReport } from '../../types/lostPet'

const ANNOUNCEMENTS_KEY = 'lovedandknown.lostPetAnnouncements'
const REPORTS_KEY = 'lovedandknown.lostPetReports'
const CONVERSATIONS_KEY = 'lovedandknown.lostPetConversations'
const CHAT_KEY = 'lovedandknown.lostPetChats'

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

/** Finder-side chat threads keyed by conversation id (mirror of owner conversation messages). */
export type LostPetChatThread = {
  conversationId: string
  announcementId: string
  reportId: string
  finderAnonymousId: string
  petName: string
  messages: LostPetChatMessage[]
}

export function loadLostChatThreads(): LostPetChatThread[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CHAT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LostPetChatThread[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLostChatThreads(items: LostPetChatThread[]) {
  try {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}
