/**
 * Authorization audit emit hook.
 * K48 wires AuditSink via configureAuthorizationAudit() — default remains no-op.
 * Audit must never break authorization.
 */

import type { AuthorizationAuditPayload } from './types'

export type AuthorizationAuditObserver = (payload: AuthorizationAuditPayload) => void

let observer: AuthorizationAuditObserver | null = null

/** Register audit ingest observer (DemoAuditSink / ServerAuditSink). Default is no-op. */
export function setAuthorizationAuditObserver(
  next: AuthorizationAuditObserver | null,
): void {
  observer = next
}

export function emitAuthorizationAudit(payload: AuthorizationAuditPayload): void {
  if (!observer) return
  try {
    observer(payload)
  } catch {
    // Audit must never break authorization.
  }
}
