/**
 * Public access — explicit anonymous + allowlist projection only.
 * Never: "no session → raw Pet".
 */

import { projectPublicPet } from '../../privacy/project'
import type { Pet } from '../../../types'
import type { AuthorizationDecision, SecurityAction, SecurityContext } from '../types'

export function authorizePublicPet(
  ctx: SecurityContext,
  action: SecurityAction,
): AuthorizationDecision {
  if (action !== 'public.pet.project') {
    return {
      allowed: false,
      code: 'unauthorized',
      reason: 'Public context only allows public.pet.project',
      denyClass: 'deny_by_default',
    }
  }

  if (ctx.actor.kind !== 'anonymous' && ctx.authentication.kind !== 'none') {
    // Authenticated callers may still request public projection via this action,
    // but channel should be public OR action is explicitly public.pet.project.
  }

  if (ctx.channel !== 'public' && ctx.authentication.kind !== 'none') {
    // Allow authenticated users to request public projection shape as well.
  }

  return { allowed: true, reason: 'public', path: 'public' }
}

/**
 * After authorize ALLOW — project via existing public allowlist.
 * Projection is NOT authorization.
 */
export function projectAuthorizedPublicPet(pet: Pet) {
  return projectPublicPet(pet)
}
