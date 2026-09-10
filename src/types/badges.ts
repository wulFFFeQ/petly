export type BadgeScope = 'pet' | 'user'

export type BadgeCategory =
  | 'milestone'
  | 'companion'
  | 'care'
  | 'breeding'
  | 'challenge'
  | 'secret'

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'secret'

/** Which pets can earn this badge. */
export type BadgeSpecies = 'all' | 'dog' | 'cat'

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
  description: string
  earnedFor: string
  /** Hint for path / challenge (never for secrets). */
  hint: string
  secret?: boolean
  maxLevel?: number
  levels?: BadgeLevelDef[]
  icon: BadgeIconKey
  species?: BadgeSpecies
  /** Only when Chovný profil is on. */
  requiresBreeding?: boolean
  /** Linked challenge id (optional). */
  challengeId?: string
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
  | 'trophy'
  | 'waves'
  | 'car'
  | 'globe'
  | 'paw'

export interface EarnedBadge {
  badgeId: string
  petId?: string
  level: number
  earnedAt: string
  revealed: boolean
}

export interface ChallengeDefinition {
  id: string
  name: string
  description: string
  /** What to do — concrete experience, not a form field. */
  instruction: string
  badgeId: string
  species?: BadgeSpecies
  requiresBreeding?: boolean
}
