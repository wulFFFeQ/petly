import type {
  CheckoutSessionResult,
  LoginLinkResult,
  OnboardingLinkResult,
  ProfessionalPaymentAccount,
} from './connectTypes'
import type { CreatePaymentIntentInput, Payment, PaymentResult } from './types'
import type { VerifiedWebhookPayload } from './webhook'

/**
 * Payment provider abstraction for booking payments + Stripe Connect.
 * Separate from SubscriptionProvider (membership / SaaS billing).
 *
 * Future: StripeConnectPaymentProvider implements the same interface — UI unchanged.
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

  /** Connect — professional connected account lifecycle. */
  createConnectedAccount(
    professionalId: string,
  ): Promise<PaymentResult<ProfessionalPaymentAccount>>
  createOnboardingLink(
    accountId: string,
  ): Promise<PaymentResult<OnboardingLinkResult>>
  getAccountStatus(
    accountId: string,
  ): Promise<PaymentResult<ProfessionalPaymentAccount>>
  createLoginLink(accountId: string): Promise<PaymentResult<LoginLinkResult>>

  /** Owner checkout — DEMO returns preparing state, never a fake Stripe URL. */
  createCheckoutSession(
    paymentId: string,
  ): Promise<PaymentResult<CheckoutSessionResult>>

  /** Webhook signature verification — never trust payload alone. */
  verifyWebhookSignature(
    payload: string | unknown,
    signatureHeader: string | null | undefined,
    secretRef: string,
  ): Promise<PaymentResult<VerifiedWebhookPayload>>
}

/**
 * Reserved stub type for future Stripe Connect wiring.
 * Prefer StripeConnectPaymentProvider class in stripeConnectProvider.ts.
 */
export type StripePaymentProvider = PaymentProvider
