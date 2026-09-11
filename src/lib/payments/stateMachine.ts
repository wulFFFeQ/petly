/**
 * Payment status transition layer.
 * Keeps existing PaymentStatus names; blocks illegal jumps (e.g. UI unpaid → paid).
 *
 * Conceptual mapping (docs only):
 * - unpaid / pending checkout → `pending`
 * - processing / authorized → `authorized`
 * - succeeded → `paid`
 */

import { upsertPayment, loadPayments } from './storage'
import type { Payment, PaymentResult, PaymentStatus } from './types'

/** Whitelist of legitimate transitions. Same status is always allowed (no-op). */
const ALLOWED: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  pending: new Set(['pending', 'authorized', 'paid', 'failed', 'cancelled']),
  authorized: new Set(['authorized', 'paid', 'cancelled', 'failed']),
  paid: new Set(['paid', 'partially_refunded', 'refunded']),
  failed: new Set(['failed']),
  cancelled: new Set(['cancelled']),
  refunded: new Set(['refunded']),
  partially_refunded: new Set(['partially_refunded', 'refunded']),
}

export function canTransitionPaymentStatus(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) return true
  return ALLOWED[from]?.has(to) ?? false
}

export type TransitionPaymentMeta = {
  /** When true, DEMO paid/authorized elevation remains blocked. */
  source?: 'ui' | 'provider_event' | 'system' | 'test'
  providerEventId?: string
}

/**
 * Apply a validated status transition.
 * DEMO payments still cannot become paid/authorized through this path.
 */
export function transitionPaymentStatus(
  paymentId: string,
  to: PaymentStatus,
  _meta?: TransitionPaymentMeta,
): PaymentResult<Payment> {
  void _meta
  const payment = loadPayments().find((p) => p.id === paymentId) ?? null
  if (!payment) {
    return { ok: false, error: 'not_found', message: 'Platba nenalezena.' }
  }
  if (!canTransitionPaymentStatus(payment.status, to)) {
    return {
      ok: false,
      error: 'invalid_input',
      message: `Nepovolený přechod stavu platby: ${payment.status} → ${to}.`,
    }
  }
  if (payment.status === to) {
    return { ok: true, value: payment }
  }
  if (payment.isDemoPayment && (to === 'paid' || to === 'authorized')) {
    return {
      ok: false,
      error: 'demo_only',
      message: 'DEMO platba nemůže být označena jako zaplacená.',
    }
  }
  const next: Payment = {
    ...payment,
    status: to,
    updatedAt: new Date().toISOString(),
  }
  return { ok: true, value: upsertPayment(next) }
}

/** Statuses from which a refund may be initiated (customer charge side). */
export function isPaymentEligibleForRefund(status: PaymentStatus): boolean {
  return status === 'paid' || status === 'partially_refunded' || status === 'authorized'
}
