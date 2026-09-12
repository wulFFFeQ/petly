/**
 * Messaging — participantAccountIds is the only ACL.
 * bookingId / professionalId are NOT authorization.
 */

import { authorizeMessaging, rejectForgedActorClaim } from '../_shared/authorize.ts'
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
  op: 'createConversation' | 'sendMessage' | 'listMessages'
  claimedActorAccountId?: string
  conversationId?: string
  participantAccountIds?: string[]
  bookingId?: string
  professionalId?: string
  petId?: string
  text?: string
  attachment?: Record<string, unknown>
  correlationId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

  if (body.op === 'createConversation') {
    const participants = body.participantAccountIds ?? []
    if (participants.length < 2) {
      return errorResponse('missing_participants', 'participantAccountIds required (≥2)', 403)
    }
    if (!participants.includes(actor.accountId)) {
      return errorResponse('not_participant', 'Actor must be a participant', 403)
    }
    // Forged participant list that excludes actor already denied; extras still require actor membership
    const { data, error } = await db
      .from('conversations')
      .insert({
        participant_account_ids: participants,
        booking_id: body.bookingId ?? null,
        professional_id: body.professionalId ?? null,
        pet_id: body.petId ?? null,
        payload: {},
      })
      .select('*')
      .single()
    if (error) return errorResponse('db_error', error.message, 500)
    await recordAuditEvent(db, {
      actorAccountId: actor.accountId,
      resourceType: 'conversation',
      resourceId: data.id,
      action: 'messaging.send',
      result: 'allow',
      allowPath: 'messaging',
      correlationId: body.correlationId,
    })
    return jsonResponse({ ok: true, conversation: data })
  }

  if (!body.conversationId) {
    return errorResponse('invalid', 'conversationId required')
  }

  const { data: conversation } = await db
    .from('conversations')
    .select('id, participant_account_ids')
    .eq('id', body.conversationId)
    .maybeSingle()

  const decision = authorizeMessaging({
    actorAccountId: actor.accountId,
    action: body.op === 'listMessages' ? 'messaging.read' : 'messaging.send',
    conversation: conversation ?? null,
  })

  await recordAuditEvent(db, {
    actorAccountId: actor.accountId,
    resourceType: 'conversation',
    resourceId: body.conversationId,
    action: body.op === 'listMessages' ? 'messaging.read' : 'messaging.send',
    result: decision.allowed ? 'allow' : 'deny',
    denyCode: decision.allowed ? undefined : decision.code,
    correlationId: body.correlationId,
  })

  if (!decision.allowed) {
    return errorResponse(decision.code, decision.reason, 403)
  }

  if (body.op === 'listMessages') {
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', body.conversationId)
      .order('created_at', { ascending: true })
    if (error) return errorResponse('db_error', error.message, 500)
    return jsonResponse({ ok: true, messages: data ?? [] })
  }

  const { data: message, error } = await db
    .from('messages')
    .insert({
      conversation_id: body.conversationId,
      sender_account_id: actor.accountId,
      text: body.text ?? null,
      attachment: body.attachment ?? null,
    })
    .select('*')
    .single()
  if (error) return errorResponse('db_error', error.message, 500)
  return jsonResponse({ ok: true, message })
})
