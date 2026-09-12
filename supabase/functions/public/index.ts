/**
 * Public allowlist projections — never leak sensitive keys.
 */

import {
  bindRequestCors,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
} from '../_shared/http.ts'

const FORBIDDEN_PUBLIC_KEYS = [
  'microchip',
  'owner_account_id',
  'ownerAccountId',
  'account_id',
  'accountId',
  'storage_key',
  'storageKey',
  'email',
  'phone',
  'address',
  'notes',
  'medications',
  'health_history',
  'audit',
  'permissions',
] as const

type Body = {
  op: 'emergencyCard' | 'petPublic'
  slug?: string
  petId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: bindRequestCors(req) })
  }
  bindRequestCors(req)

  let db
  try {
    db = getServiceClient()
  } catch {
    return errorResponse('not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
  }

  const body = await readJsonBody<Body>(req)
  if (!body?.op) return errorResponse('invalid', 'op required')

  if (body.op === 'emergencyCard') {
    if (!body.slug) return errorResponse('invalid', 'slug required')
    const { data: pet } = await db
      .from('pets')
      .select('id, name, type, breed, image, emergency_card, public_slug')
      .eq('public_slug', body.slug)
      .maybeSingle()
    if (!pet) return errorResponse('not_found', 'Not found', 404)

    const card = (pet.emergency_card ?? {}) as Record<string, unknown>
    const visibility = (card.visibility ?? {}) as Record<string, unknown>
    // Opt-in only
    const publicProjection: Record<string, unknown> = {
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      image: pet.image,
    }
    if (visibility.health === true && card.health) {
      publicProjection.health = card.health
    }
    if (visibility.vet === true && card.vet) {
      publicProjection.vet = scrub(card.vet as Record<string, unknown>)
    }

    assertNoForbidden(publicProjection)
    return jsonResponse({ ok: true, projection: publicProjection })
  }

  if (body.op === 'petPublic') {
    if (!body.petId) return errorResponse('invalid', 'petId required')
    const { data: pet } = await db
      .from('pets')
      .select('id, name, type, breed, image, privacy, connection_preferences')
      .eq('id', body.petId)
      .maybeSingle()
    if (!pet) return errorResponse('not_found', 'Not found', 404)
    const projection = {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      image: pet.image,
    }
    assertNoForbidden(projection)
    return jsonResponse({ ok: true, projection })
  }

  return errorResponse('invalid', 'Unknown op')
})

function scrub(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_PUBLIC_KEYS.includes(k as (typeof FORBIDDEN_PUBLIC_KEYS)[number])) continue
    out[k] = v
  }
  return out
}

function assertNoForbidden(obj: Record<string, unknown>): void {
  const raw = JSON.stringify(obj)
  for (const key of FORBIDDEN_PUBLIC_KEYS) {
    if (raw.includes(`"${key}"`)) {
      throw new Error(`Forbidden public key leaked: ${key}`)
    }
  }
}

export const PUBLIC_FORBIDDEN_KEYS_FOR_TESTS = FORBIDDEN_PUBLIC_KEYS
