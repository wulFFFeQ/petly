/**
 * ServerAuditSink — typed stub for future backend persistence.
 *
 * K48: NOT wired. No fake server DB. No pretend persistence.
 * Future server must provide append-only, trusted timestamp, tenant isolation.
 */

import type { AuditEvent } from './types'
import type { AuditSink } from './sink'

/**
 * Stub sink — records nowhere.
 * Calling record is a no-op so DEMO can swap sinks without inventing server storage.
 */
export class ServerAuditSinkStub implements AuditSink {
  readonly wired = false as const

  record(_event: AuditEvent): void {
    // Intentionally empty — no fake server persistence in K48.
  }
}

export function createServerAuditSinkStub(): ServerAuditSinkStub {
  return new ServerAuditSinkStub()
}
