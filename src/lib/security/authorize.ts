/**
 * Central authorization entry point (K47).
 *
 * authenticate → resolve actor → resolve resource → resolve access → authorize
 *
 * Single-path evaluation — no privilege UNION across HH / Pro / Org.
 * Deny by default for unknown combinations.
 */

import {
  isBookingAction,
  isKnownSecurityAction,
  isMessagingAction,
  isPaymentAction,
  isPetDataAction,
  isPublicAction,
  requiresAuthenticatedAccount,
} from './actions'
import { authorizeBooking } from './adapters/booking'
import { authorizeHouseholdPet } from './adapters/household'
import { authorizeMessaging } from './adapters/messaging'
import { actorHasOrgMembershipOnly, authorizeOrganizationPet } from './adapters/organizationPet'
import { decideOwnerPetAccess } from './adapters/ownership'
import { authorizePayment } from './adapters/payment'
import { authorizeProfessionalPet } from './adapters/professional'
import { authorizePublicPet } from './adapters/public'
import { emitAuthorizationAudit } from './auditHook'
import { actorAccountId, isAuthenticatedAccount } from './context'
import { AuthorizationError } from './errors'
import { isForgedActorClaim, resolveActor } from './resolveActor'
import {
  resolveOrganizationContext,
  type ResolveOrganizationContextDeps,
} from './resolveOrganizationContext'
import {
  resolveProfessionalContext,
  type ResolveProfessionalContextDeps,
} from './resolveProfessionalContext'
import {
  resolveResource,
  type AuthorizationResourceStore,
  type ResolvedResource,
} from './resolveResource'
import type {
  AuthorizationDecision,
  AuthorizationRequest,
  SecurityAction,
  SecurityContext,
} from './types'
import type { HouseholdAdapterDeps } from './adapters/household'
import type { ProfessionalAdapterDeps } from './adapters/professional'
import type { OrganizationPetAdapterDeps } from './adapters/organizationPet'
import type { BookingAdapterDeps } from './adapters/booking'
import type { PaymentAdapterDeps } from './adapters/payment'
import { withOrganizationContext, withProfessionalContext } from './context'

export type AuthorizeDeps = {
  store?: AuthorizationResourceStore
  household?: HouseholdAdapterDeps
  professional?: ProfessionalAdapterDeps
  organizationPet?: OrganizationPetAdapterDeps
  booking?: BookingAdapterDeps
  payment?: PaymentAdapterDeps
  orgContext?: ResolveOrganizationContextDeps
  proContext?: ResolveProfessionalContextDeps
  now?: number
}

function deny(
  code: AuthorizationDecision extends { allowed: false } ? AuthorizationDecision['code'] : never,
  reason: string,
  denyClass: AuthorizationDecision extends { allowed: false }
    ? AuthorizationDecision['denyClass']
    : never,
): AuthorizationDecision {
  return { allowed: false, code, reason, denyClass }
}

function finish(
  ctx: SecurityContext,
  request: AuthorizationRequest,
  decision: AuthorizationDecision,
  extras?: { grantId?: string; permission?: string; organizationId?: string; membershipId?: string },
): AuthorizationDecision {
  emitAuthorizationAudit({
    actorAccountId: actorAccountId(ctx),
    actorKind: ctx.actor.kind,
    resourceType: request.resource.type,
    resourceId: request.resource.id,
    organizationId: extras?.organizationId ?? ctx.organization?.organizationId,
    membershipId: extras?.membershipId ?? ctx.organization?.membershipId,
    grantId: decision.allowed ? decision.grantId ?? extras?.grantId : extras?.grantId,
    action: request.action,
    authorizationResult: decision.allowed ? 'allow' : 'deny',
    permission: decision.allowed ? decision.permission ?? extras?.permission : undefined,
    correlationId: ctx.correlationId,
    channel: ctx.channel,
    denyCode: decision.allowed ? undefined : decision.code,
    denyClass: decision.allowed ? undefined : decision.denyClass,
  })
  return decision
}

function selectPetPath(ctx: SecurityContext): 'personal' | 'professional' | 'organization' {
  if (ctx.activeMode === 'organization' && ctx.organization) return 'organization'
  if (ctx.activeMode === 'professional' && ctx.professional) return 'professional'
  return 'personal'
}

