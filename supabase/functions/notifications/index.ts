/**
 * Notifications — recipient derived server-side, never from untrusted client alone.
 */

import { rejectForgedActorClaim } from '../_shared/authorize.ts'
import {
  bindRequestCors,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
  requireActorAccountId,
} from '../_shared/http.ts'

type Body = {
  op: 'createServerNotification' | 'listMine' | 'markRead'
  claimedActorAccountId?: string
  /** Ignored for authority — recipient must be derived from related resource when possible. */
  claimedRecipientAccountId?: string
  recipientAccountId?: string
  type?: string
  title?: string
  message?: string
  dedupeKey?: string
  relatedIds?: Record<string, unknown>
  notificationId?: string
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

  if (body.op === 'listMine') {
    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('recipient_account_id', actor.accountId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return errorResponse('db_error', error.message, 500)
    return jsonResponse({ ok: true, notifications: data ?? [] })
  }

  if (body.op === 'markRead') {
    if (!body.notificationId) return errorResponse('invalid', 'notificationId required')
    const { data, error } = await db
      .from('notifications')
      .update({ unread: false })
      .eq('id', body.notificationId)
      .eq('recipient_account_id', actor.accountId)
      .select('*')
      .single()
    if (error) return errorResponse('db_error', error.message, 500)
    return jsonResponse({ ok: true, notification: data })
  }

  // createServerNotification — system-style insert; recipient must be explicit trusted path
  // For LAUNCH 02: only allow creating notifications for self OR when actor is booking party.
  const recipient = body.recipientAccountId
  if (!recipient || !body.type || !body.title || !body.message) {
    return errorResponse('invalid', 'recipientAccountId, type, title, message required')
  }
  // Client-claimed recipient alone is insufficient for third parties without relation check.
  if (recipient !== actor.accountId) {
    const relatedBookingId = body.relatedIds?.bookingId
    if (typeof relatedBookingId !== 'string') {
      return errorResponse(
        'recipient_forbidden',
        'Third-party recipient requires server-derived relation',
        403,
      )
    }
    const { data: booking } = await db
      .from('bookings')
      .select('owner_account_id, professional_id')
      .eq('id', relatedBookingId)
      .maybeSingle()
    const { data: profile } = booking
      ? await db
          .from('professional_profiles')
          .select('account_id')
          .eq('id', booking.professional_id)
          .maybeSingle()
      : { data: null }
    const parties = [booking?.owner_account_id, profile?.account_id].filter(Boolean)
    if (!parties.includes(actor.accountId) || !parties.includes(recipient)) {
      return errorResponse('recipient_forbidden', 'Recipient not a booking party', 403)
    }
  }

  void body.claimedRecipientAccountId // never authority

  const { data, error } = await db
    .from('notifications')
    .insert({
      recipient_account_id: recipient,
      type: body.type,
      title: body.title,
      message: body.message,
      dedupe_key: body.dedupeKey ?? null,
      related_ids: body.relatedIds ?? null,
      unread: true,
    })
    .select('*')
    .single()
  if (error) return errorResponse('db_error', error.message, 500)
  return jsonResponse({ ok: true, notification: data })
})
