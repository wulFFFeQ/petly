/**
 * AuditSink — append-only ingest abstraction.
 * Future: DemoAuditSink → ServerAuditSink without changing domain models.
 */

import type { AuditEvent } from './types'

export interface AuditSink {
  /** Append one authorization-decision audit event. Must not throw into authz path. */
  record(event: AuditEvent): void | Promise<void>
}
