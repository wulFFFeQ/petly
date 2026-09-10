/**
 * Plans / entitlements (KROK 18).
 * Feature gates only — never data visibility (privacy / verification / professional).
 */

/** Consumer subscription plans. BREEDER_PRO is a parallel business branch. */
export type PlanId = 'free' | 'premium' | 'family' | 'breeder_pro'

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'expired'
  | 'canceled'
  | 'demo'

/** Reserved providers for future billing; only none/demo used in KROK 18. */
export type SubscriptionProvider =
  | 'none'
  | 'demo'
  | 'stripe'
  | 'app_store'
  | 'play'

/**
 * Persisted subscription state.
 * Does not imply payment — DEMO and none are first-class.
 */
export interface SubscriptionRecord {
  accountId: string
  plan: PlanId
  status: SubscriptionStatus
  startedAt?: string
  expiresAt?: string
  provider: SubscriptionProvider
  providerCustomerId?: string
  updatedAt: string
}

/** Feature category for catalog / UI grouping. */
export type FeatureCategory =
  | 'core'
  | 'safety'
  | 'premium'
  | 'family'
  | 'breeding'

/**
 * Stable feature IDs. Unknown IDs never auto-grant.
 * Core/safety stay on FREE forever.
 */
export type FeatureId =
  // Core / safety (FREE)
  | 'account_basic'
  | 'pet_profile_basic'
  | 'care_basic'
  | 'health_basic'
  | 'calendar_basic'
  | 'community'
  | 'discover_basic'
  | 'connections_basic'
  | 'messages_basic'
  | 'emergency_card'
  | 'identification_basic'
  | 'lost_pet'
  | 'found_pet'
  | 'safety_contact_basic'
  | 'community_help_basic'
  // Premium
  | 'health_advanced'
  | 'health_insights'
  | 'documents_advanced'
  | 'reminders_advanced'
  | 'calendar_advanced'
  | 'statistics'
  | 'care_advanced'
  | 'timeline_advanced'
  | 'travel_advanced'
  | 'discover_advanced_filters'
  | 'gallery_advanced'
  | 'personalized_insights'
  | 'services_extended'
  // Family
  | 'family_members'
  | 'family_shared_care'
  | 'family_permissions'
  | 'family_shared_calendar'
  | 'family_shared_health'
  | 'family_shared_documents'
  | 'family_multi_pets'
  | 'family_pet_access'
  // Breeder Pro
  | 'breeding_advanced'
  | 'breeding_pedigree'
  | 'breeding_litters'
  | 'breeding_events'
  | 'breeding_show_results'
  | 'breeding_titles'
  | 'breeding_health_tests'
  | 'breeder_statistics'
  | 'breeder_presentation'

/** Safe UI-facing plan summary — never billing IDs or paid claims. */
export interface PublicMembershipSummary {
  plan: PlanId
  planLabel: string
  description: string
  /** True when local DEMO switch is active — never presented as paid. */
  isDemo: boolean
  featureIds: FeatureId[]
}