function authorizePetResource(
  ctx: SecurityContext,
  action: SecurityAction,
  resource: Extract<ResolvedResource, { type: 'pet' }>,
  request: AuthorizationRequest,
  deps: AuthorizeDeps,
): AuthorizationDecision {
  const accountId = actorAccountId(ctx)
  if (!accountId) {
    return deny('unauthenticated', 'Authentication required', 'unauthenticated')
  }

  // Owner path — full pet authority (not platform admin); checked before facet paths.
  // Exception: when activeMode is organization/professional, owner still wins for their pet
  // (ownership is identity, not a facet). Microchip/PII remain owner-only via decideOwnerPetAccess.
  const ownerDecision = decideOwnerPetAccess(resource.pet, accountId, action)
  if (ownerDecision) {
    // When explicitly in org/pro mode on own pet, still allow owner path (identity stable).
    return ownerDecision
  }

  // Non-owner sensitive boundaries — deny by default (no invented permissions).
  if (action === 'microchip.read' || action === 'ownerContacts.read') {
    return deny(
      'unauthorized',
      `${action} denied by default for non-owners`,
      'deny_by_default',
    )
  }

  const path = selectPetPath(ctx)

  if (path === 'organization') {
    let orgCtx = ctx.organization
    if (!orgCtx) {
      const claimed = request.claimedOrganizationId
      const resolved = resolveOrganizationContext(ctx, claimed, deps.orgContext)
      if (!resolved.ok) {
        return deny('unauthorized', resolved.message, 'cross_organization')
      }
      orgCtx = resolved.organization
    }
    // Cross-org: if claim present and differs from validated facet → DENY
    if (
      request.claimedOrganizationId?.trim() &&
      request.claimedOrganizationId.trim() !== orgCtx.organizationId
    ) {
      return deny(
        'unauthorized',
        'Cross-organization tampering rejected',
        'cross_organization',
      )
    }
    return authorizeOrganizationPet(
      resource.pet.id,
      accountId,
      orgCtx,
      action,
      request.claimedOrganizationId,
      {
        ...deps.organizationPet,
        now: deps.now ?? deps.organizationPet?.now,
      },
    )
  }

  if (path === 'professional') {
    let proId = ctx.professional?.professionalProfileId
    if (!proId) {
      const resolved = resolveProfessionalContext(ctx, deps.proContext)
      if (!resolved.ok) {
        return deny('unauthorized', resolved.message, 'forbidden')
      }
      proId = resolved.professional.professionalProfileId
    }
    return authorizeProfessionalPet(resource.pet.id, proId, action, {
      ...deps.professional,
      now: deps.now ?? deps.professional?.now,
    })
  }

  // personal / household path only — no UNION with pro/org
  return authorizeHouseholdPet(resource.pet, accountId, action, {
    ...deps.household,
    now: deps.now ?? deps.household?.now,
  })
}

/**
 * Single central authorization entry point.
 */
