/**
 * PaymentPayout — separate from customer Payment.
 * DEMO never creates a real paid payout.
 */

import { assertAmountMinor, DEFAULT_CURRENCY, normalizeCurrency } from './money'
import { PAYOUT_STATUSES, type PaymentPayout, type PayoutStatus } from './connectTypes'
import type { Payment, PaymentProviderId } from './types'

export const PAYOUTS_STORAGE_KEY = 'lovedandknown.payment_payouts'

const STATUS_SET = new Set<string>(PAYOUT_STATUSES)
const PROVIDER_SET = new Set<string>(['demo', 'stripe', 'none'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function createPayoutId(prefix = 'payout'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function normalizePaymentPayout(raw: unknown): PaymentPayout | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const paymentId = asString(raw.paymentId)
  const professionalId = asString(raw.professionalId)
  const amountMinor = asNumber(raw.amountMinor)
  const status = asString(raw.status)
  if (
    !id ||
    !paymentId ||
    !professionalId ||
    amountMinor === undefined ||
    !assertAmountMinor(amountMinor) ||
    !status ||
    !STATUS_SET.has(status)
  ) {
    return null
  }
  const createdAt = asString(raw.createdAt) ?? new Date(0).toISOString()
  const updatedAt = asString(raw.updatedAt) ?? createdAt
  const payout: PaymentPayout = {
    id,
    paymentId,
    professionalId,
    amountMinor: Math.trunc(amountMinor),
    currency: normalizeCurrency(asString(raw.currency) ?? DEFAULT_CURRENCY),
    status: status as PayoutStatus,
    isDemoPayout: asBool(raw.isDemoPayout, true),
    createdAt,
    updatedAt,
  }
  const provider = asString(raw.provider)
  if (provider && PROVIDER_SET.has(provider)) {
    payout.provider = provider as PaymentProviderId
  }
  if (asString(raw.providerPayoutId)) {
    payout.providerPayoutId = asString(raw.providerPayoutId)
  }
  return payout
}

export function loadPayouts(): PaymentPayout[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PAYOUTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizePaymentPayout)
      .filter((p): p is PaymentPayout => Boolean(p))
  } catch {
    return []
  }
}

export function savePayouts(payouts: PaymentPayout[]): void {
  if (typeof localStorage === 'undefined') return
  const cleaned = payouts
    .map((p) => normalizePaymentPayout(p))
    .filter((p): p is PaymentPayout => Boolean(p))
  localStorage.setItem(PAYOUTS_STORAGE_KEY, JSON.stringify(cleaned))
}

export function upsertPayout(payout: PaymentPayout): PaymentPayout {
  const all = loadPayouts()
  const normalized = normalizePaymentPayout(payout)
  if (!normalized) throw new Error('Invalid PaymentPayout')
  const idx = all.findIndex((p) => p.id === normalized.id)
  if (idx >= 0) all[idx] = normalized
  else all.push(normalized)
  savePayouts(all)
  return normalized
}

export function getPayoutForPayment(paymentId: string): PaymentPayout | null {
  return loadPayouts().find((p) => p.paymentId === paymentId) ?? null
}

export function listPayoutsForProfessional(professionalId: string): PaymentPayout[] {
  return loadPayouts().filter((p) => p.professionalId === professionalId)
}

/**
 * Create a DEMO draft payout linked to a payment.
 * Always pending + isDemoPayout — never paid.
 */
export function createDemoPayoutDraft(payment: Payment): PaymentPayout {
  const existing = getPayoutForPayment(payment.id)
  if (existing) return existing
  const amountMinor =
    payment.professionalAmountMinor !== undefined
      ? payment.professionalAmountMinor
      : payment.amountMinor
  const now = new Date().toISOString()
  return upsertPayout({
    id: createPayoutId('payout'),
    paymentId: payment.id,
    professionalId: payment.professionalId,
    amountMinor,
    currency: payment.currency,
    status: 'pending',
    provider: 'demo',
    isDemoPayout: true,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Plan payout after verified payment success.
 * DEMO: always pending draft via createDemoPayoutDraft — never paid.
 */
export function planPayoutAfterPaymentSuccess(payment: Payment): PaymentPayout {
  return createDemoPayoutDraft(payment)
}

/** Payment success ≠ payout success. */
export function isPayoutIndependentOfPayment(
  paymentStatus: Payment['status'],
  payoutStatus: PayoutStatus,
): boolean {
  if (paymentStatus === 'paid' && payoutStatus === 'pending') return true
  if (paymentStatus === 'paid' && payoutStatus === 'in_transit') return true
  return paymentStatus !== payoutStatus
}

export function clearAllPayouts(): void {
  savePayouts([])
}
