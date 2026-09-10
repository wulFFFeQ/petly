import { effectivePlan } from './access'
import { isDemoSubscription } from './demo'
import { resolvePlanEntitlements } from './matrix'
import { getPlanMeta } from './plans'
import type {
  FeatureId,
  PublicMembershipSummary,
  SubscriptionRecord,
} from './types'

/** Keys forbidden on any public / UI membership summary. */
export const PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS = [
  'providerCustomerId',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'paymentMethod',
  'invoice',
  'receipt',
  'paid',
  'purchaseToken',
] as const

/**
 * Safe presentation of membership for Settings / UI.
 * Never claims the user paid; DEMO is explicit.
 */
export function toPublicMembershipSummary(
  sub: SubscriptionRecord,
): PublicMembershipSummary {
  const plan = effectivePlan(sub)
  const meta = getPlanMeta(plan)
  const featureIds = [...resolvePlanEntitlements(plan)] as FeatureId[]
  const isDemo = isDemoSubscription(sub)

  return {
    plan,
    planLabel: meta.label,
    description: meta.description,
    isDemo,
    featureIds,
  }
}

export function assertPublicMembershipSafe(
  summary: PublicMembershipSummary,
): void {
  const rec = summary as unknown as Record<string, unknown>
  for (const key of PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS) {
    if (key in rec && rec[key] != null) {
      throw new Error(`Public membership must not expose ${key}`)
    }
  }
  if (summary.isDemo !== true && summary.isDemo !== false) {
    throw new Error('isDemo must be boolean')
  }
}

/**
 * Human-readable DEMO disclaimer — never "Premium aktivováno" as paid.
 */
export function demoDisclaimer(): string {
  return 'Lokální testovací tarif (DEMO) — není skutečné předplatné ani platba.'
}