export function authorize(
  ctx: SecurityContext,
  request: AuthorizationRequest,
  deps: AuthorizeDeps = {},
): AuthorizationDecision {
  // Forged actor claim — never accept payload identity as authority.
  if (isForgedActorClaim(ctx, request.claimedActorAccountId)) {
    return finish(
      ctx,
      request,
      deny(
        'unauthorized',
        'Client-claimed actorAccountId is not trusted',
        'forged_identity',
      ),
    )
  }

  if (!isKnownSecurityAction(request.action)) {
    return finish(
      ctx,
      request,
      deny('unauthorized', `Unknown action: ${request.action}`, 'unknown_action'),
    )
  }

  const action = request.action

  // Public path — anonymous + explicit public action only.
  if (isPublicAction(action) || request.resource.type === 'public_pet') {
    if (action !== 'public.pet.project') {
      return finish(
        ctx,
        request,
        deny('unauthorized', 'Public resource requires public.pet.project', 'deny_by_default'),
      )
    }
    const resolved = resolveResource(
      { type: 'public_pet', id: request.resource.id },
      deps.store,
    )
    if (!resolved.ok) {
      return finish(ctx, request, deny('not_found', resolved.message, 'not_found'))
    }
    const decision = authorizePublicPet(ctx, action)
    return finish(ctx, request, decision)
  }

  if (requiresAuthenticatedAccount(action) && !isAuthenticatedAccount(ctx)) {
    // System/provider actors are typed contracts — not authorized for pet health in K47.
    if (ctx.actor.kind === 'system' || ctx.actor.kind === 'provider') {
      return finish(
        ctx,
        request,
        deny(
          'unauthorized',
          'System/provider actors are not authorized for this action in K47',
          'deny_by_default',
        ),
      )
    }
    return finish(
      ctx,
      request,
      deny('unauthenticated', 'Authentication required', 'unauthenticated'),
    )
  }

  void resolveActor(ctx)

  // Organization membership probe — membership ≠ pet access.
  if (action === 'organization.ops' && request.resource.type === 'organization') {
    const accountId = actorAccountId(ctx)
    if (!accountId) {
      return finish(
        ctx,
        request,
        deny('unauthenticated', 'Authentication required', 'unauthenticated'),
      )
    }
    const resolved = resolveResource(request.resource, deps.store)
    if (!resolved.ok) {
      return finish(ctx, request, deny('not_found', resolved.message, 'not_found'))
    }
    const hasMembership = actorHasOrgMembershipOnly(
      request.resource.id,
      accountId,
      deps.organizationPet,
    )
    if (!hasMembership) {
      return finish(
        ctx,
        request,
        deny('unauthorized', 'Not an organization member', 'forbidden'),
      )
    }
    return finish(ctx, request, {
      allowed: true,
      reason: 'organization',
      path: 'organization',
    })
  }

  const resolved = resolveResource(request.resource, deps.store, {
    viewerAccountId: actorAccountId(ctx),
  })
  if (!resolved.ok) {
    return finish(ctx, request, deny('not_found', resolved.message, 'not_found'))
  }

  const resource = resolved.resource

  // Booking isolation
  if (isBookingAction(action) || resource.type === 'booking') {
    if (resource.type !== 'booking') {
      return finish(
        ctx,
        request,
        deny('unauthorized', 'Booking action requires booking resource', 'deny_by_default'),
      )
    }
    // Health actions on booking resource → isolation deny
    if (isPetDataAction(action) && !isBookingAction(action)) {
      return finish(
        ctx,
        request,
        deny(
          'unauthorized',
          'Booking resource does not grant pet health access',
          'isolation',
        ),
      )
    }
    const decision = authorizeBooking(ctx, resource.booking, action, deps.booking)
    return finish(ctx, request, decision)
  }

  // Payment isolation
  if (isPaymentAction(action) || resource.type === 'payment') {
    if (resource.type !== 'payment') {
      return finish(
        ctx,
        request,
        deny('unauthorized', 'Payment action requires payment resource', 'deny_by_default'),
      )
    }
    if (isPetDataAction(action) && !isPaymentAction(action)) {
      return finish(
        ctx,
        request,
        deny(
          'unauthorized',
          'Payment resource does not grant pet health access',
          'isolation',
        ),
      )
    }
    const decision = authorizePayment(ctx, resource.payment, action, deps.payment)
    return finish(ctx, request, decision)
  }

  // Messaging isolation
  if (isMessagingAction(action) || resource.type === 'conversation') {
    if (resource.type !== 'conversation') {
      return finish(
        ctx,
        request,
        deny(
          'unauthorized',
          'Messaging action requires conversation resource',
          'deny_by_default',
        ),
      )
    }
    const decision = authorizeMessaging(ctx, resource.conversation, action)
    return finish(ctx, request, decision)
  }

  // Pet data paths
  if (resource.type === 'pet' && isPetDataAction(action)) {
    const decision = authorizePetResource(ctx, action, resource, request, deps)
    return finish(ctx, request, decision, {
      organizationId: ctx.organization?.organizationId,
      membershipId: ctx.organization?.membershipId,
    })
  }

  // Prove: org membership action on pet without OrgPetAccess stays denied via pet path
  if (resource.type === 'pet' && action === 'organization.ops') {
    return finish(
      ctx,
      request,
      deny(
        'unauthorized',
        'Organization membership does not grant pet access',
        'isolation',
      ),
    )
  }

  return finish(
    ctx,
    request,
    deny(
      'unauthorized',
      `Deny by default: unsupported action/resource (${action} / ${resource.type})`,
      'deny_by_default',
    ),
  )
}

/**
 * Guard helper — throws AuthorizationError on deny.
 */
export function assertAuthorized(
  ctx: SecurityContext,
  request: AuthorizationRequest,
  deps: AuthorizeDeps = {},
): void {
  const decision = authorize(ctx, request, deps)
  if (decision.allowed) return
  throw new AuthorizationError(decision.code, decision.reason, decision.denyClass)
}

/**
 * Attach validated org/pro facets after membership/profile checks (context switch).
 */
export function switchToOrganizationMode(
  ctx: SecurityContext,
  claimedOrganizationId: string,
  deps: ResolveOrganizationContextDeps = {},
): { ok: true; context: SecurityContext } | { ok: false; message: string } {
  const resolved = resolveOrganizationContext(ctx, claimedOrganizationId, deps)
  if (!resolved.ok) return resolved
  return { ok: true, context: withOrganizationContext(ctx, resolved.organization) }
}

export function switchToProfessionalMode(
  ctx: SecurityContext,
  deps: ResolveProfessionalContextDeps = {},
): { ok: true; context: SecurityContext } | { ok: false; message: string } {
  const resolved = resolveProfessionalContext(ctx, deps)
  if (!resolved.ok) return { ok: false, message: resolved.message }
  return { ok: true, context: withProfessionalContext(ctx, resolved.professional) }
}
