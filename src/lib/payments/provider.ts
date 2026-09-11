import type { CreatePaymentIntentInput, Payment, PaymentResult } from './types'

/**
 * Payment provider abstraction for booking payments.
 * Separate from SubscriptionProvider (membership / SaaS billing).
 *
 * Future: StripePaymentProvider implements the same interface — UI unchanged.
 * Stripe is NOT connected in this step.
 */
export interface PaymentProvider {
  createPayment(input: CreatePaymentIntentInput): Promise<PaymentResult<Payment>>
  authorizePayment(paymentId: string): Promise<PaymentResult<Payment>>
  capturePayment(paymentId: string): Promise<PaymentResult<Payment>>
  cancelPayment(paymentId: string): Promise<PaymentResult<Payment>>
  refundPayment(
    paymentId: string,
    amountMinor?: number,
  ): Promise<PaymentResult<Payment>>
}

/**
 * Reserved stub type for future Stripe wiring.
 * Do not instantiate — no Stripe SDK, keys, or checkout.
 */
export type StripePaymentProvider = PaymentProvider
