import { createLocalConnectedAccountRecord, getProfessionalPaymentAccount } from './connectAccounts'
import type {
  CheckoutSessionResult,
  LoginLinkResult,
  OnboardingLinkResult,
  ProfessionalPaymentAccount,
} from './connectTypes'
import { assertAmountMinor, DEFAULT_CURRENCY, normalizeCurrency } from './money'
import { calculatePaymentRouting } from './routing'
import { createPaymentId, loadPayments, upsertPayment } from './storage'
import type { PaymentProvider } from './provider'
import type { CreatePaymentIntentInput, Payment, PaymentResult } from './types'
import {
  createDemoWebhookEvent,
  type VerifiedWebhookPayload,
} from './webhook'

const DEMO_MSG =
  'DEMO režim — skutečné platby nejsou napojené. Nic se nestrhává.'

const DEMO_CONNECT_MSG =
  'Stripe propojení bude dostupné v ostré verzi.'

/**
 * Local DEMO provider — never charges, never marks payment as paid/authorized.
 * Connect / checkout return preparing state — never fake Stripe URLs or "connected".
 */
export class DemoPaymentProvider implements PaymentProvider {
  async createPayment(input: CreatePaymentIntentInput): Promise<PaymentResult<Payment>> {
    if (!input.bookingId || !input.ownerAccountId || !input.professionalId) {
      return { ok: false, error: 'invalid_input', message: 'Chybí vazba na rezervaci.' }
    }
    if (!assertAmountMinor(input.amountMinor)) {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'amountMinor musí být nezáporné celé číslo.',
      }
    }
    const currency = normalizeCurrency(input.currency ?? input.currencySnapshot ?? DEFAULT_CURRENCY)
    const routing =
      input.platformFeeMinor !== undefined && input.professionalAmountMinor !== undefined
        ? {
            amountMinor: input.amountMinor,
            platformFeeMinor: input.platformFeeMinor,
            professionalAmountMinor: input.professionalAmountMinor,
            chargePattern: input.chargePattern ?? calculatePaymentRouting(input.amountMinor).chargePattern,
            currency,
          }
        : calculatePaymentRouting(input.amountMinor, { currency })

