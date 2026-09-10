import type { AppNotification } from '../../types'
import {
  normalizeNotification,
  sortNotificationsNewestFirst,
  type NotificationDraft,
} from './model'

/**
 * Insert or update by `dedupeKey`.
 * Existing unread/read state is preserved (never re-marks read → unread).
 */
export function upsertNotification(
  list: AppNotification[],
  draft: NotificationDraft,
): AppNotification[] {
  const now = new Date().toISOString()
  const dedupeKey = draft.dedupeKey
  const existingIndex = list.findIndex((item) => item.dedupeKey === dedupeKey)

  if (existingIndex >= 0) {
    const existing = list[existingIndex]
    const updated: AppNotification = {
      ...existing,
      type: draft.type,
      title: draft.title,
      message: draft.message,
      priority: draft.priority,
      petId: draft.petId ?? existing.petId,
      petName: draft.petName ?? existing.petName,
      href: draft.href ?? existing.href,
      sourceRecordId: draft.sourceRecordId ?? existing.sourceRecordId,
      sourceEventId: draft.sourceEventId ?? existing.sourceEventId,
      conversationId: draft.conversationId ?? existing.conversationId,
      lostAnnouncementId: draft.lostAnnouncementId ?? existing.lostAnnouncementId,
      lostReportId: draft.lostReportId ?? existing.lostReportId,
      time: draft.time ?? existing.time,
      // Preserve unread; never force back to unread
      unread: existing.unread,
    }
    if (
      updated.type === existing.type &&
      updated.title === existing.title &&
      updated.message === existing.message &&
      updated.priority === existing.priority &&
      updated.petId === existing.petId &&
      updated.petName === existing.petName &&
      updated.href === existing.href &&
      updated.sourceRecordId === existing.sourceRecordId &&
      updated.sourceEventId === existing.sourceEventId &&
      updated.conversationId === existing.conversationId &&
      updated.lostAnnouncementId === existing.lostAnnouncementId &&
      updated.lostReportId === existing.lostReportId &&
      updated.time === existing.time
    ) {
      return list
    }
    const next = [...list]
    next[existingIndex] = updated
    return sortNotificationsNewestFirst(next)
  }

  const id = draft.id ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const created: AppNotification = {
    id,
    type: draft.type,
    title: draft.title,
    message: draft.message,
    createdAt: draft.createdAt ?? now,
    unread: draft.unread ?? true,
    priority: draft.priority,
    dedupeKey,
    petId: draft.petId,
    petName: draft.petName,
    href: draft.href,
    sourceRecordId: draft.sourceRecordId,
    sourceEventId: draft.sourceEventId,
    conversationId: draft.conversationId,
    lostAnnouncementId: draft.lostAnnouncementId,
    lostReportId: draft.lostReportId,
    time: draft.time,
  }

  return sortNotificationsNewestFirst([created, ...list])
}

/** Upsert many drafts; later drafts with the same key win for content fields. */
export function upsertNotifications(
  list: AppNotification[],
  drafts: NotificationDraft[],
): AppNotification[] {
  return drafts.reduce((acc, draft) => upsertNotification(acc, draft), list)
}

export function markNotificationRead(list: AppNotification[], id: string): AppNotification[] {
  return list.map((item) => (item.id === id ? { ...item, unread: false } : item))
}

export function markAllNotificationsRead(list: AppNotification[]): AppNotification[] {
  return list.map((item) => ({ ...item, unread: false }))
}

export function removeNotificationsBySourceRecord(
  list: AppNotification[],
  sourceRecordId: string,
): AppNotification[] {
  return list.filter((item) => item.sourceRecordId !== sourceRecordId)
}

export function removeNotificationsByDedupePrefix(
  list: AppNotification[],
  prefix: string,
): AppNotification[] {
  return list.filter((item) => !item.dedupeKey.startsWith(prefix))
}

export function migrateNotificationList(raw: unknown[]): AppNotification[] {
  const migrated: AppNotification[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const normalized = normalizeNotification(item)
    if (!normalized) continue
    if (seen.has(normalized.dedupeKey)) continue
    seen.add(normalized.dedupeKey)
    migrated.push(normalized)
  }
  return sortNotificationsNewestFirst(migrated)
}
