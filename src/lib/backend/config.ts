/**
 * Production backend feature gate — Node API (not Supabase).
 *
 * Missing VITE_API_BASE_URL ⇒ DEMO path.
 * Never invent a fake backend. Never put server secrets behind VITE_.
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

/** Public API base URL only — never DATABASE_URL / SESSION_SECRET. */
export function getApiPublicConfig(): { baseUrl: string } | null {
  const baseUrl = readVite('VITE_API_BASE_URL')
  if (!baseUrl) return null
  return { baseUrl: baseUrl.replace(/\/$/, '') }
}

/** @deprecated Use getApiPublicConfig — kept name for gradual call-site migration. */
export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const api = getApiPublicConfig()
  if (!api) return null
  return { url: api.baseUrl, anonKey: '' }
}

/**
 * True when browser may call the Node API with cookie sessions.
 */
export function isProductionBackendConfigured(): boolean {
  return getApiPublicConfig() !== null
}

export function getBackendEnvironmentStatus(): BackendEnvironmentStatus {
  return isProductionBackendConfigured()
    ? 'configured_client'
    : PRODUCTION_CONNECTION_NOT_CONFIGURED
}

export function getProductionConnectionStatus(): string {
  return getBackendEnvironmentStatus() === PRODUCTION_CONNECTION_NOT_CONFIGURED
    ? PRODUCTION_CONNECTION_NOT_CONFIGURED
    : 'CLIENT CONFIGURED — verify server DATABASE_URL + SESSION_SECRET'
}
