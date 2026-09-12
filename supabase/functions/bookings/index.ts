/**
 * Booking lifecycle — server re-checks overlap / actor authority.
 * Client slot math is UX only.
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

const SLOT_BLOCKING = new Set(['requested', 'payment_pending', 'confirmed'])

type Body = {
  op:
    | 'create'
    | 'confirm'
    | 'decline'
    | 'cancel'
    | 'reschedule'
    | 'complete'
    | 'no_show'
  claimedActorAccountId?: string
  bookingId?: string
  ownerAccountId?: string
  professionalId?: string
  serviceId?: string
  petId?: string
  startAt?: string
  endAt?: string
  note?: string
  clientRequestId?: string
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

  try {
    if (body.op === 'create') {
      if (!body.professionalId || !body.serviceId || !body.petId || !body.startAt || !body.endAt) {
        return errorResponse('invalid', 'Missing booking fields')
      }
      // Owner must be session actor — never trust body.ownerAccountId
      if (body.ownerAccountId && body.ownerAccountId !== actor.accountId) {
        return errorResponse('forged_owner', 'ownerAccountId does not match session', 403)
      }

      const { data: service } = await db
        .from('professional_services')
        .select('*')
        .eq('id', body.serviceId)
        .eq('professional_id', body.professionalId)
        .maybeSingle()
      if (!service || service.active === false) {
        return errorResponse('invalid_service', 'Service not available', 400)
      }

      const startAt = new Date(body.startAt)
      const endAt = new Date(body.endAt)
      if (!(endAt > startAt)) {
        return errorResponse('invalid_range', 'endAt must be after startAt', 400)
      }

      const durationMinutes =
        typeof service.duration_minutes === 'number' ? service.duration_minutes : null
      if (durationMinutes) {
        const expectedMs = durationMinutes * 60_000
        if (Math.abs(endAt.getTime() - startAt.getTime() - expectedMs) > 60_000) {
          return errorResponse('duration_mismatch', 'Duration does not match service', 400)
        }
      }

      const conflict = await hasOverlap(db, body.professionalId, body.startAt, body.endAt, null)
      if (conflict) {
        return errorResponse('slot_conflict', 'Overlapping booking exists', 409)
      }

      const { data: booking, error } = await db
        .from('bookings')
        .insert({
          owner_account_id: actor.accountId,
          professional_id: body.professionalId,
          service_id: body.serviceId,
          pet_id: body.petId,
          start_at: body.startAt,
          end_at: body.endAt,
          status: 'requested',
          note: body.note ?? null,
          service_name_snapshot: service.name,
          duration_snapshot: service.duration_minutes,
          price_snapshot: service.price,
          currency_snapshot: service.currency,
          client_request_id: body.clientRequestId ?? null,
        })
        .select('*')
        .single()
      if (error) return errorResponse('db_error', error.message, 500)

      await recordAuditEvent(db, {
        actorAccountId: actor.accountId,
        resourceType: 'booking',
        resourceId: booking.id,
        action: 'booking.confirm',
        result: 'allow',
        allowPath: 'booking',
        correlationId: body.correlationId,
      })
      return jsonResponse({ ok: true, booking })
    }

    if (!body.bookingId) return errorResponse('invalid', 'bookingId required')

    const { data: booking } = await db
      .from('bookings')
      .select('*')
      .eq('id', body.bookingId)
      .maybeSingle()
    if (!booking) return errorResponse('not_found', 'Booking not found', 404)

    const { data: profile } = await db
      .from('professional_profiles')
      .select('account_id')
      .eq('id', booking.professional_id)
      .maybeSingle()

    const isOwner = booking.owner_account_id === actor.accountId
    const isPro = profile?.account_id === actor.accountId

    const now = new Date().toISOString()
    let patch: Record<string, unknown> = { updated_at: now }

    switch (body.op) {
      case 'confirm':
        if (!isPro) return errorResponse('forbidden', 'Only professional can confirm', 403)
        if (booking.status !== 'requested' && booking.status !== 'payment_pending') {
          return errorResponse('invalid_state', 'Cannot confirm from current status', 409)
        }
        patch = { ...patch, status: 'confirmed', confirmed_at: now }
        break
      case 'decline':
        if (!isPro) return errorResponse('forbidden', 'Only professional can decline', 403)
        patch = { ...patch, status: 'declined', declined_at: now }
        break
      case 'cancel':
        if (!isOwner && !isPro) return errorResponse('forbidden', 'Not a booking party', 403)
        patch = {
          ...patch,
          status: isOwner ? 'cancelled_by_owner' : 'cancelled_by_professional',
          cancelled_at: now,
        }
        break
      case 'complete':
        if (!isPro) return errorResponse('forbidden', 'Only professional can complete', 403)
        patch = { ...patch, status: 'completed', completed_at: now }
        break
      case 'no_show':
        if (!isPro) return errorResponse('forbidden', 'Only professional can mark no_show', 403)
        patch = { ...patch, status: 'no_show', no_show_at: now }
        break
      case 'reschedule':
        if (!isOwner && !isPro) return errorResponse('forbidden', 'Not a booking party', 403)
        if (!body.startAt || !body.endAt) {
          return errorResponse('invalid', 'startAt/endAt required')
        }
        if (await hasOverlap(db, booking.professional_id, body.startAt, body.endAt, booking.id)) {
          return errorResponse('slot_conflict', 'Overlapping booking exists', 409)
        }
        patch = {
          ...patch,
          start_at: body.startAt,
          end_at: body.endAt,
          original_start_at: booking.original_start_at ?? booking.start_at,
          original_end_at: booking.original_end_at ?? booking.end_at,
          rescheduled_at: now,
          status: booking.status === 'confirmed' ? 'confirmed' : 'requested',
        }
        break
      default:
        return errorResponse('invalid', 'Unknown op')
    }

    const { data: updated, error } = await db
      .from('bookings')
      .update(patch)
      .eq('id', body.bookingId)
      .select('*')
      .single()
    if (error) return errorResponse('db_error', error.message, 500)

    await recordAuditEvent(db, {
      actorAccountId: actor.accountId,
      resourceType: 'booking',
      resourceId: body.bookingId,
      action: body.op === 'cancel' ? 'booking.cancel' : 'booking.confirm',
      result: 'allow',
      allowPath: 'booking',
      correlationId: body.correlationId,
    })
    return jsonResponse({ ok: true, booking: updated })
  } catch (err) {
    return errorResponse(
      'booking_error',
      err instanceof Error ? err.message : 'booking_error',
      500,
    )
  }
})

async function hasOverlap(
  db: ReturnType<typeof getServiceClient>,
  professionalId: string,
  startAt: string,
  endAt: string,
  excludeId: string | null,
): Promise<boolean> {
  let q = db
    .from('bookings')
    .select('id, start_at, end_at, status')
    .eq('professional_id', professionalId)
    .lt('start_at', endAt)
    .gt('end_at', startAt)

  if (excludeId) q = q.neq('id', excludeId)

  const { data } = await q
  return (data ?? []).some((b) => SLOT_BLOCKING.has(b.status))
}
