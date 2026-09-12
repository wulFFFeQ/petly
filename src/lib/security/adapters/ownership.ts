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

  // K55/K56: owner must never spoof clinician sign.
  if (action === 'clinical.sign') {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Owner cannot clinical.sign (clinician-only)',
      denyClass: 'forbidden',
    }
  }

  // K62: owner may manage Emergency Card via clinical.emergency.write.
  // Scope is enforced in ClinicalService — this action never grants health.write.
  if (action === 'clinical.emergency.write') {
    return {
      allowed: true,
      reason: 'owner',
      path: 'owner',
      permission: 'clinical.emergency.write',
    }
  }

  // Owner has full pet authority for pet-data capabilities (not platform admin).
  return { allowed: true, reason: 'owner', path: 'owner' }
}

export { isPetOwner, resolvePetOwnerAccountId }
