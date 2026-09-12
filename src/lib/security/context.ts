/**
 * SecurityContext builders.
 * System/provider constructors exist as typed contracts only — DEMO path cannot forge them.
 */

import type { OrganizationRole } from '../../types/organization'
import type {
  ActiveMode,
  SecurityActor,
  SecurityAuthentication,
  SecurityAuthority,
  SecurityChannel,
  SecurityContext,
  ValidatedOrganizationContext,
  ValidatedProfessionalContext,
} from './types'

function randomId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export type CreateSecurityContextInput = {
  channel?: SecurityChannel
  authentication: SecurityAuthentication
  actor: SecurityActor
  authority: SecurityAuthority
  organization?: ValidatedOrganizationContext
  professional?: ValidatedProfessionalContext
  activeMode?: ActiveMode
  correlationId?: string
  requestId?: string
}

export function createSecurityContext(input: CreateSecurityContextInput): SecurityContext {
  return {
    correlationId: input.correlationId ?? randomId('corr'),
    requestId: input.requestId ?? randomId('req'),
    channel: input.channel ?? 'web',
    authentication: { ...input.authentication },
    actor: { ...input.actor },
    organization: input.organization ? { ...input.organization } : undefined,
    professional: input.professional ? { ...input.professional } : undefined,
    activeMode: input.activeMode,
    authority: input.authority,
  }
}

/** Anonymous public request — no session, no account. */
export function createAnonymousPublicContext(
  options?: { correlationId?: string; requestId?: string },
): SecurityContext {
  return createSecurityContext({
    channel: 'public',
    authentication: { kind: 'none' },
    actor: { kind: 'anonymous' },
    authority: 'demo',
    activeMode: 'personal',
    correlationId: options?.correlationId,
    requestId: options?.requestId,
  })
}

/**
 * Future system actor contract — NOT wired to DEMO client path.
 * Callers must not expose this from untrusted client input.
 */
export function createSystemActorContext(input: {
  systemJob: string
  channel?: SecurityChannel
  authority?: SecurityAuthority
}): SecurityContext {
  return createSecurityContext({
    channel: input.channel ?? 'worker',
    authentication: { kind: 'system' },
    actor: { kind: 'system', systemJob: input.systemJob },
    authority: input.authority ?? 'server',
  })
}

/**
 * Future payment provider/webhook actor — NOT authenticated in K47.
 * Must never be constructed from client-claimed payloads in DEMO adapters.
 */
export function createProviderActorContext(input: {
  providerId: string
  channel?: SecurityChannel
  authority?: SecurityAuthority
}): SecurityContext {
  return createSecurityContext({
    channel: input.channel ?? 'webhook',
    authentication: { kind: 'provider' },
    actor: { kind: 'provider', providerId: input.providerId },
    authority: input.authority ?? 'server',
  })
}

export function withOrganizationContext(
  ctx: SecurityContext,
  organization: ValidatedOrganizationContext,
): SecurityContext {
  return {
    ...ctx,
    organization: { ...organization },
    activeMode: 'organization',
  }
}

export function withProfessionalContext(
  ctx: SecurityContext,
  professional: ValidatedProfessionalContext,
): SecurityContext {
  return {
    ...ctx,
    professional: { ...professional },
    activeMode: 'professional',
  }
}

export function withPersonalMode(ctx: SecurityContext): SecurityContext {
  return {
    ...ctx,
    activeMode: 'personal',
    organization: undefined,
  }
}

export function actorAccountId(ctx: SecurityContext): string | undefined {
  if (ctx.actor.kind !== 'account') return undefined
  const id = ctx.actor.accountId?.trim()
  return id || undefined
}

export function isAuthenticatedAccount(ctx: SecurityContext): boolean {
  return (
    ctx.authentication.kind === 'session' &&
    ctx.actor.kind === 'account' &&
    Boolean(actorAccountId(ctx))
  )
}

/** Helper for tests / adapters — build validated org facet after membership check. */
export function validatedOrg(
  organizationId: string,
  membershipId: string,
  role: OrganizationRole,
): ValidatedOrganizationContext {
  return { organizationId, membershipId, role }
}
