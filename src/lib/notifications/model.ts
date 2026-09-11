import type {
  AppNotification,
  NotificationPriority,
  NotificationType,
} from '../../types'

type LegacyKind = NonNullable<AppNotification['kind']>

const LEGACY_KIND_TO_TYPE: Record<LegacyKind, NotificationType> = {
  medication_reminder: 'medication',
  system: 'system',
  community: 'community',
  lost_pet: 'lost_pet',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export const NOTIFICATION_TYPES: NotificationType[] = [
  'medication',
  'vaccination',
  'vet',
  'health',
  'calendar',
  'message',
  'lost_pet',
  'lost_sighting',
  'lost_found',
  'breeding',
  'system',
  'community',
  'professional_access_requested',
  'professional_access_approved',
  'professional_access_rejected',
  'professional_access_revoked',
  'professional_access_expired',
  'household_access_granted',
  'household_access_revoked',
  'household_role_changed',
  'household_access_invited',
  'organization_membership_invited',
  'organization_membership_accepted',
  'organization_membership_role_changed',
  'organization_membership_removed',
  'organization_access_requested',
  'organization_access_granted',
  'organization_access_revoked',
  'booking_requested',
  'booking_confirmed',
  'booking_declined',
  'booking_cancelled',
  'booking_completed',
  'booking_reminder',
  'booking_rescheduled',
  'professional_review_received',
  'professional_review_reply',
  'payment_required',
  'payment_checkout_created',
  'payment_received',
  'payment_succeeded',
  'payment_failed',
  'payment_cancelled',
  'payment_refunded',
]

function resolveType(raw: Record<string, unknown>): NotificationType {
  const type = asString(raw.type)
  if ((NOTIFICATION_TYPES as string[]).includes(type)) return type as NotificationType

  const kind = asString(raw.kind) as LegacyKind
  if (kind && kind in LEGACY_KIND_TO_TYPE) return LEGACY_KIND_TO_TYPE[kind]
  return 'system'
}

function resolvePriority(raw: Record<string, unknown>): NotificationPriority {
  const priority = asString(raw.priority)
  if (priority === 'urgent' || priority === 'important' || priority === 'normal') {
    return priority
  }
  return 'normal'
}

function resolveDedupeKey(raw: Record<string, unknown>, id: string, type: NotificationType): string {
  const existing = asString(raw.dedupeKey)
  if (existing) return existing

  const sourceRecordId = asString(raw.sourceRecordId)
  if (sourceRecordId) {
    if (type === 'medication') return `med:${sourceRecordId}`
    return `record:${sourceRecordId}`
  }

  const lostReportId = asString(raw.lostReportId)
  if (lostReportId) {
    if (type === 'lost_sighting') return `lost:sighting:${lostReportId}`
    if (type === 'lost_found') return `lost:found:${lostReportId}`
    return `lost:report:${lostReportId}`
  }

  const lostAnnouncementId = asString(raw.lostAnnouncementId)
  if (lostAnnouncementId) return `lost:active:${lostAnnouncementId}`

  const conversationId = asString(raw.conversationId)
  if (conversationId && type === 'message') return `msg:${conversationId}:${id}`

  return `legacy:${id}`
}

/** Normalize legacy / partial notification payloads into the unified model. */
export function normalizeNotification(raw: unknown): AppNotification | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  if (!id) return null

  const type = resolveType(raw)
  const title = asString(raw.title, 'Upozornění')
  const legacyTime = asString(raw.time)
  const message = asString(raw.message) || legacyTime || ''
  const createdAt =
    asString(raw.createdAt) ||
    (Number.isFinite(Date.parse(legacyTime)) ? new Date(legacyTime).toISOString() : new Date().toISOString())

  const notification: AppNotification = {
    id,
    type,
    title,
    message,
    createdAt,
    unread: asBoolean(raw.unread, true),
    priority: resolvePriority(raw),
    dedupeKey: resolveDedupeKey(raw, id, type),
  }

  const petId = asString(raw.petId)
  if (petId) notification.petId = petId
  const petName = asString(raw.petName)
  if (petName) notification.petName = petName
  const href = asString(raw.href)
  if (href) notification.href = href
  const sourceRecordId = asString(raw.sourceRecordId)
  if (sourceRecordId) notification.sourceRecordId = sourceRecordId
  const sourceEventId = asString(raw.sourceEventId)
  if (sourceEventId) notification.sourceEventId = sourceEventId
  const conversationId = asString(raw.conversationId)
  if (conversationId) notification.conversationId = conversationId
  const lostAnnouncementId = asString(raw.lostAnnouncementId)
  if (lostAnnouncementId) notification.lostAnnouncementId = lostAnnouncementId
  const lostReportId = asString(raw.lostReportId)
  if (lostReportId) notification.lostReportId = lostReportId
  const recipientAccountId = asString(raw.recipientAccountId)
  if (recipientAccountId) notification.recipientAccountId = recipientAccountId
  const relatedProfessionalId = asString(raw.relatedProfessionalId)
  if (relatedProfessionalId) notification.relatedProfessionalId = relatedProfessionalId
  const relatedAccessId = asString(raw.relatedAccessId)
  if (relatedAccessId) notification.relatedAccessId = relatedAccessId
  const readAt = asString(raw.readAt)
  if (readAt) notification.readAt = readAt
  if (legacyTime) notification.time = legacyTime

  return notification
}

