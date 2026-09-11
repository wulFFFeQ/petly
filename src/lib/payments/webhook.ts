/**
 * Webhook contract for future Stripe Checkout / PaymentIntents / Connect.
 * Idempotent via providerEventId; signature must be verified over raw body.
 *
 * Server contract (production):
 *   verifyWebhookSignature(rawRequestBody: string, signatureHeader, secretRef)
 * Never verify over re-serialized / mutated JSON when Stripe requires the raw body.
 * Webhook secrets must never live in localStorage or the frontend bundle.
 */

import type { ProfessionalPaymentAccountStatus } from './connectTypes'
import {
  mapStripeEventToInternal,
  mapStripeEventToInternalType as mapStripeToInternalLabel,
  mapStripeEventToPaymentStatus as mapStripeToStatus,
  type StripeProviderEventType,
} from './stripeEventMapping'
import { canTransitionPaymentStatus } from './stateMachine'
import type { Payment, PaymentStatus } from './types'

export type { StripeProviderEventType } from './stripeEventMapping'

export type PaymentWebhookEventType =
  | 'payment.authorized'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.cancelled'
  | 'checkout.completed'
  | 'checkout.expired'
  | 'account.updated'
  | StripeProviderEventType

export type ProviderEventProcessingStatus =
  | 'received'
  | 'processed'
  | 'duplicate'
  | 'skipped'
  | 'failed'

export interface PaymentWebhookEvent {
  type: PaymentWebhookEventType
  /** Stable provider event id — required for dedupe (Stripe evt_…). */
  providerEventId: string
  provider?: 'demo' | 'stripe'
  paymentId?: string
  providerPaymentId?: string
  professionalPaymentAccountId?: string
  status?: PaymentStatus
  accountStatus?: ProfessionalPaymentAccountStatus
  amountMinor?: number
  currency?: string
  occurredAt: string
  receivedAt?: string
  /** DEMO events must set this — never treat as real Stripe. */
  isDemo?: boolean
  /** Opaque provider payload — never expose publicly. */
  raw?: unknown
}

export interface StoredProviderEvent {
  provider: 'demo' | 'stripe'
  providerEventId: string
  eventType: string
  receivedAt: string
  processedAt?: string
  /** Result of Stripe → internal mapping. */
  mappingResult?: string
  processingStatus: ProviderEventProcessingStatus
  /** @deprecated Prefer eventType — kept for K34 readers. */
  type: string
}

