/**
 * Webhook contract for future Stripe Connect / PaymentIntents.
 * Idempotent via providerEventId; signature must be verified — never trust payload alone.
 */

import type { ProfessionalPaymentAccountStatus } from './connectTypes'
import type { Payment, PaymentStatus } from './types'

/** Stripe-shaped provider event types (mapped into internal handlers). */
export type StripeProviderEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'charge.refunded'
  | 'account.updated'

export type PaymentWebhookEventType =
  | 'payment.authorized'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.cancelled'
  | 'account.updated'
  | StripeProviderEventType

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType
  /** Stable provider event id — required for dedupe (Stripe evt_…). */
  providerEventId: string
  paymentId?: string
  providerPaymentId?: string
  professionalPaymentAccountId?: string
  status?: PaymentStatus
  accountStatus?: ProfessionalPaymentAccountStatus
  amountMinor?: number
  currency?: string
  occurredAt: string
  /** DEMO events must set this — never treat as real Stripe. */
  isDemo?: boolean
  /** Opaque provider payload — never expose publicly. */
  raw?: unknown
}

export interface StoredProviderEvent {
  providerEventId: string
  processedAt: string
  type: string
}

export interface VerifiedWebhookPayload {
  verified: true
  isDemo: boolean
  providerEventId: string
  type: string
  event: PaymentWebhookEvent
}

export const PROVIDER_EVENTS_STORAGE_KEY = 'lovedandknown.payment_provider_events'

export type PaymentWebhookHandler = (
  event: PaymentWebhookEvent,
) => Promise<{ ok: true; payment?: Payment; duplicate?: boolean } | { ok: false; error: string }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function normalizeStoredProviderEvent(raw: unknown): StoredProviderEvent | null {
  if (!isRecord(raw)) return null
  const providerEventId = asString(raw.providerEventId)
  const processedAt = asString(raw.processedAt)
  const type = asString(raw.type)
  if (!providerEventId || !processedAt || !type) return null
  return { providerEventId, processedAt, type }
}

export function loadProcessedProviderEvents(): StoredProviderEvent[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROVIDER_EVENTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeStoredProviderEvent)
      .filter((e): e is StoredProviderEvent => Boolean(e))
  } catch {
    return []
  }
}

export function saveProcessedProviderEvents(events: StoredProviderEvent[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PROVIDER_EVENTS_STORAGE_KEY, JSON.stringify(events))
}

export function hasProcessedProviderEvent(providerEventId: string): boolean {
  return loadProcessedProviderEvents().some((e) => e.providerEventId === providerEventId)
}

export function markProviderEventProcessed(
  providerEventId: string,
  type: string,
): StoredProviderEvent {
  const all = loadProcessedProviderEvents()
  const existing = all.find((e) => e.providerEventId === providerEventId)
  if (existing) return existing
  const entry: StoredProviderEvent = {
    providerEventId,
    type,
    processedAt: new Date().toISOString(),
  }
  all.push(entry)
  saveProcessedProviderEvents(all)
  return entry
}

export function clearProcessedProviderEvents(): void {
  saveProcessedProviderEvents([])
}

/** Map Stripe event type → internal payment status hint (no side effects). */
export function mapStripeEventToPaymentStatus(
  type: StripeProviderEventType | PaymentWebhookEventType,
): PaymentStatus | null {
  switch (type) {
    case 'payment_intent.succeeded':
    case 'payment.paid':
      return 'paid'
    case 'payment_intent.payment_failed':
    case 'payment.failed':
      return 'failed'
    case 'payment_intent.canceled':
    case 'payment.cancelled':
      return 'cancelled'
    case 'charge.refunded':
    case 'payment.refunded':
      return 'refunded'
    default:
      return null
  }
}

export function mapStripeEventToInternalType(
  type: StripeProviderEventType,
): PaymentWebhookEventType {
  switch (type) {
    case 'payment_intent.succeeded':
      return 'payment.paid'
    case 'payment_intent.payment_failed':
      return 'payment.failed'
    case 'payment_intent.canceled':
      return 'payment.cancelled'
    case 'charge.refunded':
      return 'payment.refunded'
    case 'account.updated':
      return 'account.updated'
    default:
      return type
  }
}

/**
 * Idempotent webhook handler.
 * DEMO: accepts only isDemo events; never elevates DEMO payments to real paid.
 * Production path is inactive until Stripe is wired.
 */
export async function handlePaymentWebhook(
  event: PaymentWebhookEvent,
): Promise<
  | { ok: true; payment?: Payment; duplicate?: boolean; skipped?: boolean }
  | { ok: false; error: string }
> {
  if (!event.providerEventId?.trim()) {
    return { ok: false, error: 'Missing providerEventId — cannot dedupe.' }
  }

  if (hasProcessedProviderEvent(event.providerEventId)) {
    return { ok: true, duplicate: true }
  }

  // Without a live provider, only DEMO-labelled events may be recorded (for tests).
  if (!event.isDemo) {
    return {
      ok: false,
      error: 'paymentWebhook is not active — no external payment provider connected.',
    }
  }

  markProviderEventProcessed(event.providerEventId, event.type)

  // DEMO must not invent paid state from webhooks.
  const mapped = mapStripeEventToPaymentStatus(event.type)
  if (mapped === 'paid' || mapped === 'authorized') {
    return {
      ok: true,
      skipped: true,
    }
  }

  return { ok: true }
}

/** Create a clearly labelled DEMO webhook event for tests. */
export function createDemoWebhookEvent(
  partial: Omit<PaymentWebhookEvent, 'isDemo' | 'providerEventId' | 'occurredAt'> & {
    providerEventId?: string
    occurredAt?: string
  },
): PaymentWebhookEvent {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return {
    ...partial,
    providerEventId: partial.providerEventId ?? `demo_evt_${Date.now().toString(36)}_${rand}`,
    occurredAt: partial.occurredAt ?? new Date().toISOString(),
    isDemo: true,
  }
}