    const now = new Date().toISOString()
    const payment: Payment = {
      id: createPaymentId('pay'),
      bookingId: input.bookingId,
      ownerAccountId: input.ownerAccountId,
      professionalId: input.professionalId,
      amountMinor: routing.amountMinor,
      currency: routing.currency,
      paymentType: input.paymentType,
      status: 'pending',
      purpose: 'BOOKING_PAYMENT',
      provider: 'demo',
      isDemoPayment: true,
      platformFeeMinor: routing.platformFeeMinor,
      professionalAmountMinor: routing.professionalAmountMinor,
      chargePattern: routing.chargePattern,
      createdAt: now,
      updatedAt: now,
    }
    if (input.serviceNameSnapshot) payment.serviceNameSnapshot = input.serviceNameSnapshot
    if (input.priceSnapshotMajor !== undefined && input.priceSnapshotMajor >= 0) {
      payment.priceSnapshotMajor = input.priceSnapshotMajor
    }
    if (input.currencySnapshot) {
      payment.currencySnapshot = normalizeCurrency(input.currencySnapshot)
    }
    return { ok: true, value: upsertPayment(payment) }
  }

  async authorizePayment(_paymentId: string): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'demo_only', message: DEMO_MSG }
  }

  async capturePayment(_paymentId: string): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'demo_only', message: DEMO_MSG }
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult<Payment>> {
    const found = loadPayments().find((p) => p.id === paymentId)
    if (!found) {
      return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
    }
    if (found.status !== 'pending') {
      return {
        ok: false,
        error: 'invalid_input',
        message: 'Lze zrušit pouze pending DEMO platbu.',
      }
    }
    const next: Payment = {
      ...found,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      isDemoPayment: true,
      provider: 'demo',
    }
    return { ok: true, value: upsertPayment(next) }
  }

  async refundPayment(
    _paymentId: string,
    _amountMinor?: number,
  ): Promise<PaymentResult<Payment>> {
    return { ok: false, error: 'demo_only', message: DEMO_MSG }
  }

  async createConnectedAccount(
    professionalId: string,
  ): Promise<PaymentResult<ProfessionalPaymentAccount>> {
    const result = createLocalConnectedAccountRecord(professionalId, { provider: 'demo' })
    if (!result.ok) return result
    // Explicit: DEMO account is never active / charges enabled.
    if (
      result.value.chargesEnabled ||
      result.value.payoutsEnabled ||
      result.value.status === 'active'
    ) {
      return {
        ok: false,
        error: 'demo_only',
        message: DEMO_CONNECT_MSG,
      }
    }
    return result
  }

  async createOnboardingLink(
    accountId: string,
  ): Promise<PaymentResult<OnboardingLinkResult>> {
    const account = getProfessionalPaymentAccount(accountId)
    if (!account) {
      return { ok: false, error: 'not_found', message: 'Platební účet nenalezen.' }
    }
    return {
      ok: true,
      value: {
        mode: 'demo_preparing',
        message: DEMO_CONNECT_MSG,
      },
    }
  }

  async getAccountStatus(
    accountId: string,
  ): Promise<PaymentResult<ProfessionalPaymentAccount>> {
    const account = getProfessionalPaymentAccount(accountId)
    if (!account) {
      return { ok: false, error: 'not_found', message: 'Platební účet nenalezen.' }
    }
    return { ok: true, value: account }
  }

  async createLoginLink(accountId: string): Promise<PaymentResult<LoginLinkResult>> {
    const account = getProfessionalPaymentAccount(accountId)
    if (!account) {
      return { ok: false, error: 'not_found', message: 'Platební účet nenalezen.' }
    }
    return {
      ok: true,
      value: {
        mode: 'demo_preparing',
        message: DEMO_CONNECT_MSG,
      },
    }
  }

  async createCheckoutSession(
    paymentId: string,
  ): Promise<PaymentResult<CheckoutSessionResult>> {
    const found = loadPayments().find((p) => p.id === paymentId)
    if (!found) {
      return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
    }
    // DEMO: preparing only — no URL, no provider session id, payment stays pending.
    return {
      ok: true,
      value: {
        provider: 'demo',
        paymentId,
        status: 'demo_preparing',
        mode: 'demo_preparing',
        isDemo: true,
        message: 'Online platby budou dostupné později.',
      },
    }
  }

  async verifyWebhookSignature(
    payload: string | unknown,
    signatureHeader: string | null | undefined,
    secretRef: string,
  ): Promise<PaymentResult<VerifiedWebhookPayload>> {
    // DEMO accepts only clearly labelled demo verification — never production secrets.
    if (secretRef === 'STRIPE_WEBHOOK_SECRET' || secretRef.startsWith('whsec_')) {
      return {
        ok: false,
        error: 'demo_only',
        message: 'DEMO nepoužívá produkční webhook secret.',
      }
    }
    if (secretRef !== 'demo' && secretRef !== 'DEMO_WEBHOOK_SECRET') {
      return {
        ok: false,
        error: 'forbidden',
        message: 'Neplatná DEMO webhook reference.',
      }
    }
    // Signature header optional for DEMO but recommended present as demo_sig_*
    void signatureHeader

    let eventBody: unknown = payload
    if (typeof payload === 'string') {
      try {
        eventBody = JSON.parse(payload)
      } catch {
        return { ok: false, error: 'invalid_input', message: 'Neplatný DEMO webhook payload.' }
      }
    }

    const record =
      eventBody && typeof eventBody === 'object'
        ? (eventBody as Record<string, unknown>)
        : null
    const type =
      (typeof record?.type === 'string' && record.type) || 'payment_intent.succeeded'
    const providerEventId =
      (typeof record?.providerEventId === 'string' && record.providerEventId) ||
      (typeof record?.id === 'string' && record.id) ||
      undefined

    const event = createDemoWebhookEvent({
      type: type as VerifiedWebhookPayload['event']['type'],
      providerEventId,
      paymentId: typeof record?.paymentId === 'string' ? record.paymentId : undefined,
      occurredAt:
        typeof record?.occurredAt === 'string' ? record.occurredAt : undefined,
    })

    return {
      ok: true,
      value: {
        verified: true,
        isDemo: true,
        providerEventId: event.providerEventId,
        type: event.type,
        event,
      },
    }
  }
}

/** Explicit guard used by tests — Demo never produces paid status. */
export function demoProviderNeverCharges(result: PaymentResult<Payment>): boolean {
  if (!result.ok) return result.error === 'demo_only' || result.error === 'not_found'
  return result.value.status !== 'paid' && result.value.status !== 'authorized'
}
