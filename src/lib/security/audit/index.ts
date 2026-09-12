/**
 * K48 — Security audit trail runtime.
 * Extends K47 emitAuthorizationAudit — does not create a parallel authz engine.
 */

export type {
  AuditActorType,
  AuditEvent,
  AuditQueryFilter,
  AuditReasonCode,
  AuditResourceType,
  AuditResult,
  AuditRetentionPolicy,
} from './types'

export { auditReasonFromDenyClass } from './reasonCodes'
export {
  scrubAuditMetadata,
  auditEventContainsForbiddenContent,
} from './scrub'
export {
  mapAuthorizationPayloadToAuditEvent,
  mapActorKindToAuditActorType,
  normalizeAuditResourceType,
  type MapAuditEventOptions,
} from './mapFromDecision'
export type { AuditSink } from './sink'
export {
  DemoAuditSink,
  createDemoAuditSink,
  DEMO_AUDIT_STORAGE_KEY,
  type DemoAuditSinkOptions,
} from './demoSink'
export {
  ServerAuditSink,
  ServerAuditSinkStub,
  createServerAuditSink,
  createServerAuditSinkStub,
  type ServerAuditSinkOptions,
} from './serverSink'
export {
  filterAuditEvents,
  queryDemoAuditEvents,
  assertOrganizationAuditIsolation,
  type DemoAuditQueryOptions,
} from './query'
export {
  planRetention,
  DEFAULT_AUTHORIZATION_RETENTION,
} from './retention'
export {
  configureAuthorizationAudit,
  getActiveAuditSink,
  type ConfigureAuthorizationAuditOptions,
} from './configure'
