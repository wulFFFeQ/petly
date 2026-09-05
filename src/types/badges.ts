export type BadgeScope = 'pet' | 'user'

export type BadgeCategory =
  | 'milestone'
  | 'health'
  | 'activity'
  | 'community'
  | 'care'
  | 'secret'

export interface BadgeLevelDef {
  level: number
  title: string
  description: string
}

export interface BadgeDefinition {
  id: string
  scope: BadgeScope
  category: BadgeCategory
  name: string
  description: string
  /** Hidden until earned. */
  secret?: boolean
  /** Max level; omit or 1 = single-level badge. */
  maxLevel?: number
  levels?: BadgeLevelDef[]
  /** Lucide icon key used by the medal UI. */
  icon: BadgeIconKey
}

export type BadgeIconKey =
  | 'award'
  | 'heart'
  | 'shield'
  | 'syringe'
  | 'stethoscope'
  | 'scale'
  | 'clipboard'
  | 'footprints'
  | 'plane'
  | 'map'
  | 'users'
  | 'message'
  | 'sparkles'
  | 'moon'
  | 'calendar'
  | 'file'
  | 'home'
  | 'cake'
  | 'star'
  | 'compass'

/** Persisted unlock record. */
export interface EarnedBadge {
  badgeId: string
  /** Present for pet-scoped badges. */
  petId?: string
  level: number
  /** ISO date YYYY-MM-DD */
  earnedAt: string
  /** For secret badges: false until first award toast shown. */
  revealed: boolean
}
