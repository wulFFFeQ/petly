/**
 * Stripe provider event → internal payment/checkout event mapping.
 * Never treat Stripe objects as the internal Payment model.
 */

import type { CheckoutSessionStatus } from './connectTypes'
import type { PaymentStatus } from './types'

/** Supported Stripe-shaped event types for booking payments + Connect. */
export type StripeProviderEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'charge.refunded'
  | 'account.updated'

export const STRIPE_PROVIDER_EVENT_TYPES: StripeProviderEventType[] = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'checkout.session.completed',
  'checkout.session.expired',
  'charge.refunded',
  'account.updated',
]

/** Provider-agnostic internal event kinds. */
export type InternalPaymentEventType =
  | 'checkout.completed'
  | 'checkout.expired'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refunded'
  | 'account.updated'
  | 'unknown'

export type StripeEventMappingResult = {
  stripeEventType: StripeProviderEventType | string
  internalEventType: InternalPaymentEventType
  /** Suggested PaymentStatus when applicable (null = no payment status change). */
  paymentStatus: PaymentStatus | null
  /** Suggested checkout status when applicable. */
  checkoutStatus: CheckoutSessionStatus | null
}

export function mapStripeEventToInternal(
  type: string,
): StripeEventMappingResult {
  switch (type) {
    case 'checkout.session.completed':
      return {
        stripeEventType: type,
        internalEventType: 'checkout.completed',
        paymentStatus: null,
        checkoutStatus: 'completed',
      }
    case 'checkout.session.expired':
      return {
        stripeEventType: type,
        internalEventType: 'checkout.expired',
        paymentStatus: null,
        checkoutStatus: 'expired',
      }
    case 'payment_intent.succeeded':
      return {
        stripeEventType: type,
        internalEventType: 'payment.succeeded',
        paymentStatus: 'paid',
        checkoutStatus: null,
      }
    case 'payment_intent.payment_failed':
      return {
        stripeEventType: type,
        internalEventType: 'payment.failed',
        paymentStatus: 'failed',
        checkoutStatus: null,
      }
    case 'payment_intent.canceled':
      return {
        stripeEventType: type,
        internalEventType: 'payment.cancelled',
        paymentStatus: 'cancelled',
        checkoutStatus: null,
      }
    case 'charge.refunded':
      return {
        stripeEventType: type,
        internalEventType: 'payment.refunded',
        paymentStatus: 'refunded',
        checkoutStatus: null,
      }
    case 'account.updated':
      return {
        stripeEventType: type,
        internalEventType: 'account.updated',
        paymentStatus: null,
        checkoutStatus: null,
      }
    default:
      return {
        stripeEventType: type,
        internalEventType: 'unknown',
        paymentStatus: null,
        checkoutStatus: null,
      }
  }
}

/** Legacy helper used by webhook.ts — maps to PaymentStatus hint. */
export function mapStripeEventToPaymentStatus(
  type: string,
): PaymentStatus | null {
  return mapStripeEventToInternal(type).paymentStatus
}

/** Map Stripe type → legacy PaymentWebhookEventType-compatible internal label. */
export function mapStripeEventToInternalType(type: StripeProviderEventType): string {
  const mapped = mapStripeEventToInternal(type)
  switch (mapped.internalEventType) {
    case 'payment.succeeded':
      return 'payment.paid'
    case 'payment.failed':
      return 'payment.failed'
    case 'payment.cancelled':
      return 'payment.cancelled'
    case 'payment.refunded':
      return 'payment.refunded'
    case 'checkout.completed':
      return 'checkout.completed'
    case 'checkout.expired':
      return 'checkout.expired'
    case 'account.updated':
      return 'account.updated'
    default:
      return type
  }
}
