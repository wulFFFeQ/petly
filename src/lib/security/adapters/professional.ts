/**
 * Professional access adapter — Account ≠ Profile ≠ Grant ≠ Permission.
 * Role / ProfessionalProfile.type never grants pet data.
 */

import {
  findAccess,
  hasPermission,
  isAccessEffective,
} from '../../professional/access'
import { loadPetProfessionalAccess } from '../../professional/storage'
import type { PetProfessionalAccess } from '../../professional/types'
import { professionalPermissionForAction } from '../actions'
import { denyIfEmergencyWriteLacksExpiry } from '../emergencyWriteGrant'
import type { AuthorizationDecision, SecurityAction } from '../types'

export type ProfessionalAdapterDeps = {
  loadAccess?: () => PetProfessionalAccess[]
  now?: number
}

export function authorizeProfessionalPet(
  petId: string,
  professionalProfileId: string,
  action: SecurityAction,
  deps: ProfessionalAdapterDeps = {},
): AuthorizationDecision {
  if (action === 'microchip.read' || action === 'ownerContacts.read') {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Professional access does not grant microchip or ownerContacts',
      denyClass: 'deny_by_default',
    }
  }

  const mapping = professionalPermissionForAction(action)
  if (!mapping) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: `Unknown professional permission mapping for action: ${action}`,
      denyClass: 'unknown_permission',
    }
  }

  const load = deps.loadAccess ?? loadPetProfessionalAccess
  const now = deps.now ?? Date.now()
  const access = findAccess(load(), petId, professionalProfileId)

  if (!access) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'No PetProfessionalAccess grant',
      denyClass: 'missing_grant',
    }
  }

  if (!isAccessEffective(access, now)) {
    if (access.status === 'revoked' || access.revokedAt) {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Professional access revoked',
        denyClass: 'revoked',
      }
    }
    if (access.status === 'expired' || (access.expiresAt && Date.parse(access.expiresAt) <= now)) {
      return {
        allowed: false,
        code: 'unauthorized',
        reason: 'Professional access expired',
        denyClass: 'expired',
      }
    }
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Professional access not effective',
      denyClass: 'missing_grant',
    }
  }

  // K62 — Pro emergency write must be time-bounded (expiresAt required).
  const expiryDeny = denyIfEmergencyWriteLacksExpiry(action, access.expiresAt, now)
  if (expiryDeny) return expiryDeny

  const allowed =
    hasPermission(access, mapping.permission, now) ||
    (mapping.viewHealthImplies === true && hasPermission(access, 'viewHealth', now))

  if (!allowed) {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: `Missing professional permission: ${mapping.permission}`,
      denyClass: 'forbidden',
    }
  }

  return {
    allowed: true,
    reason: 'professional',
    path: 'professional',
    grantId: access.id,
    permission: mapping.permission,
  }
}
