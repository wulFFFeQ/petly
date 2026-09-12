/**
 * Edge: clinical mutations — HealthRecord / weight / encounter / emergency.
 * authorize → (idempotency) → mutate. Never trusts body actorId.
 */

import {
  authorizePetAction,
  rejectForgedActorClaim,
  type SecurityAction,
} from '../_shared/authorize.ts'
import { loadPetAuthzBundle, recordAuditEvent } from '../_shared/db.ts'
import {
  bindRequestCors,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
  requireActorAccountId,
} from '../_shared/http.ts'
import { executeIdempotent } from '../_shared/idempotency.ts'

type Body = {
  op:
    | 'listHealthRecords'
    | 'upsertHealthRecord'
    | 'withdrawHealthRecord'
    | 'listWeights'
    | 'createWeight'
    | 'listEncounters'
    | 'upsertEncounter'
    | 'emergencyWrite'
  petId: string
  action?: SecurityAction
  activeMode?: 'personal' | 'professional' | 'organization'
  claimedActorAccountId?: string
  record?: Record<string, unknown>
  expectedVersion?: number
  emergencyCard?: Record<string, unknown>
  idempotencyKey?: string
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
  if (!body?.petId || !body.op) {
    return errorResponse('invalid', 'petId and op required')
  }

  const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
  if (forged) {
    return errorResponse(forged.code, forged.reason, 403)
  }

  let db
  try {
    db = getServiceClient()
  } catch {
    return errorResponse('not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
  }

  const action: SecurityAction =
    body.action ??
    (body.op === 'listHealthRecords' ||
    body.op === 'listWeights' ||
    body.op === 'listEncounters'
      ? 'health.read'
      : body.op === 'emergencyWrite'
        ? 'clinical.emergency.write'
        : 'health.write')

  const bundle = await loadPetAuthzBundle(db, body.petId, actor.accountId)
  if (!bundle.pet) {
    return errorResponse('not_found', 'Pet not found', 404)
  }

  const decision = authorizePetAction({
    actorAccountId: actor.accountId,
    action,
    pet: bundle.pet,
    householdGrants: bundle.householdGrants,
    professionalGrants: bundle.professionalGrants,
    orgPetGrants: bundle.orgPetGrants,
    activeMode: body.activeMode ?? 'personal',
  })

  await recordAuditEvent(db, {
    actorAccountId: actor.accountId,
    resourceType: 'pet',
    resourceId: body.petId,
    action,
    result: decision.allowed ? 'allow' : 'deny',
    denyCode: decision.allowed ? undefined : decision.code,
    denyClass: decision.allowed ? undefined : decision.denyClass,
    reasonCode: decision.allowed ? decision.reason : decision.reason,
    grantId: decision.allowed ? decision.grantId : undefined,
    permission: decision.allowed ? decision.permission : undefined,
    allowPath: decision.allowed ? decision.path : undefined,
    correlationId: body.correlationId,
  })

  if (!decision.allowed) {
    return errorResponse(decision.code, decision.reason, 403, { denyClass: decision.denyClass })
  }

  const run = async () => {
    switch (body.op) {
      case 'listHealthRecords': {
        const { data, error } = await db
          .from('health_records')
          .select('*')
          .eq('pet_id', body.petId)
          .is('withdrawn_at', null)
        if (error) throw error
        return { records: data ?? [] }
      }
      case 'upsertHealthRecord': {
        if (!body.record) throw new Error('record required')
        const record = body.record
        if (typeof body.expectedVersion === 'number' && record.id) {
          const { data: current } = await db
            .from('health_records')
            .select('version')
            .eq('id', record.id)
            .maybeSingle()
          if (current && current.version !== body.expectedVersion) {
            const err = new Error('VERSION_CONFLICT')
            ;(err as Error & { code?: string }).code = 'VERSION_CONFLICT'
            throw err
          }
        }
        const row = {
          ...mapHealthRecord(record, body.petId, actor.accountId),
          updated_at: new Date().toISOString(),
        }
        const { data, error } = await db
          .from('health_records')
          .upsert(row)
          .select('*')
          .single()
        if (error) throw error
        await db.from('health_record_versions').insert({
          record_id: data.id,
          version: data.version,
          snapshot: data,
        })
        return { record: data }
      }
      case 'withdrawHealthRecord': {
        if (!body.record?.id) throw new Error('record.id required')
        const { data, error } = await db
          .from('health_records')
          .update({
            withdrawn_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.record.id)
          .eq('pet_id', body.petId)
          .select('*')
          .single()
        if (error) throw error
        return { record: data }
      }
      case 'listWeights': {
        const { data, error } = await db
          .from('weight_measurements')
          .select('*')
          .eq('pet_id', body.petId)
        if (error) throw error
        return { weights: data ?? [] }
      }
      case 'createWeight': {
        if (!body.record) throw new Error('record required')
        const { data, error } = await db
          .from('weight_measurements')
          .insert(mapWeight(body.record, body.petId, actor.accountId))
          .select('*')
          .single()
        if (error) throw error
        return { weight: data }
      }
      case 'listEncounters': {
        const { data, error } = await db
          .from('clinical_encounters')
          .select('*')
          .eq('pet_id', body.petId)
          .is('withdrawn_at', null)
        if (error) throw error
        return { encounters: data ?? [] }
      }
      case 'upsertEncounter': {
        if (!body.record) throw new Error('record required')
        const { data, error } = await db
          .from('clinical_encounters')
          .upsert(mapEncounter(body.record, body.petId, actor.accountId))
          .select('*')
          .single()
        if (error) throw error
        await db.from('clinical_encounter_versions').insert({
          encounter_id: data.id,
          version: data.version,
          snapshot: data,
        })
        return { encounter: data }
      }
      case 'emergencyWrite': {
        const { data, error } = await db
          .from('pets')
          .update({
            emergency_card: body.emergencyCard ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.petId)
          .select('id, emergency_card')
          .single()
        if (error) throw error
        return { pet: data }
      }
      default:
        throw new Error('unknown op')
    }
  }

  try {
    if (body.idempotencyKey) {
      const fingerprint = JSON.stringify({
        op: body.op,
        petId: body.petId,
        record: body.record,
        emergencyCard: body.emergencyCard,
        expectedVersion: body.expectedVersion,
      })
      const idem = await executeIdempotent({
        db,
        actorAccountId: actor.accountId,
        operation: `clinical.${body.op}`,
        resourceRef: `pet:${body.petId}`,
        clientKey: body.idempotencyKey,
        fingerprint,
        run,
      })
      if (!idem.ok) {
        return errorResponse(idem.code, idem.message, 409)
      }
      return jsonResponse({ ok: true, replay: idem.replay, ...idem.result })
    }
    const result = await run()
    return jsonResponse({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'clinical_error'
    if (message === 'VERSION_CONFLICT') {
      return errorResponse('VERSION_CONFLICT', 'Stale expectedVersion', 409)
    }
    return errorResponse('clinical_error', message, 500)
  }
})

function mapHealthRecord(
  record: Record<string, unknown>,
  petId: string,
  actorId: string,
) {
  return {
    id: record.id ?? crypto.randomUUID(),
    pet_id: petId,
    type: record.type,
    title: record.title ?? null,
    date: record.date ?? null,
    notes: record.notes ?? null,
    status: record.status ?? null,
    version: typeof record.version === 'number' ? record.version : 1,
    encounter_id: record.encounterId ?? null,
    created_by_account_id: record.createdByAccountId ?? actorId,
    record_source: record.recordSource ?? null,
    payload: record,
  }
}

function mapWeight(record: Record<string, unknown>, petId: string, actorId: string) {
  return {
    id: record.id ?? crypto.randomUUID(),
    pet_id: petId,
    measured_on: record.date ?? record.measuredOn,
    weight: record.weight,
    version: typeof record.version === 'number' ? record.version : 1,
    encounter_id: record.encounterId ?? null,
    created_by_account_id: record.createdByAccountId ?? actorId,
    payload: record,
  }
}

function mapEncounter(
  record: Record<string, unknown>,
  petId: string,
  actorId: string,
) {
  return {
    id: record.id ?? crypto.randomUUID(),
    pet_id: petId,
    status: record.status,
    encounter_type: record.encounterType ?? null,
    started_at: record.startedAt ?? null,
    ended_at: record.endedAt ?? null,
    professional_id: record.professionalId ?? null,
    organization_id: record.organizationId ?? null,
    booking_id: record.bookingId ?? null,
    version: typeof record.version === 'number' ? record.version : 1,
    created_by_account_id: record.createdByAccountId ?? actorId,
    payload: record,
  }
}
