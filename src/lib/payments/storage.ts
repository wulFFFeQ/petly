import {
  assertAmountMinor,
  DEFAULT_CURRENCY,
  normalizeCurrency,
} from './money'
import {
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  type Payment,
  type PaymentProviderId,
  type PaymentPurpose,
  type PaymentStatus,
  type PaymentType,
} from './types'

export const PAYMENTS_STORAGE_KEY = 'lovedandknown.payments'

const TYPE_SET = new Set<string>(PAYMENT_TYPES)
const STATUS_SET = new Set<string>(PAYMENT_STATUSES)
const PURPOSE_SET = new Set<string>(['BOOKING_PAYMENT', 'MEMBERSHIP_PAYMENT'])
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

export function createPaymentId(prefix = 'pay'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function normalizePayment(raw: unknown): Payment | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const bookingId = asString(raw.bookingId)
  const ownerAccountId = asString(raw.ownerAccountId)
  const professionalId = asString(raw.professionalId)
  const amountMinor = asNumber(raw.amountMinor)
  const paymentType = asString(raw.paymentType)
  const status = asString(raw.status)
  if (
    !id ||
    !bookingId ||
    !ownerAccountId ||
    !professionalId ||
    amountMinor === undefined ||
    !assertAmountMinor(amountMinor) ||
    !paymentType ||
    !TYPE_SET.has(paymentType) ||
    !status ||
    !STATUS_SET.has(status)
  ) {
    return null
  }

  const createdAt = asString(raw.createdAt) ?? new Date(0).toISOString()
  const updatedAt = asString(raw.updatedAt) ?? createdAt

  let purpose: PaymentPurpose = 'BOOKING_PAYMENT'
  const rawPurpose = asString(raw.purpose)
  if (rawPurpose && PURPOSE_SET.has(rawPurpose)) {
    purpose = rawPurpose as PaymentPurpose
  }

  const payment: Payment = {
    id,
    bookingId,
    ownerAccountId,
    professionalId,
    amountMinor: Math.trunc(amountMinor),
    currency: normalizeCurrency(asString(raw.currency) ?? DEFAULT_CURRENCY),
    paymentType: paymentType as PaymentType,
    status: status as PaymentStatus,
    purpose,
    isDemoPayment: asBool(raw.isDemoPayment, false),
    createdAt,
    updatedAt,
  }

  const provider = asString(raw.provider)
  if (provider && PROVIDER_SET.has(provider)) {
    payment.provider = provider as PaymentProviderId
  }
  if (asString(raw.providerPaymentId)) {
    payment.providerPaymentId = asString(raw.providerPaymentId)
  }
  if (asString(raw.serviceNameSnapshot)) {
    payment.serviceNameSnapshot = asString(raw.serviceNameSnapshot)
  }
  const priceMajor = asNumber(raw.priceSnapshotMajor)
  if (priceMajor !== undefined && priceMajor >= 0) {
    payment.priceSnapshotMajor = priceMajor
  }
  if (asString(raw.currencySnapshot)) {
    payment.currencySnapshot = normalizeCurrency(asString(raw.currencySnapshot))
  }
  if (asString(raw.refundOfPaymentId)) {
    payment.refundOfPaymentId = asString(raw.refundOfPaymentId)
  }

  return payment
}

function loadArray(): Payment[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizePayment).filter((p): p is Payment => Boolean(p))
  } catch {
    return []
  }
}

export function loadPayments(): Payment[] {
  return loadArray()
}

export function savePayments(payments: Payment[]): void {
  if (typeof localStorage === 'undefined') return
  const cleaned = payments
    .map((p) => normalizePayment(p))
    .filter((p): p is Payment => Boolean(p))
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(cleaned))
}

export function upsertPayment(payment: Payment): Payment {
  const all = loadPayments()
  const normalized = normalizePayment(payment)
  if (!normalized) {
    throw new Error('Invalid payment record')
  }
  const idx = all.findIndex((p) => p.id === normalized.id)
  if (idx >= 0) {
    all[idx] = normalized
  } else {
    all.push(normalized)
  }
  savePayments(all)
  return normalized
}
