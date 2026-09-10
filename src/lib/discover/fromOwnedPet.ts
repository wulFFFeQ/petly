import type { DiscoverPet, Pet } from '../../types'
import type { EarnedBadge } from '../../types/badges'
import type { Verification } from '../../types/verification'
import {
  applyPublicDiscoverMigration,
  defaultPrivacySettings,
  loadPrivacySettings,
  projectPublicPet,
  type PrivacySettings,
} from '../privacy'
import { loadVerifications } from '../verification/storage'
import { sanitizeDiscoverPet } from './privacy'

export type ProjectOwnedPetOptions = {
  /** Field-level privacy. When omitted, loads from localStorage (browser) or defaults. */
  privacySettings?: PrivacySettings | null
  /** Verification records. When omitted, loads from localStorage (browser) or []. */
  verifications?: Verification[]
}

function resolvePrivacySettings(
  pet: Pet,
  privacySettings?: PrivacySettings | null,
): PrivacySettings {
  if (privacySettings) {
    return applyPublicDiscoverMigration(privacySettings, [pet])
  }
  if (typeof localStorage !== 'undefined') {
    try {
      return loadPrivacySettings([pet])
    } catch {
      return applyPublicDiscoverMigration(defaultPrivacySettings(), [pet])
    }
  }
  return applyPublicDiscoverMigration(defaultPrivacySettings(), [pet])
}

/**
 * Project an owned Pet into a public DiscoverPet payload.
 * Requires `publicDiscover` and public visibility on identity fields.
 * Never copies health/chip/PII — enforced by projectPublicPet + sanitizeDiscoverPet.
 */
export function projectOwnedPetToDiscover(
  pet: Pet,
  earnedBadges: EarnedBadge[] = [],
  options: ProjectOwnedPetOptions = {},
): DiscoverPet | null {
  const settings = resolvePrivacySettings(pet, options.privacySettings)
  let verifications = options.verifications
  if (verifications == null) {
    if (typeof localStorage !== 'undefined') {
      try {
        verifications = loadVerifications()
      } catch {
        verifications = []
      }
    } else {
      verifications = []
    }
  }
  const projected = projectPublicPet(pet, {
    settings,
    earnedBadges,
    verifications,
  })
  if (!projected) return null
  return sanitizeDiscoverPet(projected)
}
