/**
 * Stripe Connect provider stub — extension point only.
 * No Stripe SDK, no API keys, no real network calls.
 */

import { getProfessionalPaymentAccount } from './connectAccounts'
import type {
  CheckoutSessionResult,
  LoginLinkResult,
  OnboardingLinkResult,
  ProfessionalPaymentAccount,
} from './connectTypes'
import type { PaymentProvider } from './provider'
import type { CreatePaymentIntentInput, Payment, PaymentResult } from './types'
import type { VerifiedWebhookPayload } from './webhook'

const NI =
  'Stripe Connect není napojen — použijte DemoPaymentProvider nebo dokončete produkční wiring.'

/**
 * TODO: wire stripe Node SDK server-side only.
 * - accounts.create / accountLinks.create / loginLinks
 * - checkout.sessions.create with transfer_data / application_fee_amount
 * - webhooks.constructEvent for signature verification
 */
export class StripeConnectPaymentProvider implements PaymentProvider {
  async createPayment(_input: CreatePaymentIntentInput): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async authorizePayment(_paymentId: string): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async capturePayment(_paymentId: string): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async cancelPayment(_paymentId: string): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async refundPayment(
    _paymentId: string,
    _amountMinor?: number,
  ): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async createConnectedAccount(
    professionalId: string,
  ): Promise<PaymentResult<ProfessionalPaymentAccount>> {
    void professionalId
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async createOnboardingLink(
    _accountId: string,
  ): Promise<PaymentResult<OnboardingLinkResult>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async getAccountStatus(
    accountId: string,
  ): Promise<PaymentResult<ProfessionalPaymentAccount>> {
    const local = getProfessionalPaymentAccount(accountId)
    if (local) return { ok: true, value: local }
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async createLoginLink(_accountId: string): Promise<PaymentResult<LoginLinkResult>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async createCheckoutSession(
    _paymentId: string,
  ): Promise<PaymentResult<CheckoutSessionResult>> {
    return { ok: false, error: 'not_implemented', message: NI }
  }

  async verifyWebhookSignature(
    _payload: string | unknown,
    _signatureHeader: string | null | undefined,
    _secretRef: string,
  ): Promise<PaymentResult<VerifiedWebhookPayload>> {
    return {
      ok: false,
      error: 'not_implemented',
      message: 'Stripe webhook signature verification requires server-side secret.',
    }
  }
}

/** Test helper — does not activate Stripe. */
export function createStripeConnectStub(): StripeConnectPaymentProvider {
  return new StripeConnectPaymentProvider()
}