export interface VerifiedWebhookPayload {
  verified: true
  isDemo: boolean
  providerEventId: string
  type: string
  event: PaymentWebhookEvent
  /** True when verification used a raw string body (required for live Stripe). */
  usedRawBody?: boolean
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
  const eventType = asString(raw.eventType) ?? asString(raw.type)
  const receivedAt =
    asString(raw.receivedAt) ?? asString(raw.processedAt) ?? new Date(0).toISOString()
  if (!providerEventId || !eventType) return null
  const providerRaw = asString(raw.provider)
  const provider: 'demo' | 'stripe' =
    providerRaw === 'stripe' ? 'stripe' : 'demo'
  const processingStatusRaw = asString(raw.processingStatus)
  const processingStatus: ProviderEventProcessingStatus =
    processingStatusRaw === 'received' ||
    processingStatusRaw === 'processed' ||
    processingStatusRaw === 'duplicate' ||
    processingStatusRaw === 'skipped' ||
    processingStatusRaw === 'failed'
      ? processingStatusRaw
      : 'processed'
  const entry: StoredProviderEvent = {
    provider,
    providerEventId,
    eventType,
    type: eventType,
    receivedAt,
    processingStatus,
  }
  if (asString(raw.processedAt)) entry.processedAt = asString(raw.processedAt)
  if (asString(raw.mappingResult)) entry.mappingResult = asString(raw.mappingResult)
  return entry
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
  opts?: {
    provider?: 'demo' | 'stripe'
    mappingResult?: string
    processingStatus?: ProviderEventProcessingStatus
    receivedAt?: string
  },
): StoredProviderEvent {
  const all = loadProcessedProviderEvents()
  const existing = all.find((e) => e.providerEventId === providerEventId)
  if (existing) {
    return {
      ...existing,
      processingStatus: 'duplicate',
    }
  }
  const now = new Date().toISOString()
  const entry: StoredProviderEvent = {
    provider: opts?.provider ?? 'demo',
    providerEventId,
    eventType: type,
    type,
    receivedAt: opts?.receivedAt ?? now,
    processedAt: now,
    mappingResult: opts?.mappingResult,
    processingStatus: opts?.processingStatus ?? 'processed',
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
  type: StripeProviderEventType | PaymentWebhookEventType | string,
): PaymentStatus | null {
  if (type === 'payment.paid' || type === 'payment.authorized') return 'paid'
  if (type === 'payment.failed') return 'failed'
  if (type === 'payment.cancelled') return 'cancelled'
  if (type === 'payment.refunded') return 'refunded'
  return mapStripeToStatus(type)
}

export function mapStripeEventToInternalType(
  type: StripeProviderEventType,
): PaymentWebhookEventType {
  return mapStripeToInternalLabel(type) as PaymentWebhookEventType
}

/**
 * Idempotent webhook handler.
 * DEMO: accepts only isDemo events; never elevates DEMO payments to real paid.
 * Production path is inactive until Stripe is wired server-side.
 */
export async function handlePaymentWebhook(
  event: PaymentWebhookEvent,
): Promise<
  | {
      ok: true
      payment?: Payment
      duplicate?: boolean
      skipped?: boolean
      mappingResult?: string
      processingStatus?: ProviderEventProcessingStatus
    }
  | { ok: false; error: string }
> {
  if (!event.providerEventId?.trim()) {
    return { ok: false, error: 'Missing providerEventId — cannot dedupe.' }
  }

  if (hasProcessedProviderEvent(event.providerEventId)) {
    return {
      ok: true,
      duplicate: true,
      processingStatus: 'duplicate',
      mappingResult: mapStripeEventToInternal(event.type).internalEventType,
    }
  }

  // Without a live provider, only DEMO-labelled events may be recorded (for tests).
  if (!event.isDemo) {
    return {
      ok: false,
      error: 'paymentWebhook is not active — no external payment provider connected.',
    }
  }

  const mapping = mapStripeEventToInternal(event.type)
  const receivedAt = event.receivedAt ?? new Date().toISOString()

  // DEMO must not invent paid state from webhooks.
  const mappedStatus = mapStripeEventToPaymentStatus(event.type)
  if (mappedStatus === 'paid' || mappedStatus === 'authorized') {
    markProviderEventProcessed(event.providerEventId, event.type, {
      provider: event.provider ?? 'demo',
      mappingResult: mapping.internalEventType,
      processingStatus: 'skipped',
      receivedAt,
    })
    return {
      ok: true,
      skipped: true,
      mappingResult: mapping.internalEventType,
      processingStatus: 'skipped',
    }
  }

  // Non-elevating transitions may be recorded; still do not mutate DEMO payments to paid.
  if (mappedStatus && event.paymentId) {
    // Validate transition would be legal if applied — DEMO still skips money elevation.
    void canTransitionPaymentStatus('pending', mappedStatus)
  }

  markProviderEventProcessed(event.providerEventId, event.type, {
    provider: event.provider ?? 'demo',
    mappingResult: mapping.internalEventType,
    processingStatus: 'processed',
    receivedAt,
  })

  return {
    ok: true,
    mappingResult: mapping.internalEventType,
    processingStatus: 'processed',
  }
}

/**
 * Signature verification contract helper (documentation + DEMO gate).
 * Live Stripe: pass the raw HTTP body string — never JSON.parse then re-stringify.
 */
export type WebhookSignatureVerifyInput = {
  /** Raw request body as received over the wire. */
  rawBody: string
  signatureHeader: string | null | undefined
  /** Server-side secret ref name or DEMO ref — never a client-bundled secret value. */
  secretRef: string
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
  const now = new Date().toISOString()
  return {
    ...partial,
    provider: partial.provider ?? 'demo',
    providerEventId: partial.providerEventId ?? `demo_evt_${Date.now().toString(36)}_${rand}`,
    occurredAt: partial.occurredAt ?? now,
    receivedAt: partial.receivedAt ?? now,
    isDemo: true,
  }
}
