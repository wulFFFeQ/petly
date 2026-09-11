import type { PlanId, SubscriptionRecord } from '../entitlements'

/** Why a billing operation cannot complete in DEMO / future providers. */
export type BillingErrorCode =
  | 'demo_only'
  | 'not_implemented'
  | 'ineligible'
  | 'invalid_plan'
  | 'no_subscription'

export interface BillingError {
  ok: false
  code: BillingErrorCode
  message: string
}

export type BillingOk<T> = { ok: true } & T

export type BillingResult<T> = BillingOk<T> | BillingError

export interface CheckoutSessionRequest {
  accountId: string
  plan: PlanId
  /** Return URLs reserved for future Stripe Checkout. */
  successUrl?: string
  cancelUrl?: string
}

export interface CheckoutSessionResult {
  /** Never a real payment URL in DEMO. */
  url: null
  message: string
}

export interface BillingPortalResult {
  url: null
  message: string
}

export interface ChangePlanRequest {
  accountId: string
  plan: PlanId
  /**
   * DEMO-only local switch. Real providers will ignore this and use checkout.
   */
  demo?: boolean
}

export interface CancelSubscriptionRequest {
  accountId: string
  /** When true, access remains until expiresAt (future paid cancel). */
  atPeriodEnd?: boolean
}

export interface ResumeSubscriptionRequest {
  accountId: string
}

export type { PlanId, SubscriptionRecord }
