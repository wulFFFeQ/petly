import type { CalendarEvent, Pet, PetDocument } from '../types'
import { getDocumentTypeLabel } from './documentCategories'
import { subtractDaysIso } from './documentExpiry'

export function buildDocumentReminderEvents(
  doc: PetDocument,
  pet: Pet | undefined,
): CalendarEvent[] {
  if (!doc.reminderEnabled || !doc.expiresAt) return []
  const offsets = (doc.reminderOffsetsDays ?? []).filter((d) => d > 0)
  if (offsets.length === 0) return []

  const petName = pet?.name ?? 'Mazlíček'
  const typeLabel = getDocumentTypeLabel(
    doc.category,
    doc.documentType as Parameters<typeof getDocumentTypeLabel>[1],
  )

  return offsets.flatMap((days) => {
    const date = subtractDaysIso(doc.expiresAt!, days)
    if (!date) return []
    return [
      {
        id: `cal_doc_${doc.id}_${days}`,
        title: `Expirace dokumentu – ${doc.name}`,
        petName,
        petId: doc.petId,
        type: 'document_expiry' as const,
        date,
        notes: `Připomínka ${days} dní před expirací: ${typeLabel}`,
        reminderEnabled: true,
        sourceDocumentId: doc.id,
      } satisfies CalendarEvent,
    ]
  })
}

/** Replace all calendar events linked to a document with the current reminder set. */
export function syncDocumentReminderEvents(
  events: CalendarEvent[],
  doc: PetDocument,
  pet: Pet | undefined,
): CalendarEvent[] {
  const without = events.filter((e) => e.sourceDocumentId !== doc.id)
  return [...without, ...buildDocumentReminderEvents(doc, pet)]
}

export function removeDocumentReminderEvents(
  events: CalendarEvent[],
  documentId: string,
): CalendarEvent[] {
  return events.filter((e) => e.sourceDocumentId !== documentId)
}

/** Ensure reminder events exist for all docs that have reminders enabled. */
export function reconcileDocumentReminders(
  events: CalendarEvent[],
  documents: PetDocument[],
  pets: Pet[],
): CalendarEvent[] {
  const docIds = new Set(documents.map((d) => d.id))
  let next = events.filter(
    (e) => !e.sourceDocumentId || docIds.has(e.sourceDocumentId),
  )

  for (const doc of documents) {
    const pet = pets.find((p) => p.id === doc.petId)
    next = syncDocumentReminderEvents(next, doc, pet)
  }

  return next
}
