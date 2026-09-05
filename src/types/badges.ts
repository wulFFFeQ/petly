export type BadgeScope = 'pet' | 'user'

export type BadgeCategory =
  | 'milestone'
  | 'health'
  | 'activity'
  | 'community'
  | 'care'
  | 'secret'

/** Display / collection rarity — secrets are always `secret`. */
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'secret'

export interface BadgeLevelDef {
  level: number
  title: string
  description: string
}

export interface BadgeDefinition {
  id: string
  scope: BadgeScope
  category: BadgeCategory
  rarity: BadgeRarity
  name: string
  /** Short flavor — what this milestone means. */
  description: string
  /** Shown when earned: why / for what it was awarded. */
  earnedFor: string
  /** Guidance for “Další na cestě” (never shown for secrets). */
  hint: string
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
  | 'camera'
  | 'check'

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
