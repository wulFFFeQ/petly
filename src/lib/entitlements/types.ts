export type {
  FeatureCategory,
  FeatureId,
  PlanId,
  PublicMembershipSummary,
  SubscriptionProvider,
  SubscriptionRecord,
  SubscriptionStatus,
} from '../../types/entitlements'

export const PLAN_IDS = ['free', 'premium', 'family', 'breeder_pro'] as const

export const SUBSCRIPTION_STATUSES = [
  'none',
  'active',
  'expired',
  'canceled',
  'demo',
] as const

export const SUBSCRIPTION_PROVIDERS = [
  'none',
  'demo',
  'stripe',
  'app_store',
  'play',
] as const

export const FEATURE_CATEGORIES = [
  'core',
  'safety',
  'premium',
  'family',
  'breeding',
] as const