export function sortNotificationsNewestFirst(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => {
    const byDate = b.createdAt.localeCompare(a.createdAt)
    if (byDate !== 0) return byDate
    return b.id.localeCompare(a.id)
  })
}

export function formatNotificationTime(createdAt: string, now = new Date()): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'právě teď'
  if (diffMin < 60) return `před ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `před ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'včera'
  if (diffDays < 7) return `před ${diffDays} dny`

  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`
}

export function notificationHrefFallback(item: AppNotification): string | null {
  if (item.href) return item.href
  if (item.conversationId) return `/messages?conversationId=${item.conversationId}`
  if (item.petId && (item.type === 'lost_pet' || item.type === 'lost_sighting' || item.type === 'lost_found')) {
    return `/pets/${item.petId}?tab=overview#lost-panel`
  }
  if (item.type === 'medication' || item.type === 'calendar' || item.type === 'breeding') {
    return '/calendar'
  }
  if (item.type === 'vaccination' || item.type === 'vet' || item.type === 'health') {
    return item.petId ? `/pets/${item.petId}?tab=health` : '/health'
  }
  if (item.type === 'message') return '/messages'
  if (item.type === 'lost_pet' || item.type === 'lost_sighting' || item.type === 'lost_found') {
    return '/pets'
  }
  if (item.type === 'professional_access_requested' && item.petId) {
    return `/pets/${item.petId}?tab=overview#who-has-access`
  }
  if (
    (item.type === 'household_access_granted' ||
      item.type === 'household_access_revoked' ||
      item.type === 'household_role_changed' ||
      item.type === 'household_access_invited') &&
    item.petId
  ) {
    return `/pets/${item.petId}?tab=overview#who-has-access`
  }
  if (
    item.type === 'organization_membership_invited' ||
    item.type === 'organization_membership_accepted' ||
    item.type === 'organization_membership_role_changed' ||
    item.type === 'organization_membership_removed'
  ) {
    return '/organization-invitations'
  }
  if (
    (item.type === 'organization_access_requested' ||
      item.type === 'organization_access_granted' ||
      item.type === 'organization_access_revoked') &&
    item.petId
  ) {
    return `/pets/${item.petId}?tab=overview#who-has-access`
  }
  if (
    (item.type === 'professional_access_approved' ||
      item.type === 'professional_access_revoked' ||
      item.type === 'professional_access_expired' ||
      item.type === 'professional_access_rejected') &&
    item.relatedProfessionalId
  ) {
    if (item.type === 'professional_access_approved' && item.petId) {
      return `/professionals/${item.relatedProfessionalId}/pets/${item.petId}`
    }
    return `/professionals/${item.relatedProfessionalId}`
  }
  if (
    item.type === 'booking_requested' ||
    item.type === 'booking_confirmed' ||
    item.type === 'booking_declined' ||
    item.type === 'booking_cancelled' ||
    item.type === 'booking_completed' ||
    item.type === 'booking_reminder' ||
    item.type === 'booking_rescheduled'
  ) {
    if (item.href) return item.href
    if (item.relatedBookingId) {
      if (item.type === 'booking_requested') {
        return `/professional/bookings/${item.relatedBookingId}`
      }
      return `/bookings/${item.relatedBookingId}`
    }
    return '/bookings'
  }
  if (
    item.type === 'professional_review_received' ||
    item.type === 'professional_review_reply'
  ) {
    if (item.relatedProfessionalId) {
      return `/professionals/${item.relatedProfessionalId}#reviews`
    }
    return '/professionals'
  }
  return null
}

export type NotificationDraft = Omit<AppNotification, 'id' | 'unread' | 'createdAt'> & {
  id?: string
  unread?: boolean
  createdAt?: string
}
