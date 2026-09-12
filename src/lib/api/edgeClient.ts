/**
 * Thin client for Supabase Edge Functions.
 * Uses user JWT — never service_role.
 */

import { getSupabasePublicConfig, isProductionBackendConfigured } from '../backend/config'
import { getAuthSession } from '../auth/supabaseAuth'

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status?: number }

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<ApiResult<T>> {
  if (!isProductionBackendConfigured()) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'PRODUCTION CONNECTION NOT CONFIGURED',
      status: 503,
    }
  }
  const config = getSupabasePublicConfig()
  if (!config) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'PRODUCTION CONNECTION NOT CONFIGURED',
      status: 503,
    }
  }

  const session = await getAuthSession()
  if (!session?.access_token) {
    return { ok: false, code: 'unauthenticated', message: 'Not signed in', status: 401 }
  }

  const url = `${config.url.replace(/\/$/, '')}/functions/v1/${name}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        code: String(json.code ?? 'error'),
        message: String(json.message ?? res.statusText),
        status: res.status,
      }
    }
    return { ok: true, data: json as T }
  } catch (err) {
    return {
      ok: false,
      code: 'network_error',
      message: err instanceof Error ? err.message : 'network_error',
    }
  }
}
