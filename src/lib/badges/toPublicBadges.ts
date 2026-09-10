import type { DiscoverPublicBadge, Pet } from '../../types'
import type { EarnedBadge } from '../../types/badges'
import { getBadgeDefinition, isBadgeApplicableToPet } from '../badges/catalog'
import { hasActiveBreedingProfile } from '../breedingProfile'

/**
 * Safe public badge payload — only ids/dates/catalog story text.
 * Never includes chip, diagnosis, meds, documents, or owner PII.
 */
export function toPublicBadges(
  pet: Pet,
  earnedBadges: EarnedBadge[],
): DiscoverPublicBadge[] {
  if (!pet.publicDiscover) return []

  const breedingActive = hasActiveBreedingProfile(pet)
  const out: DiscoverPublicBadge[] = []

  for (const earned of earnedBadges) {
    if (earned.petId !== pet.id) continue
    const def = getBadgeDefinition(earned.badgeId)
    if (!def) continue
    if (!isBadgeApplicableToPet(def, pet)) continue
    if (def.requiresBreeding && !breedingActive) continue
    // Secrets only after earned (they are earned here) — expose name via story from catalog, not criteria
    if (def.secret && !earned.revealed) continue

    out.push({
      badgeId: earned.badgeId,
      level: earned.level,
      earnedAt: earned.earnedAt,
      story: def.name,
    })
  }

  return out
}
