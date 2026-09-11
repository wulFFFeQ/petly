import { DemoSubscriptionProvider } from './demoProvider'
import type { SubscriptionProvider } from './provider'

export type { SubscriptionProvider } from './provider'
export { DemoSubscriptionProvider } from './demoProvider'
export type {
  BillingError,
  BillingErrorCode,
  BillingOk,
  BillingPortalResult,
  BillingResult,
  CancelSubscriptionRequest,
  ChangePlanRequest,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  ResumeSubscriptionRequest,
} from './types'

let activeProvider: SubscriptionProvider | null = null

/** Active billing provider — DEMO until a real provider is wired. */
export function getSubscriptionProvider(): SubscriptionProvider {
  if (!activeProvider) {
    activeProvider = new DemoSubscriptionProvider()
  }
  return activeProvider
}

/** Test helper — swap provider without changing UI. */
export function setSubscriptionProvider(provider: SubscriptionProvider): void {
  activeProvider = provider
}

export function resetSubscriptionProvider(): void {
  activeProvider = null
}
