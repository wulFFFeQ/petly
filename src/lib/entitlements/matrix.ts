import {
  BREEDING_FEATURES,
  CORE_SAFETY_FEATURES,
  FAMILY_FEATURES,
  PREMIUM_FEATURES,
} from './features'
import type { FeatureId, PlanId } from './types'

function freezeSet(ids: readonly FeatureId[]): ReadonlySet<FeatureId> {
  return new Set(ids)
}

const FREE_SET = freezeSet([...CORE_SAFETY_FEATURES])

const PREMIUM_SET = freezeSet([...CORE_SAFETY_FEATURES, ...PREMIUM_FEATURES])

const FAMILY_SET = freezeSet([
  ...CORE_SAFETY_FEATURES,
  ...PREMIUM_FEATURES,
  ...FAMILY_FEATURES,
])

/** BREEDER_PRO = Premium base + breeding; not Family. */
const BREEDER_PRO_SET = freezeSet([
  ...CORE_SAFETY_FEATURES,
  ...PREMIUM_FEATURES,
  ...BREEDING_FEATURES,
])

export const PLAN_ENTITLEMENTS: Record<PlanId, ReadonlySet<FeatureId>> = {
  free: FREE_SET,
  premium: PREMIUM_SET,
  family: FAMILY_SET,
  breeder_pro: BREEDER_PRO_SET,
}

export function resolvePlanEntitlements(plan: PlanId): ReadonlySet<FeatureId> {
  return PLAN_ENTITLEMENTS[plan]
}
