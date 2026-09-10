import type { DiscoverPet } from '../../types'
import type { DiscoverEngagementStats } from './engagement'

/** Score ≥ this → passes „Populární“ filter. */
export const POPULAR_SCORE_THRESHOLD = 40

/** Score ≥ this → „Oblíbenec komunity“ badge. */
export const COMMUNITY_FAVORITE_SCORE_THRESHOLD = 55

/**
 * Simple extensible popularity score.
 * Later: weight profileViews / favorites / connections / communityInteractions from live data.
 */
export function computeDiscoverPopularityScore(
  pet: Pick<
    DiscoverPet,
    | 'verified'
    | 'publicBadges'
    | 'publicTimeline'
    | 'breedingProfile'
    | 'gallery'
    | 'engagement'
  >,
): number {
  const engagement: DiscoverEngagementStats = pet.engagement ?? {}
  let score = 0

  if (pet.verified) score += 15

  for (const badge of pet.publicBadges ?? []) {
    score += 8 + Math.max(0, (badge.level ?? 1) - 1) * 2
  }

  for (const event of pet.publicTimeline ?? []) {
    if (event.category === 'award' || event.category === 'show') score += 12
    else score += 2
  }

  if (pet.breedingProfile) score += 8

  const galleryCount = pet.gallery?.length ?? 0
  score += Math.min(10, galleryCount * 2)

  score += Math.min(40, (engagement.profileViews ?? 0) * 0.15)
  score += (engagement.favorites ?? 0) * 6
  score += (engagement.connections ?? 0) * 12
  score += (engagement.communityInteractions ?? 0) * 3
  score += (engagement.activityPoints ?? 0) * 1

  return Math.round(score * 10) / 10
}

export function isDiscoverPopular(score: number): boolean {
  return score >= POPULAR_SCORE_THRESHOLD
}

export function isCommunityFavorite(score: number): boolean {
  return score >= COMMUNITY_FAVORITE_SCORE_THRESHOLD
}
