/**
 * Thin client for the Node API (cookie sessions).
 * credentials: 'include' — never send server secrets from the browser.
 */

import { getApiPublicConfig, isProductionBackendConfigured } from '../backend/config'

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; status?: number }

export async function invokeApi<T>(
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
  const config = getApiPublicConfig()
  if (!config) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'PRODUCTION CONNECTION NOT CONFIGURED',
      status: 503,
    }
  }

  const url = `${config.baseUrl}/api/${name}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    let json: Record<string, unknown> = {}
    try {
      json = (await res.json()) as Record<string, unknown>
    } catch {
      json = {}
    }
    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        code: String(json.code ?? 'http_error'),
        message: String(json.message ?? res.statusText ?? 'Request failed'),
        status: res.status,
      }
    }
    return { ok: true, data: json as T }
  } catch (err) {
    return {
      ok: false,
      code: 'network_error',
      message: err instanceof Error ? err.message : 'Network error',
      status: 0,
    }
  }
}

/** @deprecated Use invokeApi */
export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<ApiResult<T>> {
  return invokeApi(name, body)
}
