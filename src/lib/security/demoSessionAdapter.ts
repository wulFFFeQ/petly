/**
 * DEMO authentication adapter over existing src/lib/account/session.ts.
 * Explicitly NOT production authority — SecurityContext.authority = 'demo'.
 *
 * Never trusts client-supplied actorAccountId / role / permissions.
 */

import {
  getSelfAccount,
  isSessionActive,
} from '../account/session'
import {
  createAnonymousPublicContext,
  createSecurityContext,
  withOrganizationContext,
  withPersonalMode,
  withProfessionalContext,
} from './context'
import type { ResolveOrganizationContextDeps } from './resolveOrganizationContext'
import { resolveOrganizationContext } from './resolveOrganizationContext'
import type { ResolveProfessionalContextDeps } from './resolveProfessionalContext'
import { resolveProfessionalContext } from './resolveProfessionalContext'
import type { ActiveMode, SecurityContext } from './types'

export type DemoSessionAdapterInput = {
  channel?: SecurityContext['channel']
  /**
   * UX hint for workspace mode — validated when org/pro facets are resolved.
   * Does not change actor identity.
   */
  activeMode?: ActiveMode
  /**
   * Client-claimed organizationId — UNTRUSTED; validated via membership.
   */
  claimedOrganizationId?: string
  /**
   * Client-claimed actorAccountId — IGNORED. Present to prove forgery is rejected.
   */
  claimedActorAccountId?: string
  correlationId?: string
  requestId?: string
  /** Inject deps for tests (membership / profile loaders). */
  orgDeps?: ResolveOrganizationContextDeps
  proDeps?: ResolveProfessionalContextDeps
}

export type DemoSessionAdapterResult =
  | { ok: true; context: SecurityContext }
  | {
      ok: false
      reason: 'unauthenticated' | 'invalid_organization_context' | 'invalid_professional_context'
      message: string
      /** Partial anonymous/unauthenticated context for deny paths. */
      context: SecurityContext
    }

/**
 * Build SecurityContext from DEMO session.
 * Actor identity comes ONLY from getSelfAccount() when session is active.
 */
export function createDemoSecurityContext(
  input: DemoSessionAdapterInput = {},
): DemoSessionAdapterResult {
  // Explicitly discard forged identity claims — never use as authority.
  void input.claimedActorAccountId

  if (!isSessionActive()) {
    const context = createSecurityContext({
      channel: input.channel ?? 'web',
      authentication: { kind: 'none' },
      actor: { kind: 'anonymous' },
      authority: 'demo',
      correlationId: input.correlationId,
      requestId: input.requestId,
    })
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'DEMO session inactive',
      context,
    }
  }

  const account = getSelfAccount()
  if (!account?.id?.trim()) {
    const context = createSecurityContext({
      channel: input.channel ?? 'web',
      authentication: { kind: 'none' },
      actor: { kind: 'anonymous' },
      authority: 'demo',
      correlationId: input.correlationId,
      requestId: input.requestId,
    })
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'DEMO session has no account',
      context,
    }
  }

  let ctx = createSecurityContext({
    channel: input.channel ?? 'web',
    authentication: {
      kind: 'session',
      sessionId: 'demo_self_session',
      authenticatedAt: new Date().toISOString(),
    },
    actor: {
      kind: 'account',
      accountId: account.id.trim(),
    },
    authority: 'demo',
    activeMode: input.activeMode ?? 'personal',
    correlationId: input.correlationId,
    requestId: input.requestId,
  })

  const mode = input.activeMode ?? 'personal'

  if (mode === 'organization' || input.claimedOrganizationId) {
    const orgResult = resolveOrganizationContext(
      ctx,
      input.claimedOrganizationId,
      input.orgDeps,
    )
    if (!orgResult.ok) {
      return {
        ok: false,
        reason: 'invalid_organization_context',
        message: orgResult.message,
        context: ctx,
      }
    }
    ctx = withOrganizationContext(ctx, orgResult.organization)
  } else if (mode === 'professional') {
    const proResult = resolveProfessionalContext(ctx, input.proDeps)
    if (!proResult.ok) {
      return {
        ok: false,
        reason: 'invalid_professional_context',
        message: proResult.message,
        context: ctx,
      }
    }
    ctx = withProfessionalContext(ctx, proResult.professional)
  } else {
    ctx = withPersonalMode(ctx)
  }

  return { ok: true, context: ctx }
}

/** Public surface: no session required. */
export function createDemoPublicSecurityContext(options?: {
  correlationId?: string
  requestId?: string
}): SecurityContext {
  return createAnonymousPublicContext(options)
}
