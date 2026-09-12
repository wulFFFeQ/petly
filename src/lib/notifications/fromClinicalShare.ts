import type { NotificationDraft } from './model'

export type ClinicalShareReceivedContext = {
  messageId: string
  conversationId: string
  recipientAccountId: string
  bookingId?: string
  professionalId?: string
  /** When true, deep-link into professional messages workspace. */
  recipientIsProfessional?: boolean
}

const FORBIDDEN = [
  /microchip/i,
  /ownerContacts?/i,
  /medication/i,
  /vaccination/i,
  /healthRecord/i,
  /documentContent/i,
  /storageKey/i,
  /password/i,
]

export function clinicalShareDedupeKey(messageId: string): string {
  return `clinical_share:${messageId}`
}

export function isSafeClinicalShareNotificationPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN.some((re) => re.test(text))
}

/**
 * Privacy-safe clinical share notification.
 * Never includes clinical titles, bodies, storage keys, or raw URLs.
 */
export function buildClinicalShareReceivedNotification(
  ctx: ClinicalShareReceivedContext,
): NotificationDraft | null {
  if (!ctx.recipientAccountId || !ctx.messageId || !ctx.conversationId) return null

  const href = ctx.recipientIsProfessional
    ? `/professional/messages?conversationId=${encodeURIComponent(ctx.conversationId)}`
    : `/messages?conversationId=${encodeURIComponent(ctx.conversationId)}`

  const draft: NotificationDraft = {
    type: 'clinical_share_received',
    title: 'Klinický záznam',
    message: 'Byl vám sdílen klinický záznam',
    priority: 'important',
    dedupeKey: clinicalShareDedupeKey(ctx.messageId),
    sourceEventId: clinicalShareDedupeKey(ctx.messageId),
    href,
    conversationId: ctx.conversationId,
    recipientAccountId: ctx.recipientAccountId,
  }
  if (ctx.professionalId) draft.relatedProfessionalId = ctx.professionalId
  if (ctx.bookingId) draft.relatedBookingId = ctx.bookingId

  if (!isSafeClinicalShareNotificationPayload(draft)) return null
  return draft
}

export function emitClinicalShareReceivedNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: ClinicalShareReceivedContext,
): NotificationDraft | null {
  const draft = buildClinicalShareReceivedNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}
