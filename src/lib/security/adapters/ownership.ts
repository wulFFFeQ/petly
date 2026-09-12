/**
 * Ownership adapter — wraps existing pets/ownership helpers.
 */

import { isPetOwner, resolvePetOwnerAccountId } from '../../pets/ownership'
import type { Pet } from '../../../types'
import type { AuthorizationDecision } from '../types'

export function decideOwnerPetAccess(
  pet: Pet,
  actorAccountId: string,
  action: string,
): AuthorizationDecision | null {
  if (!isPetOwner(pet, actorAccountId)) return null

  // Microchip / owner PII: owner only (existing privacy boundary).
  if (action === 'microchip.read' || action === 'ownerContacts.read') {
    return { allowed: true, reason: 'owner', path: 'owner' }
  }

  // Owner has full pet authority for pet-data capabilities (not platform admin).
  return { allowed: true, reason: 'owner', path: 'owner' }
}

export { isPetOwner, resolvePetOwnerAccountId }
