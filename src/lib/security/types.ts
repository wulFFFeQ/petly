/**
 * K47 — SecurityContext + authorization Decision contracts.
 * Server-ready glue over existing domain boundaries (HH / Pro / OrgPet).
 * Does NOT invent a unified PetAccess or permission catalog.
 */

import type { OrganizationRole } from '../../types/organization'

/** DEMO localStorage is never production authority. */
export type SecurityAuthority = 'demo' | 'server'

export type SecurityChannel = 'web' | 'mobile' | 'worker' | 'webhook' | 'public'

export type AuthenticationKind = 'session' | 'none' | 'system' | 'provider'

export type ActorKind = 'account' | 'anonymous' | 'system' | 'provider'

export type ActiveMode = 'personal' | 'professional' | 'organization'

export type SecurityAuthentication = {
  kind: AuthenticationKind
  sessionId?: string
  authenticatedAt?: string
}

export type SecurityActor = {
  kind: ActorKind
  /** Human account when kind === 'account'. Never taken from client payload as authority. */
  accountId?: string
  /** Future system job name (not implemented in K47 runtime). */
  systemJob?: string
  /** Future payment provider id (not authenticated in K47). */
  providerId?: string
}

export type ValidatedOrganizationContext = {
  organizationId: string
  membershipId: string
  role: OrganizationRole
}

export type ValidatedProfessionalContext = {
  professionalProfileId: string
}

/**
 * Trusted request-scoped security boundary.
 * Client must not supply actorAccountId / role / permissions as authority.
 */
export type SecurityContext = {
  correlationId: string
  requestId: string
  channel: SecurityChannel
  authentication: SecurityAuthentication
  actor: SecurityActor
  organization?: ValidatedOrganizationContext
  professional?: ValidatedProfessionalContext
  activeMode?: ActiveMode
  /**
   * 'demo' = DEMO session/localStorage adapter (not production security).
   * 'server' = reserved for future HTTP/session backend.
   */
  authority: SecurityAuthority
}

export type ResourceType =
  | 'pet'
  | 'organization'
  | 'booking'
  | 'payment'
  | 'conversation'
  | 'professional_profile'
  | 'public_pet'

export type ResourceRef = {
  type: ResourceType
  id: string
}

/**
 * Logical actions mapped onto existing domain permission vocabs in adapters.
 * Not a new permission catalog — capability names for the authorize() API.
 */
export type SecurityAction =
  | 'health.read'
  | 'health.write'
  | 'medication.read'
  | 'medication.write'
  | 'documents.read'
  | 'documents.write'
  | 'labs.read'
  | 'labs.write'
  | 'vaccination.read'
  | 'vaccination.write'
  | 'microchip.read'
  | 'ownerContacts.read'
  | 'pet.profile.read'
  | 'pet.profile.write'
  /** K55/K56 — clinician responsibility; never owner/co-owner. */
  | 'clinical.finalize'
  | 'clinical.sign'
  | 'clinical.withdraw'
  | 'clinical.admin'
  | 'clinical.export'
  | 'clinical.emergency.write'
  | 'booking.read'
  | 'booking.confirm'
  | 'booking.cancel'
  | 'payment.read'
  | 'payment.checkout'
  | 'messaging.read'
  | 'messaging.send'
  | 'public.pet.project'
  | 'organization.ops'
  | 'organization.pet.access'

export type AuthorizationAllowReason =
  | 'owner'
  | 'household'
  | 'professional'
  | 'organization'
  | 'booking'
  | 'payment'
  | 'messaging'
  | 'public'

export type AuthorizationDenyCode = 'unauthenticated' | 'unauthorized' | 'not_found'

export type AuthorizationDenyClass =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'unknown_action'
  | 'unknown_permission'
  | 'revoked'
  | 'expired'
  | 'missing_grant'
  | 'cross_organization'
  | 'forged_identity'
  | 'isolation'
  | 'deny_by_default'

export type AuthorizationDecision =
  | {
      allowed: true
      reason: AuthorizationAllowReason
      grantId?: string
      permission?: string
      path: AuthorizationAllowReason
    }
  | {
      allowed: false
      code: AuthorizationDenyCode
      reason: string
      denyClass: AuthorizationDenyClass
    }

export type AuthorizationRequest = {
  action: SecurityAction | string
  resource: ResourceRef
  /**
   * Client-claimed organizationId — UNTRUSTED.
   * Must be validated against membership + grant scope.
   */
  claimedOrganizationId?: string
  /**
   * Client-claimed actor — IGNORED as authority.
   * Present only so tests can prove forgery is rejected.
   */
  claimedActorAccountId?: string
}

/**
 * Trusted fields emitted after every authorize() decision (K48 ingest).
 * Must be built from SecurityContext + decision — never from client claims.
 */
export type AuthorizationAuditPayload = {
  actorAccountId?: string
  actorKind: ActorKind
  resourceType: ResourceType | string
  resourceId: string
  organizationId?: string
  professionalId?: string
  membershipId?: string
  grantId?: string
  grantType?: string
  action: string
  authorizationResult: 'allow' | 'deny'
  permission?: string
  allowPath?: AuthorizationAllowReason
  correlationId: string
  channel: SecurityChannel
  authority: SecurityAuthority
  denyCode?: AuthorizationDenyCode
  denyClass?: AuthorizationDenyClass
  /**
   * K57 — optional scrub-safe metadata (e.g. previousVersion / newVersion integers).
   * Never clinical payloads / PII.
   */
  metadata?: Record<string, unknown>
}
