import type { NotificationDraft } from './model'

export type MessageReceivedContext = {
  messageId: string
  conversationId: string
  recipientAccountId: string
  senderDisplayName: string
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
  /password/i,
]

export function messageDedupeKey(messageId: string): string {
  return `message:${messageId}`
}

export function isSafeMessageNotificationPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN.some((re) => re.test(text))
}

function safeName(value: string | null | undefined): string {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!trimmed || FORBIDDEN.some((re) => re.test(trimmed))) return 'uživatel'
  return trimmed
}

/**
 * Privacy-safe "new message" notification.
 * Never includes message body text.
 */
export function buildMessageReceivedNotification(
  ctx: MessageReceivedContext,
): NotificationDraft | null {
  if (!ctx.recipientAccountId || !ctx.messageId || !ctx.conversationId) return null

  const who = safeName(ctx.senderDisplayName)
  const href = ctx.recipientIsProfessional
    ? `/professional/messages?conversationId=${encodeURIComponent(ctx.conversationId)}`
    : `/messages?conversationId=${encodeURIComponent(ctx.conversationId)}`

  const draft: NotificationDraft = {
    type: 'message',
    title: `Nová zpráva od ${who}`,
    message: 'Máte novou zprávu v aplikaci.',
    priority: 'normal',
    dedupeKey: messageDedupeKey(ctx.messageId),
    sourceEventId: messageDedupeKey(ctx.messageId),
    href,
    conversationId: ctx.conversationId,
    recipientAccountId: ctx.recipientAccountId,
  }
  if (ctx.professionalId) draft.relatedProfessionalId = ctx.professionalId
  if (ctx.bookingId) draft.relatedBookingId = ctx.bookingId

  if (!isSafeMessageNotificationPayload(draft)) return null
  return draft
}

export function emitMessageReceivedNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: MessageReceivedContext,
): NotificationDraft | null {
  const draft = buildMessageReceivedNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}
