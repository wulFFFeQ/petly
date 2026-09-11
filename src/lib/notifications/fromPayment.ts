import type { NotificationType } from '../../types'
import type { NotificationDraft } from './model'

export type PaymentNotificationEvent =
  | 'payment_required'
  | 'payment_checkout_created'
  | 'payment_received'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'payment_refunded'

export type PaymentNotificationContext = {
  event: PaymentNotificationEvent
  paymentId: string
  bookingId: string
  recipientAccountId: string
  amountLabel?: string
  /** When true, deep-link into professional booking detail. */
  recipientIsProfessional?: boolean
  professionalId?: string
  /** Provider event id for webhook-driven dedupe. */
  providerEventId?: string
  serviceName?: string
  professionalDisplayName?: string
}

const FORBIDDEN = [
  /providerPaymentId/i,
  /providerAccountId/i,
  /providerCustomerId/i,
  /cardNumber/i,
  /cvv/i,
  /cvc/i,
  /iban/i,
  /paymentMethod/i,
  /clientSecret/i,
  /webhookSecret/i,
  /microchip/i,
  /ownerContacts?/i,
]

/**
 * Dedupe: payment:{paymentId}:{eventType}:{providerEventId?}
 */
export function paymentDedupeKey(
  event: PaymentNotificationEvent,
  paymentId: string,
  providerEventId?: string,
): string {
  if (providerEventId) {
    return `payment:${paymentId}:${event}:${providerEventId}`
  }
  return `payment:${paymentId}:${event}`
}

export function isSafePaymentNotificationPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN.some((re) => re.test(text))
}

const COPY: Record<
  PaymentNotificationEvent,
  { title: string; message: (ctx: PaymentNotificationContext) => string }
> = {
  payment_required: {
    title: 'Platba k rezervaci',
    message: (ctx) =>
      ctx.amountLabel
        ? `Je připravena platba ${ctx.amountLabel}. Online úhrada bude dostupná později.`
        : 'Je připravena platba k rezervaci. Online úhrada bude dostupná později.',
  },
  payment_checkout_created: {
    title: 'Checkout připraven',
    message: (ctx) =>
      ctx.amountLabel
        ? `Platební session pro ${ctx.amountLabel} byla připravena.`
        : 'Platební session byla připravena.',
  },
  payment_received: {
    title: 'Platba přijata',
    message: (ctx) =>
      ctx.amountLabel ? `Platba ${ctx.amountLabel} byla přijata.` : 'Platba k rezervaci byla přijata.',
  },
  payment_succeeded: {
    title: 'Platba potvrzena',
    message: (ctx) =>
      ctx.amountLabel
        ? `Platba ${ctx.amountLabel} byla potvrzena.`
        : 'Platba k rezervaci byla potvrzena.',
  },
  payment_failed: {
    title: 'Platba selhala',
    message: () => 'Platba k rezervaci se nezdařila.',
  },
  payment_cancelled: {
    title: 'Platba zrušena',
    message: () => 'Platba k rezervaci byla zrušena.',
  },
  payment_refunded: {
    title: 'Refundace',
    message: (ctx) =>
      ctx.amountLabel
        ? `Refundace ${ctx.amountLabel} byla zaznamenána.`
        : 'Refundace k rezervaci byla zaznamenána.',
  },
}

/** Map notification event → AppNotification type (payment_succeeded aliases received for storage). */
function toNotificationType(event: PaymentNotificationEvent): NotificationType {
  if (event === 'payment_succeeded') return 'payment_succeeded'
  if (event === 'payment_checkout_created') return 'payment_checkout_created'
  if (event === 'payment_cancelled') return 'payment_cancelled'
  return event
}

/**
 * Build payment notification drafts.
 * Callers must NOT emit payment_received / payment_succeeded in DEMO without a real provider.
 */
export function buildPaymentNotification(
  ctx: PaymentNotificationContext,
): NotificationDraft | null {
  if (!ctx.recipientAccountId || !ctx.paymentId || !ctx.bookingId) return null

  const copy = COPY[ctx.event]
  const href = ctx.recipientIsProfessional
    ? `/professional/bookings/${encodeURIComponent(ctx.bookingId)}`
    : `/bookings/${encodeURIComponent(ctx.bookingId)}`

  const dedupe = paymentDedupeKey(ctx.event, ctx.paymentId, ctx.providerEventId)

  let message = copy.message(ctx)
  if (ctx.serviceName && !message.includes(ctx.serviceName)) {
    message = `${ctx.serviceName}: ${message}`
  }

  const draft: NotificationDraft = {
    type: toNotificationType(ctx.event),
    title: copy.title,
    message,
    priority: ctx.event === 'payment_failed' ? 'important' : 'normal',
    dedupeKey: dedupe,
    sourceEventId: dedupe,
    href,
    recipientAccountId: ctx.recipientAccountId,
    relatedBookingId: ctx.bookingId,
  }
  if (ctx.professionalId) draft.relatedProfessionalId = ctx.professionalId

  if (!isSafePaymentNotificationPayload(draft)) return null
  return draft
}

/**
 * Emit helper — prefer not calling with payment_received/succeeded while provider is DEMO.
 */
export function emitPaymentNotification(
  upsert: (draft: NotificationDraft) => void,
  ctx: PaymentNotificationContext,
): NotificationDraft | null {
  const draft = buildPaymentNotification(ctx)
  if (!draft) return null
  upsert(draft)
  return draft
}
