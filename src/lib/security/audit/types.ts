/**
 * K48 — Audit event contract (server-ready).
 * Authorization decision audit only — not clinical ledger, not execution success.
 */

import type {
  AuthorizationAllowReason,
  AuthorizationDenyClass,
  AuthorizationDenyCode,
  SecurityAuthority,
  SecurityChannel,
} from '../types'

/** Human / system / provider / anonymous — not a permission role. */
export type AuditActorType = 'human' | 'system' | 'provider' | 'anonymous'

/** Authorization decision result — never client-controlled. */
export type AuditResult = 'allow' | 'deny'

/**
 * Structured deny reasons — aliases over K47 AuthorizationDenyClass.
 * Not a second deny engine.
 */
export type AuditReasonCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'NO_OWNERSHIP'
  | 'NO_ACCESS'
  | 'NO_PERMISSION'
  | 'REVOKED_ACCESS'
  | 'EXPIRED_ACCESS'
  | 'ORG_SCOPE_MISMATCH'
  | 'INVALID_CONTEXT'
  | 'UNKNOWN_ACTION'

/**
 * Deterministic resource types for audit (no raw class names).
 * Extends K47 ResourceType with audit-oriented aliases where useful.
 */
export type AuditResourceType =
  | 'pet'
  | 'health_record'
  | 'document'
  | 'organization'
  | 'organization_pet_access'
  | 'professional_profile'
  | 'booking'
  | 'payment'
  | 'conversation'
  | 'public_pet'
  | string

/**
 * Authorization-decision audit event.
 * kind makes clear this is NOT "mutation succeeded".
 */
export type AuditEvent = {
  id: string
  /** ISO 8601 UTC — trusted emit time, never client clock. */
  timestamp: string
  kind: 'authorization_decision'
  actorAccountId?: string
  actorType: AuditActorType
  resourceType: AuditResourceType
  resourceId: string
  action: string
  result: AuditResult
  reasonCode?: AuditReasonCode
  /** API-level deny code from K47 when deny. */
  denyCode?: AuthorizationDenyCode
  /** Fine-grained deny class from K47 when deny. */
  denyClass?: AuthorizationDenyClass
  organizationId?: string
  professionalId?: string
  membershipId?: string
  grantId?: string
  grantType?: string
  permission?: string
  /** ALLOW path when allow (owner | household | …). */
  allowPath?: AuthorizationAllowReason
  correlationId: string
  source: SecurityChannel
  authority: SecurityAuthority
  /** Scrubbed only — never passwords, PII, clinical, payment secrets. */
  metadata?: Record<string, unknown>
}

export type AuditQueryFilter = {
  actorAccountId?: string
  organizationId?: string
  resourceType?: string
  resourceId?: string
  action?: string
  result?: AuditResult
  correlationId?: string
  fromTimestamp?: string
  toTimestamp?: string
}

/**
 * Retention policy contract for future server governance.
 * K48 does not delete audit events.
 */
export type AuditRetentionPolicy = {
  /** Logical stream name (e.g. authorization_decision). */
  stream: 'authorization_decision'
  /** Future retention days — undefined = undecided. */
  retainDays?: number
  /** Future legal hold flag. */
  legalHold?: boolean
}
