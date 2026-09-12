/**
 * Wire AuditSink into K47 emitAuthorizationAudit observer.
 * Audit failures never affect authorization (hook already swallows; sink also try/catch).
 */

import { setAuthorizationAuditObserver } from '../auditHook'
import type { AuthorizationAuditPayload } from '../types'
import { mapAuthorizationPayloadToAuditEvent } from './mapFromDecision'
import type { AuditSink } from './sink'
import type { AuditEvent } from './types'

let activeSink: AuditSink | null = null

export type ConfigureAuthorizationAuditOptions = {
  /** Optional transform after map (tests). */
  onEvent?: (event: AuditEvent) => void
}

/**
 * Register sink as the authorization audit observer.
 * Pass null to clear (restore no-op observer).
 */
export function configureAuthorizationAudit(
  sink: AuditSink | null,
  options?: ConfigureAuthorizationAuditOptions,
): void {
  activeSink = sink
  if (!sink) {
    setAuthorizationAuditObserver(null)
    return
  }

  setAuthorizationAuditObserver((payload: AuthorizationAuditPayload) => {
    try {
      const event = mapAuthorizationPayloadToAuditEvent(payload, {
        metadata: payload.metadata,
      })
      options?.onEvent?.(event)
      sink.record(event)
    } catch {
      // Audit must never break authorization.
    }
  })
}

export function getActiveAuditSink(): AuditSink | null {
  return activeSink
}
