/**
 * Actor resolution — always from SecurityContext (session-bound), never from payload.
 */

import { actorAccountId, isAuthenticatedAccount } from './context'
import type { SecurityActor, SecurityContext } from './types'

export type ResolvedActor =
  | { kind: 'account'; accountId: string }
  | { kind: 'anonymous' }
  | { kind: 'system'; systemJob: string }
  | { kind: 'provider'; providerId: string }

export function resolveActor(ctx: SecurityContext): ResolvedActor {
  switch (ctx.actor.kind) {
    case 'account': {
      const id = actorAccountId(ctx)
      if (!id || !isAuthenticatedAccount(ctx)) {
        return { kind: 'anonymous' }
      }
      return { kind: 'account', accountId: id }
    }
    case 'system':
      return {
        kind: 'system',
        systemJob: ctx.actor.systemJob ?? 'unknown_job',
      }
    case 'provider':
      return {
        kind: 'provider',
        providerId: ctx.actor.providerId ?? 'unknown_provider',
      }
    case 'anonymous':
    default:
      return { kind: 'anonymous' }
  }
}

/**
 * Reject any attempt to override actor from client payload.
 * Returns true if claim was present and differed from trusted actor.
 */
export function isForgedActorClaim(
  ctx: SecurityContext,
  claimedActorAccountId: string | undefined,
): boolean {
  if (!claimedActorAccountId?.trim()) return false
  const trusted = actorAccountId(ctx)
  if (!trusted) {
    // Claim while unauthenticated / non-account — forge attempt.
    return true
  }
  return claimedActorAccountId.trim() !== trusted
}

export function actorFromContext(ctx: SecurityContext): SecurityActor {
  return { ...ctx.actor }
}
