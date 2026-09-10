import type { AppNotification } from '../../types'
import { migrateNotificationList } from './upsert'

export const NOTIFICATIONS_STORAGE_KEY = 'lovedandknown.notifications'

export function loadNotifications(): AppNotification[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return migrateNotificationList(parsed)
  } catch {
    return []
  }
}

export function saveNotifications(items: AppNotification[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // best-effort
  }
}
