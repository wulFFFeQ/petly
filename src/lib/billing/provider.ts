import type {
  BillingPortalResult,
  BillingResult,
  CancelSubscriptionRequest,
  ChangePlanRequest,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  ResumeSubscriptionRequest,
  SubscriptionRecord,
} from './types'

/**
 * Payment / subscription state provider.
 * Separate from entitlements: provider says what subscription the account has;
 * hasEntitlement says what the account may use.
 *
 * Future StripeSubscriptionProvider implements the same interface — UI unchanged.
 */
export interface SubscriptionProvider {
  getSubscription(accountId: string): Promise<BillingResult<{ subscription: SubscriptionRecord }>>

  createCheckoutSession(
    request: CheckoutSessionRequest,
  ): Promise<BillingResult<CheckoutSessionResult>>

  changePlan(request: ChangePlanRequest): Promise<BillingResult<{ subscription: SubscriptionRecord }>>

  cancelSubscription(
    request: CancelSubscriptionRequest,
  ): Promise<BillingResult<{ subscription: SubscriptionRecord }>>

  resumeSubscription(
    request: ResumeSubscriptionRequest,
  ): Promise<BillingResult<{ subscription: SubscriptionRecord }>>

  getBillingPortal(accountId: string): Promise<BillingResult<BillingPortalResult>>
}
