export type {
  FeatureCategory,
  FeatureId,
  PlanId,
  PublicMembershipSummary,
  SubscriptionProvider,
  SubscriptionRecord,
  SubscriptionStatus,
} from './types'

export {
  FEATURE_CATEGORIES,
  PLAN_IDS,
  SUBSCRIPTION_PROVIDERS,
  SUBSCRIPTION_STATUSES,
} from './types'

export {
  PLAN_CATALOG,
  PLAN_RANK,
  getPlanMeta,
  isPlanId,
  planIncludesBase,
  type PlanMeta,
} from './plans'

export {
  ALL_FEATURE_IDS,
  BREEDING_FEATURES,
  CORE_SAFETY_FEATURES,
  FAMILY_FEATURES,
  FEATURE_CATALOG,
  PREMIUM_FEATURES,
  SAFETY_FEATURES,
  getFeatureMeta,
  isFeatureId,
  type FeatureMeta,
} from './features'

export { PLAN_ENTITLEMENTS, resolvePlanEntitlements } from './matrix'

export {
  effectivePlan,
  hasEntitlement,
  requireEntitlement,
  suggestedPlanForFeature,
  type EntitlementCheckResult,
} from './access'

export {
  SUBSCRIPTION_STORAGE_KEY,
  createDefaultSubscription,
  loadSubscription,
  normalizeSubscription,
  saveSubscription,
} from './storage'

export {
  clearDemoPlan,
  isDemoSubscription,
  loadOrInitSubscription,
  setDemoPlan,
} from './demo'

export {
  PUBLIC_MEMBERSHIP_FORBIDDEN_KEYS,
  assertPublicMembershipSafe,
  demoDisclaimer,
  toPublicMembershipSummary,
} from './public'
