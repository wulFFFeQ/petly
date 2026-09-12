/**
 * Pet ownership create/update/list + account bootstrap reads.
 * Actor from JWT only.
 */

import { rejectForgedActorClaim } from '../_shared/authorize.ts'
import { recordAuditEvent } from '../_shared/db.ts'
import {
  bindRequestCors,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
  requireActorAccountId,
} from '../_shared/http.ts'

type Body = {
  op:
    | 'create'
    | 'update'
    | 'listMine'
    | 'withdraw'
    | 'getMyAccount'
    | 'updateMyAccount'
  claimedActorAccountId?: string
  claimedOwnerAccountId?: string
  petId?: string
  pet?: Record<string, unknown>
  displayName?: string
  roles?: string[]
  kind?: string
  correlationId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: bindRequestCors(req) })
  }
  bindRequestCors(req)

  const actor = await requireActorAccountId(req)
  if (!actor.ok) return actor.response

  const body = await readJsonBody<Body>(req)
  if (!body?.op) return errorResponse('invalid', 'op required')

  const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
  if (forged) return errorResponse(forged.code, forged.reason, 403)

  let db
  try {
    db = getServiceClient()
  } catch {
    return errorResponse('not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
  }

  if (body.op === 'getMyAccount') {
    const { data, error } = await db
      .from('accounts')
      .select('*')
      .eq('id', actor.accountId)
      .maybeSingle()
    if (error) return errorResponse('db_error', error.message, 500)
    return jsonResponse({ ok: true, account: data })
  }

  if (body.op === 'updateMyAccount') {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.displayName === 'string') patch.display_name = body.displayName.trim()
    if (Array.isArray(body.roles)) patch.roles = body.roles
    if (typeof body.kind === 'string') patch.kind = body.kind
    const { data, error } = await db
      .from('accounts')
      .update(patch)
      .eq('id', actor.accountId)
      .select('*')
      .single()
    if (error) return errorResponse('db_error', error.message, 500)
    return jsonResponse({ ok: true, account: data })
  }

  if (body.op === 'listMine') {
    const { data, error } = await db
      .from('pets')
      .select('*')
      .eq('owner_account_id', actor.accountId)
      .is('withdrawn_at', null)
      .order('updated_at', { ascending: false })
    if (error) return errorResponse('db_error', error.message, 500)
    return jsonResponse({ ok: true, pets: data ?? [] })
  }

  if (body.op === 'withdraw') {
    if (!body.petId) return errorResponse('invalid', 'petId required')
    const { data: existing } = await db
      .from('pets')
      .select('id, owner_account_id')
      .eq('id', body.petId)
      .maybeSingle()
    if (!existing) return errorResponse('not_found', 'Pet not found', 404)
    if (existing.owner_account_id !== actor.accountId) {
      return errorResponse('not_owner', 'Only owner may withdraw pet', 403)
    }
    const { error } = await db
      .from('pets')
      .update({ withdrawn_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', body.petId)
    if (error) return errorResponse('db_error', error.message, 500)
    await recordAuditEvent(db, {
      actorAccountId: actor.accountId,
      resourceType: 'pet',
      resourceId: body.petId,
      action: 'pet.profile.write',
      result: 'allow',
      allowPath: 'owner',
      correlationId: body.correlationId,
    })
    return jsonResponse({ ok: true })
  }

  if (!body.pet) return errorResponse('invalid', 'op and pet required')

  if (body.claimedOwnerAccountId && body.claimedOwnerAccountId !== actor.accountId) {
    return errorResponse('forged_owner', 'ownerAccountId does not match session', 403)
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

  if (body.op !== 'update') return errorResponse('invalid', 'unknown op')
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
