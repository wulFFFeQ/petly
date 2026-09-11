import { isFeatureId } from './features'
import { resolvePlanEntitlements } from './matrix'
import { isPlanId } from './plans'
import type { FeatureId, PlanId, SubscriptionRecord } from './types'

function isExpiresAtInFuture(expiresAt: string | undefined, nowMs: number): boolean {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return false
  return t > nowMs
}

function isExpiresAtInPast(expiresAt: string | undefined, nowMs: number): boolean {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return false
  return t <= nowMs
}

/**
 * Effective plan for entitlement checks.
 * - active / demo → stored plan (active with past expiresAt → free)
 * - canceled with future expiresAt → stored plan (grace until expiry)
 * - canceled without / after expiry, expired, none → free
 */
export function effectivePlan(
  sub: SubscriptionRecord | PlanId,
  now: Date | number = Date.now(),
): PlanId {
  if (typeof sub === 'string') {
    return isPlanId(sub) ? sub : 'free'
  }
  if (!isPlanId(sub.plan)) return 'free'

  const nowMs = typeof now === 'number' ? now : now.getTime()

  if (sub.status === 'demo') {
    return sub.plan
  }

  if (sub.status === 'active') {
    if (isExpiresAtInPast(sub.expiresAt, nowMs)) return 'free'
    return sub.plan
  }

  if (sub.status === 'canceled') {
    if (isExpiresAtInFuture(sub.expiresAt, nowMs)) return sub.plan
    return 'free'
  }

  // expired | none | unknown
  return 'free'
}

/**
 * Whether the plan/subscription grants a feature.
 * Unknown feature IDs never auto-grant.
 * Does NOT grant data visibility — privacy/professional/verification stay separate.
 */
export function hasEntitlement(
  planOrSub: PlanId | SubscriptionRecord,
  feature: string,
): boolean {
  if (!isFeatureId(feature)) return false
  const plan = effectivePlan(planOrSub)
  return resolvePlanEntitlements(plan).has(feature)
}

export type EntitlementCheckResult =
  | { ok: true; plan: PlanId; feature: FeatureId }
  | { ok: false; plan: PlanId; feature: string; reason: 'unknown_feature' | 'missing' }

export function requireEntitlement(
  planOrSub: PlanId | SubscriptionRecord,
  feature: string,
): EntitlementCheckResult {
  const plan = effectivePlan(planOrSub)
  if (!isFeatureId(feature)) {
    return { ok: false, plan, feature, reason: 'unknown_feature' }
  }
  if (!resolvePlanEntitlements(plan).has(feature)) {
    return { ok: false, plan, feature, reason: 'missing' }
  }
  return { ok: true, plan, feature }
}

/** Which paid-ish plan typically unlocks this feature (for UpgradePrompt copy). */
export function suggestedPlanForFeature(feature: string): PlanId | null {
  if (!isFeatureId(feature)) return null
  if (resolvePlanEntitlements('free').has(feature)) return 'free'
  if (resolvePlanEntitlements('premium').has(feature)) return 'premium'
  if (resolvePlanEntitlements('family').has(feature)) return 'family'
  if (resolvePlanEntitlements('breeder_pro').has(feature)) return 'breeder_pro'
  return null
}
