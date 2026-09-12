/**
 * Build AuditEvent from trusted AuthorizationAuditPayload.
 * Never accepts client-controlled result / actor / org / timestamp as authority.
 */

import type { ActorKind, AuthorizationAuditPayload, SecurityAuthority } from '../types'
import { auditReasonFromDenyClass } from './reasonCodes'
import { scrubAuditMetadata } from './scrub'
import type { AuditActorType, AuditEvent, AuditResourceType } from './types'

function randomAuditId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `aud_${Date.now().toString(36)}_${rand}`
}

export function mapActorKindToAuditActorType(kind: ActorKind): AuditActorType {
  switch (kind) {
    case 'account':
      return 'human'
    case 'anonymous':
      return 'anonymous'
    case 'system':
      return 'system'
    case 'provider':
      return 'provider'
    default:
      return 'anonymous'
  }
}

/**
 * Normalize resource type for audit display (deterministic, no class names).
 * Keeps K47 resource types; does not invent new access models.
 */
export function normalizeAuditResourceType(
  resourceType: string,
  action: string,
): AuditResourceType {
  if (resourceType === 'pet' && action.startsWith('health.')) return 'pet'
  if (resourceType === 'pet' && action.startsWith('documents.')) return 'pet'
  return resourceType
}

export type MapAuditEventOptions = {
  /** Override clock for tests — still treated as trusted emit time. */
  now?: () => Date
  /** Extra metadata (will be scrubbed). */
  metadata?: Record<string, unknown>
}

/**
 * Map authorization decision payload → AuditEvent.
 * Payload fields must already come from SecurityContext + authorize() — not client claims.
 */
export function mapAuthorizationPayloadToAuditEvent(
  payload: AuthorizationAuditPayload,
  options?: MapAuditEventOptions,
): AuditEvent {
  const actorType = mapActorKindToAuditActorType(payload.actorKind)
  const authority: SecurityAuthority = payload.authority ?? 'demo'
  const timestamp = (options?.now?.() ?? new Date()).toISOString()

  const event: AuditEvent = {
    id: randomAuditId(),
    timestamp,
    kind: 'authorization_decision',
    actorType,
    resourceType: normalizeAuditResourceType(String(payload.resourceType), payload.action),
    resourceId: payload.resourceId,
    action: payload.action,
    result: payload.authorizationResult,
    correlationId: payload.correlationId,
    source: payload.channel,
    authority,
  }

  // Anonymous must never carry a fake account id
  if (actorType !== 'anonymous' && payload.actorAccountId) {
    event.actorAccountId = payload.actorAccountId
  }

  if (payload.organizationId) event.organizationId = payload.organizationId
  if (payload.professionalId) event.professionalId = payload.professionalId
  if (payload.membershipId) event.membershipId = payload.membershipId
  if (payload.grantId) event.grantId = payload.grantId
  if (payload.grantType) event.grantType = payload.grantType
  if (payload.permission) event.permission = payload.permission
  if (payload.allowPath) event.allowPath = payload.allowPath

  if (payload.authorizationResult === 'deny') {
    event.denyCode = payload.denyCode
    event.denyClass = payload.denyClass
    event.reasonCode = auditReasonFromDenyClass(payload.denyClass)
  }

  const scrubbed = scrubAuditMetadata(options?.metadata)
  if (scrubbed) event.metadata = scrubbed

  return event
}
