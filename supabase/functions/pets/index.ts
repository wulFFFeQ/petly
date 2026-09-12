/**
 * Pet ownership create/update — actor from JWT only.
 */

import { rejectForgedActorClaim } from '../_shared/authorize.ts'
import { recordAuditEvent } from '../_shared/db.ts'
import {
  corsHeaders,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
  requireActorAccountId,
} from '../_shared/http.ts'

type Body = {
  op: 'create' | 'update'
  claimedActorAccountId?: string
  claimedOwnerAccountId?: string
  petId?: string
  pet?: Record<string, unknown>
  correlationId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const actor = await requireActorAccountId(req)
  if (!actor.ok) return actor.response

  const body = await readJsonBody<Body>(req)
  if (!body?.op || !body.pet) return errorResponse('invalid', 'op and pet required')

  const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
  if (forged) return errorResponse(forged.code, forged.reason, 403)

  if (body.claimedOwnerAccountId && body.claimedOwnerAccountId !== actor.accountId) {
    return errorResponse('forged_owner', 'ownerAccountId does not match session', 403)
  }

  let db
  try {
    db = getServiceClient()
  } catch {
    return errorResponse('not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
  }

  if (body.op === 'create') {
    const row = {
      id: (body.pet.id as string) ?? crypto.randomUUID(),
      owner_account_id: actor.accountId,
      name: body.pet.name,
      type: body.pet.type,
      breed: body.pet.breed ?? null,
      image: body.pet.image ?? null,
      payload: body.pet,
    }
    const { data, error } = await db.from('pets').insert(row).select('*').single()
    if (error) return errorResponse('db_error', error.message, 500)
    await recordAuditEvent(db, {
      actorAccountId: actor.accountId,
      resourceType: 'pet',
      resourceId: data.id,
      action: 'pet.profile.write',
      result: 'allow',
      allowPath: 'owner',
      correlationId: body.correlationId,
    })
    return jsonResponse({ ok: true, pet: data })
  }

  if (!body.petId) return errorResponse('invalid', 'petId required')
  const { data: existing } = await db
    .from('pets')
    .select('id, owner_account_id')
    .eq('id', body.petId)
    .maybeSingle()
  if (!existing) return errorResponse('not_found', 'Pet not found', 404)
  if (existing.owner_account_id !== actor.accountId) {
    await recordAuditEvent(db, {
      actorAccountId: actor.accountId,
      resourceType: 'pet',
      resourceId: body.petId,
      action: 'pet.profile.write',
      result: 'deny',
      denyCode: 'not_owner',
      correlationId: body.correlationId,
    })
    return errorResponse('not_owner', 'Only owner may update ownership fields', 403)
  }

  const { data, error } = await db
    .from('pets')
    .update({
      name: body.pet.name ?? undefined,
      type: body.pet.type ?? undefined,
      breed: body.pet.breed ?? undefined,
      image: body.pet.image ?? undefined,
      emergency_card: body.pet.emergencyCard ?? undefined,
      payload: body.pet,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.petId)
    .select('*')
    .single()
  if (error) return errorResponse('db_error', error.message, 500)
  return jsonResponse({ ok: true, pet: data })
})
