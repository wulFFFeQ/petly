/**
 * LAUNCH 02 — production backend feature gate.
 *
 * Missing public Supabase env ⇒ DEMO path.
 * Never invent a fake backend. Never put service_role behind VITE_.
 */

export const PRODUCTION_CONNECTION_NOT_CONFIGURED =
  'PRODUCTION CONNECTION NOT CONFIGURED' as const

export type BackendEnvironmentStatus =
  | typeof PRODUCTION_CONNECTION_NOT_CONFIGURED
  | 'configured_client'
  | 'configured_server'

function readVite(name: string): string | undefined {
  try {
    const env = import.meta.env as Record<string, string | undefined>
    const value = env[name]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  } catch {
    return undefined
  }
}

/** Public client keys only — never service_role. */
export function getSupabasePublicConfig(): {
  url: string
  anonKey: string
} | null {
  const url = readVite('VITE_SUPABASE_URL')
  const anonKey = readVite('VITE_SUPABASE_ANON_KEY')
  if (!url || !anonKey) return null
  return { url, anonKey }
}

/**
 * True when browser may use Supabase Auth + call Edge Functions with user JWT.
 * Does NOT mean service_role is available (that is server-only).
 */
export function isProductionBackendConfigured(): boolean {
  return getSupabasePublicConfig() !== null
}

export function getBackendEnvironmentStatus(): BackendEnvironmentStatus {
  return isProductionBackendConfigured()
    ? 'configured_client'
    : PRODUCTION_CONNECTION_NOT_CONFIGURED
}

/** Explicit status string for reports / UI honesty. */
export function getProductionConnectionStatus(): string {
  return getBackendEnvironmentStatus() === PRODUCTION_CONNECTION_NOT_CONFIGURED
    ? PRODUCTION_CONNECTION_NOT_CONFIGURED
    : 'CLIENT CONFIGURED — verify server secrets in Edge Function runtime'
}
