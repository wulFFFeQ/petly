/**
 * LAUNCH 03 — DEMO vs REAL backend mode.
 * Production configured ⇒ REAL primary; never silent DEMO fallback.
 */

import { isProductionBackendConfigured } from './config'

/** Explicit DEMO path — only when public Supabase env is unset. */
export function isDemoBackendMode(): boolean {
  return !isProductionBackendConfigured()
}

/** Real Auth + Edge + Postgres path. */
export function isRealBackendMode(): boolean {
  return isProductionBackendConfigured()
}

/**
 * DEMO one-click / owner_self allowed only when production backend is NOT configured.
 * Explicit DEMO label in UI. Never available alongside real Supabase Auth.
 * GitHub Pages / preview builds may be Vite PROD without credentials — DEMO remains explicit.
 */
export function isDemoLoginAllowed(): boolean {
  return isDemoBackendMode()
}

/** Sensitive domain must not write production state to localStorage. */
export function shouldPersistSensitiveLocalStorage(): boolean {
  return isDemoBackendMode()
}
