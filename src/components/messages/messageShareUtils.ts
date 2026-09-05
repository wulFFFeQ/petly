import { conversations as initialConversations } from '../../data/mockData'
import { loadConversationPrefs } from '../../lib/archivedConversations'
import type { Conversation, HealthRecord } from '../../types'
import {
  Syringe,
  Pill,
  Stethoscope,
  FlaskConical,
} from 'lucide-react'

export type ShareCategory = 'vaccination' | 'medication' | 'visit' | 'results'

export const SHARE_GROUPS: {
  id: ShareCategory
  label: string
  icon: typeof Syringe
}[] = [
  { id: 'vaccination', label: 'Očkování', icon: Syringe },
  { id: 'medication', label: 'Léky', icon: Pill },
  { id: 'visit', label: 'Návštěvy', icon: Stethoscope },
  { id: 'results', label: 'Výsledky', icon: FlaskConical },
]

export function getShareCategory(record: HealthRecord): ShareCategory {
  if (record.type === 'vaccination') return 'vaccination'
  if (record.type === 'medication') return 'medication'
  if (record.type === 'examination' || /laborator|výsledk|vyšetřen/i.test(`${record.title} ${record.subtitle}`)) {
    return 'results'
  }
  return 'visit'
}

export function buildHealthShareMessage(record: HealthRecord, index: number) {
  const now = new Date()
  const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return {
    id: `m_share_${Date.now()}_${index}`,
    sender: 'me' as const,
    text: `Sdílen zdravotní záznam: ${record.title}`,
    time: timeString,
    attachment: {
      kind: 'health_record' as const,
      recordId: record.id,
      title: record.title,
      subtitle: record.subtitle,
      date: record.date,
      category: getShareCategory(record),
    },
  }
}

export function buildInitialConversations(): Conversation[] {
  const prefs = loadConversationPrefs()
  const archivedIds = new Set(prefs.archivedIds)
  return initialConversations.map((conversation) => ({
    ...conversation,
    archived: archivedIds.has(conversation.id),
    unread:
      conversation.id in prefs.unreadById
        ? prefs.unreadById[conversation.id]
        : conversation.unread,
  }))
}
