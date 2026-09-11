import {
  FEATURE_CATALOG,
  PLAN_IDS,
  getPlanMeta,
  resolvePlanEntitlements,
  type PlanId,
} from '../entitlements'

/**
 * Display-only plan pricing — NEVER used by hasEntitlement / effectivePlan.
 * DEMO product values; may change later without touching entitlement matrix.
 */
export interface PlanPricing {
  plan: PlanId
  displayName: string
  description: string
  monthlyPrice: number
  currency: 'CZK'
  /** Human labels derived from entitlement matrix + FEATURE_CATALOG. */
  features: string[]
  recommended?: boolean
  active: boolean
}

const MONTHLY_PRICES: Record<PlanId, number> = {
  free: 0,
  premium: 149,
  family: 249,
  breeder_pro: 499,
}

/** Highlighted bullet count on plan cards (full list still in comparison). */
const CARD_FEATURE_LIMIT = 6

function featureLabelsForPlan(plan: PlanId): string[] {
  const ids = [...resolvePlanEntitlements(plan)]
  // Prefer plan-specific deltas for paid plans so cards stay readable.
  const baseFree = resolvePlanEntitlements('free')
  const premium = resolvePlanEntitlements('premium')

  let prioritized = ids
  if (plan === 'premium') {
    prioritized = ids.filter((id) => !baseFree.has(id))
  } else if (plan === 'family') {
    prioritized = ids.filter((id) => !premium.has(id) || id.startsWith('family_'))
  } else if (plan === 'breeder_pro') {
    prioritized = ids.filter((id) => !premium.has(id) || id.startsWith('breeding_') || id.startsWith('breeder_'))
  }

  const labels = prioritized
    .map((id) => FEATURE_CATALOG[id]?.label)
    .filter((label): label is string => Boolean(label))

  if (labels.length >= CARD_FEATURE_LIMIT) {
    return labels.slice(0, CARD_FEATURE_LIMIT)
  }

  // Fallback: fill from full set if delta is short (Free).
  const allLabels = ids
    .map((id) => FEATURE_CATALOG[id]?.label)
    .filter((label): label is string => Boolean(label))
  return allLabels.slice(0, CARD_FEATURE_LIMIT)
}

function buildPricing(plan: PlanId): PlanPricing {
  const meta = getPlanMeta(plan)
  return {
    plan,
    displayName: meta.label,
    description: meta.description,
    monthlyPrice: MONTHLY_PRICES[plan],
    currency: 'CZK',
    features: featureLabelsForPlan(plan),
    recommended: plan === 'premium',
    active: true,
  }
}

export const PLAN_PRICING: Record<PlanId, PlanPricing> = {
  free: buildPricing('free'),
  premium: buildPricing('premium'),
  family: buildPricing('family'),
  breeder_pro: buildPricing('breeder_pro'),
}

export function getPlanPricing(plan: PlanId): PlanPricing {
  return PLAN_PRICING[plan]
}

export function listPlanPricing(): PlanPricing[] {
  return PLAN_IDS.map((id) => PLAN_PRICING[id])
}

export function formatMonthlyPrice(pricing: PlanPricing): string {
  if (pricing.monthlyPrice === 0) return '0 Kč / měsíc'
  return `${pricing.monthlyPrice} Kč / měsíc`
}
