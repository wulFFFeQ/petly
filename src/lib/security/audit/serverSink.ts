/**
 * ServerAuditSink — production K48 sink.
 * Unwired: no-op (never fake persistence).
 * Wired: in-process buffer for client authorize() decisions.
 * Node API writes `audit_events` for server mutations (authoritative).
 * Audit failure must never flip authorization ALLOW.
 */

import { isProductionBackendConfigured } from '../../backend/config'
import type { AuditEvent } from './types'
import type { AuditSink } from './sink'

export class ServerAuditSinkStub implements AuditSink {
  readonly wired = false as const

  record(_event: AuditEvent): void {
    // Intentionally empty — no fake server persistence.
  }
}

export function createServerAuditSinkStub(): ServerAuditSinkStub {
  return new ServerAuditSinkStub()
}

export type ServerAuditSinkOptions = {
  forceWired?: boolean
}

export class ServerAuditSink implements AuditSink {
  readonly wired: boolean
  private readonly buffer: AuditEvent[] = []

  constructor(options: ServerAuditSinkOptions = {}) {
    this.wired = Boolean(options.forceWired || isProductionBackendConfigured())
  }

  record(event: AuditEvent): void {
    if (!this.wired) return
    try {
      this.buffer.push({
        ...event,
        authority: 'server',
      })
    } catch {
      /* swallow — audit failure must not change authz */
    }
  }

  /** Test helper */
  drainForTests(): AuditEvent[] {
    const copy = this.buffer.slice()
    this.buffer.length = 0
    return copy
  }
}

export function createServerAuditSink(
  options: ServerAuditSinkOptions = {},
): ServerAuditSink {
  return new ServerAuditSink(options)
}
