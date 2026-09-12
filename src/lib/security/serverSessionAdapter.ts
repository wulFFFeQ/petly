/**
 * Production SecurityContext from authenticated cookie session.
 * Actor = accounts.id from server session. Never owner_self. Never client-forged ids.
 */

import { createSecurityContext } from './context'
import type { ActiveMode, SecurityContext } from './types'

export type ServerSessionAdapterInput = {
  /** Trusted authenticated account id from JWT / session — not from request body. */
  authenticatedAccountId: string
  sessionId?: string
  authenticatedAt?: string
  channel?: SecurityContext['channel']
  activeMode?: ActiveMode
  correlationId?: string
  requestId?: string
  /**
   * Client-claimed actorAccountId — IGNORED. Present to prove forgery is rejected.
   */
  claimedActorAccountId?: string
}

export type ServerSessionAdapterResult =
  | { ok: true; context: SecurityContext }
  | {
      ok: false
      reason: 'unauthenticated'
      message: string
      context: SecurityContext
    }

/**
 * Build SecurityContext with authority: 'server'.
 * Does not load org/pro facets here — Node API attaches validated facets after DB lookup.
 */
export function createServerSecurityContextFromSession(
  input: ServerSessionAdapterInput,
): ServerSessionAdapterResult {
  void input.claimedActorAccountId

  const accountId = input.authenticatedAccountId?.trim()
  if (!accountId) {
    const context = createSecurityContext({
      channel: input.channel ?? 'web',
      authentication: { kind: 'none' },
      actor: { kind: 'anonymous' },
      authority: 'server',
      correlationId: input.correlationId,
      requestId: input.requestId,
    })
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'No authenticated account',
      context,
    }
  }

  // Production must never treat DEMO sentinel as authority.
  if (accountId === 'owner_self') {
    const context = createSecurityContext({
      channel: input.channel ?? 'web',
      authentication: { kind: 'none' },
      actor: { kind: 'anonymous' },
      authority: 'server',
      correlationId: input.correlationId,
      requestId: input.requestId,
    })
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'owner_self is not a production authority',
      context,
    }
  }

  const context = createSecurityContext({
    channel: input.channel ?? 'web',
    authentication: {
      kind: 'session',
      sessionId: input.sessionId ?? 'cookie_session',
      authenticatedAt: input.authenticatedAt ?? new Date().toISOString(),
    },
    actor: {
      kind: 'account',
      accountId,
    },
    authority: 'server',
    activeMode: input.activeMode ?? 'personal',
    correlationId: input.correlationId,
    requestId: input.requestId,
  })

  return { ok: true, context }
}
