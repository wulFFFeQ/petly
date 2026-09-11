import { assertAmountMinor, DEFAULT_CURRENCY, normalizeCurrency } from './money'
import { createPaymentId, loadPayments, upsertPayment } from './storage'
import type { PaymentProvider } from './provider'
import type { CreatePaymentIntentInput, Payment, PaymentResult } from './types'

const DEMO_MSG =
  'DEMO režim — skutečné platby nejsou napojené. Nic se nestrhává.'

/**
 * Local DEMO provider — never charges, never marks payment as paid/authorized.
 * Explicit isDemoPayment on every created record.
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
    const now = new Date().toISOString()
    const payment: Payment = {
      id: createPaymentId('pay'),
      bookingId: input.bookingId,
      ownerAccountId: input.ownerAccountId,
      professionalId: input.professionalId,
      amountMinor: input.amountMinor,
      currency: normalizeCurrency(input.currency ?? input.currencySnapshot ?? DEFAULT_CURRENCY),
      paymentType: input.paymentType,
      status: 'pending',
      purpose: 'BOOKING_PAYMENT',
      provider: 'demo',
      isDemoPayment: true,
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
}

/** Explicit guard used by tests — Demo never produces paid status. */
export function demoProviderNeverCharges(result: PaymentResult<Payment>): boolean {
  if (!result.ok) return result.error === 'demo_only' || result.error === 'not_found'
  return result.value.status !== 'paid' && result.value.status !== 'authorized'
}
