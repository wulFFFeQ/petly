import type { NotificationDraft } from './model'

export type PaymentNotificationEvent =
  | 'payment_required'
  | 'payment_received'
  | 'payment_failed'
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
}

const FORBIDDEN = [
  /providerPaymentId/i,
  /cardNumber/i,
  /cvv/i,
  /cvc/i,
  /iban/i,
  /paymentMethod/i,
  /clientSecret/i,
  /microchip/i,
  /ownerContacts?/i,
]

export function paymentDedupeKey(event: PaymentNotificationEvent, paymentId: string): string {
  return `payment:${event}:${paymentId}`
}

export function isSafePaymentNotificationPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN.some((re) => re.test(text))
}

const COPY: Record<
  PaymentNotificationEvent,
  { title: string; message: (amount?: string) => string }
> = {
  payment_required: {
    title: 'Platba k rezervaci',
    message: (amount) =>
      amount
        ? `Je připravena platba ${amount}. Online úhrada bude dostupná později.`
        : 'Je připravena platba k rezervaci. Online úhrada bude dostupná později.',
  },
  payment_received: {
    title: 'Platba přijata',
    message: (amount) =>
      amount ? `Platba ${amount} byla přijata.` : 'Platba k rezervaci byla přijata.',
  },
  payment_failed: {
    title: 'Platba selhala',
    message: () => 'Platba k rezervaci se nezdařila.',
  },
  payment_refunded: {
    title: 'Refundace',
    message: (amount) =>
      amount ? `Refundace ${amount} byla zaznamenána.` : 'Refundace k rezervaci byla zaznamenána.',
  },
}

/**
 * Build payment notification drafts.
 * Callers must NOT emit payment_received in DEMO without a real provider.
 */
export function buildPaymentNotification(
  ctx: PaymentNotificationContext,
): NotificationDraft | null {
  if (!ctx.recipientAccountId || !ctx.paymentId || !ctx.bookingId) return null

  const copy = COPY[ctx.event]
  const href = ctx.recipientIsProfessional
    ? `/professional/bookings/${encodeURIComponent(ctx.bookingId)}`
    : `/bookings/${encodeURIComponent(ctx.bookingId)}`

  const draft: NotificationDraft = {
    type: ctx.event,
    title: copy.title,
    message: copy.message(ctx.amountLabel),
    priority: ctx.event === 'payment_failed' ? 'important' : 'normal',
    dedupeKey: paymentDedupeKey(ctx.event, ctx.paymentId),
    sourceEventId: paymentDedupeKey(ctx.event, ctx.paymentId),
    href,
    recipientAccountId: ctx.recipientAccountId,
    relatedBookingId: ctx.bookingId,
  }
  if (ctx.professionalId) draft.relatedProfessionalId = ctx.professionalId

  if (!isSafePaymentNotificationPayload(draft)) return null
  return draft
}

/**
 * Emit helper — prefer not calling with payment_received while provider is DEMO.
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
