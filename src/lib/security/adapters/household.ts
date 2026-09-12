/**
 * Household access adapter — wraps PetHouseholdAccess helpers.
 * Role alone is never permission; stored permissions[] are SSOT.
 */

import {
  actorHasHouseholdPermission,
  findHouseholdAccess,
  isHouseholdAccessEffective,
} from '../../household/access'
import { loadPetHouseholdAccess } from '../../household/storage'
import type { PetHouseholdAccess } from '../../household/types'
import type { Pet } from '../../../types'
import { householdPermissionForAction } from '../actions'
import type { AuthorizationDecision, SecurityAction } from '../types'

export type HouseholdAdapterDeps = {
  loadAccess?: () => PetHouseholdAccess[]
  now?: number
}

export function authorizeHouseholdPet(
  pet: Pet,
  actorAccountId: string,
  action: SecurityAction,
  deps: HouseholdAdapterDeps = {},
): AuthorizationDecision {
  if (action === 'microchip.read' || action === 'ownerContacts.read') {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Household access does not grant microchip or ownerContacts',
      denyClass: 'deny_by_default',
    }
  }

  const hhPerm = householdPermissionForAction(action)
  if (!hhPerm) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: `Unknown household permission mapping for action: ${action}`,
      denyClass: 'unknown_permission',
    }
  }

  const load = deps.loadAccess ?? loadPetHouseholdAccess
  const now = deps.now ?? Date.now()
  const list = load()
  const access = findHouseholdAccess(list, pet.id, actorAccountId)

  if (access && !isHouseholdAccessEffective(access, now)) {
    if (access.status === 'revoked' || access.revokedAt) {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Household access revoked',
        denyClass: 'revoked',
      }
    }
    if (access.status === 'expired' || (access.expiresAt && Date.parse(access.expiresAt) <= now)) {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Household access expired',
        denyClass: 'expired',
      }
    }
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Household access not effective',
      denyClass: 'missing_grant',
    }
  }

  if (!actorHasHouseholdPermission(pet, actorAccountId, access, hhPerm, now)) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: `Missing household permission: ${hhPerm}`,
      denyClass: access ? 'forbidden' : 'missing_grant',
    }
  }

  return {
    allowed: true,
    reason: 'household',
    path: 'household',
    grantId: access?.id,
    permission: hhPerm,
  }
}
