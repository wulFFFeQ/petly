/**
 * Future webhook API contract — no HTTP endpoint, no Stripe simulation.
 */

import type { Payment, PaymentStatus } from './types'

export type PaymentWebhookEventType =
  | 'payment.authorized'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.refunded'

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType
  paymentId: string
  providerPaymentId?: string
  status?: PaymentStatus
  amountMinor?: number
  currency?: string
  occurredAt: string
  /** Opaque provider payload — never expose publicly. */
  raw?: unknown
}

/**
 * Handler signature for a future payment webhook router.
 * DEMO must not invent Stripe-like events as real.
 */
export type PaymentWebhookHandler = (
  event: PaymentWebhookEvent,
) => Promise<{ ok: true; payment?: Payment } | { ok: false; error: string }>

/** Placeholder — not wired. Reserved for StripePaymentProvider. */
export async function handlePaymentWebhook(
  _event: PaymentWebhookEvent,
): Promise<{ ok: false; error: string }> {
  return {
    ok: false,
    error: 'paymentWebhook is not active — no external payment provider connected.',
  }
}
