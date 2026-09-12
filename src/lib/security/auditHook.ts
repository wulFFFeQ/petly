/**
 * Audit extension point for K48 — no storage, no event model, no UI.
 */

import type { AuthorizationAuditPayload } from './types'

export type AuthorizationAuditObserver = (payload: AuthorizationAuditPayload) => void

let observer: AuthorizationAuditObserver | null = null

/** Register a future audit ingest observer (K48). Default is no-op. */
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
