import type { NotificationDraft } from '../notifications/model'
import { loadNotificationPrefs } from '../notificationPrefs'

/** Emit a community notification only when the user enabled the community pref. */
export function shouldEmitCommunityNotification(): boolean {
  try {
    return loadNotificationPrefs().community === true
  } catch {
    return false
  }
}

export function withCommunityPrefGate(
  draft: NotificationDraft,
  emit: (draft: NotificationDraft) => void,
): boolean {
  if (!shouldEmitCommunityNotification()) return false
  emit(draft)
  return true
}
