import {
  FEATURE_CATALOG,
  PLAN_IDS,
  hasEntitlement,
  type FeatureId,
  type PlanId,
} from '../entitlements'

export type ComparisonCategoryId = 'core' | 'care_health' | 'family' | 'breeding'

export interface ComparisonCategory {
  id: ComparisonCategoryId
  label: string
  /** Feature IDs shown in this comparison section — from existing catalog. */
  featureIds: readonly FeatureId[]
}

/**
 * Product comparison groups. Feature IDs come from the entitlement catalog;
 * cell values are always resolved via hasEntitlement(plan, feature).
 */
export const COMPARISON_CATEGORIES: readonly ComparisonCategory[] = [
  {
    id: 'core',
    label: 'Základ',
    featureIds: [
      'pet_profile_basic',
      'care_basic',
      'calendar_basic',
      'community',
      'discover_basic',
      'lost_pet',
      'found_pet',
      'emergency_card',
    ],
  },
  {
    id: 'care_health',
    label: 'Péče a zdraví',
    featureIds: [
      'health_advanced',
      'documents_advanced',
      'reminders_advanced',
      'statistics',
      'timeline_advanced',
    ],
  },
  {
    id: 'family',
    label: 'Rodina',
    featureIds: [
      'family_members',
      'family_shared_care',
      'family_permissions',
      'family_shared_calendar',
      'family_multi_pets',
    ],
  },
  {
    id: 'breeding',
    label: 'Chov',
    featureIds: [
      'breeding_advanced',
      'breeding_pedigree',
      'breeding_litters',
      'breeding_events',
      'breeding_show_results',
      'breeding_titles',
      'breeding_health_tests',
      'breeder_statistics',
    ],
  },
] as const

export interface ComparisonRow {
  featureId: FeatureId
  label: string
  byPlan: Record<PlanId, boolean>
}

export interface ComparisonSection {
  category: ComparisonCategory
  rows: ComparisonRow[]
}

export function buildFeatureComparison(): ComparisonSection[] {
  return COMPARISON_CATEGORIES.map((category) => ({
    category,
    rows: category.featureIds.map((featureId) => {
      const byPlan = {} as Record<PlanId, boolean>
      for (const plan of PLAN_IDS) {
        byPlan[plan] = hasEntitlement(plan, featureId)
      }
      return {
        featureId,
        label: FEATURE_CATALOG[featureId]?.label ?? featureId,
        byPlan,
      }
    }),
  }))
}
