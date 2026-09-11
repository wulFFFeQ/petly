/**
 * Payment provider config — DEMO is default.
 * Secret keys must never be read or exposed on the frontend.
 */

import type { PaymentProviderId } from './types'

export type PaymentProviderConfigId = 'demo' | 'stripe'

/**
 * Server-side secret names (documentation / future backend only).
 * Frontend must never load these values.
 */
export const SERVER_ONLY_SECRET_ENV_NAMES = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_CONNECT_CLIENT_ID',
] as const

/** Env keys that must never appear in Vite client bundles as secrets. */
export const FORBIDDEN_CLIENT_SECRET_PATTERNS = [
  'STRIPE_SECRET',
  'WEBHOOK_SECRET',
  'sk_live',
  'sk_test',
  'whsec_',
] as const

export interface PaymentProviderConfig {
  /** Active booking-payment provider id. Default: demo. */
  provider: PaymentProviderConfigId
  /** True when real Stripe wiring is not active. */
  isDemo: boolean
  /** Human-readable status for UI. */
  statusLabel: string
}

function readEnvProvider(): PaymentProviderConfigId {
  try {
    // Vite client may expose only non-secret public flags.
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    const raw = (env?.VITE_PAYMENT_PROVIDER ?? env?.PAYMENT_PROVIDER ?? 'demo')
      .toString()
      .trim()
      .toLowerCase()
    if (raw === 'stripe') return 'stripe'
  } catch {
    // Node / assert scripts without import.meta.env
  }
  return 'demo'
}

/**
 * Resolve provider config. Even if env says stripe, K34 keeps runtime on DEMO
 * until a real StripeConnectPaymentProvider is wired in production.
 */
export function getPaymentProviderConfig(): PaymentProviderConfig {
  const requested = readEnvProvider()
  // K34: always operate as demo unless tests swap the provider instance.
  // Requested stripe is acknowledged but not activated (no SDK / keys).
  if (requested === 'stripe') {
    return {
      provider: 'demo',
      isDemo: true,
      statusLabel: 'DEMO — Stripe připravujeme (provider zatím neaktivní)',
    }
  }
  return {
    provider: 'demo',
    isDemo: true,
    statusLabel: 'DEMO — online platby připravujeme',
  }
}

export function isPaymentProviderActive(): boolean {
  return false
}

export function resolveProviderIdForRecords(): PaymentProviderId {
  return getPaymentProviderConfig().isDemo ? 'demo' : 'stripe'
}

/** Assert helper: no secret-looking values in a plain object (tests / privacy). */
export function assertNoSecretKeysInObject(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return true
  const text = JSON.stringify(obj).toLowerCase()
  return !FORBIDDEN_CLIENT_SECRET_PATTERNS.some((p) => text.includes(p.toLowerCase()))
}
