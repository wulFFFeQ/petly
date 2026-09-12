/**
 * Shared Edge helpers — CORS, JSON, JWT actor extraction.
 * Service role is read only from Deno.env (never client).
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Restrictive CORS — never wildcard for authenticated API. */
export function corsHeaders(req?: Request): Record<string, string> {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const origin = req?.headers.get('Origin')?.trim() ?? ''
  const allowOrigin =
    origin && allowed.includes(origin) ? origin : allowed[0] ?? 'http://localhost:5173'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-correlation-id, x-idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

let boundCors: Record<string, string> | null = null

/** Bind per-request CORS at the start of each Edge handler. */
export function bindRequestCors(req: Request): Record<string, string> {
  boundCors = corsHeaders(req)
  return boundCors
}

function activeCors(): Record<string, string> {
  return boundCors ?? corsHeaders()
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...activeCors(), 'Content-Type': 'application/json' },
  })
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): Response {
  return jsonResponse({ ok: false, code, message, ...extra }, status)
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('PRODUCTION CONNECTION NOT CONFIGURED')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Trusted actor from Authorization Bearer JWT — never from body. */
export async function requireActorAccountId(req: Request): Promise<
  | { ok: true; accountId: string; accessToken: string }
  | { ok: false; response: Response }
> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: errorResponse('unauthenticated', 'Missing bearer token', 401),
    }
  }
  const accessToken = auth.slice('Bearer '.length).trim()
  if (!accessToken) {
    return {
      ok: false,
      response: errorResponse('unauthenticated', 'Empty bearer token', 401),
    }
  }

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) {
    return {
      ok: false,
      response: errorResponse(
        'not_configured',
        'PRODUCTION CONNECTION NOT CONFIGURED',
        503,
      ),
    }
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user?.id) {
    return {
      ok: false,
      response: errorResponse('unauthenticated', 'Invalid session', 401),
    }
  }
  if (data.user.id === 'owner_self') {
    return {
      ok: false,
      response: errorResponse('unauthenticated', 'owner_self is not production authority', 401),
    }
  }
  return { ok: true, accountId: data.user.id, accessToken }
}

export async function readJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}
