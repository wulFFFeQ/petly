import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { createHash } from 'node:crypto'
import { forgedDeny } from '../authorize/forged.js'
import { loadPetAuthzBundle } from '../authorize/loadPetAuthz.js'
import {
  authorizePetAction,
  rejectForgedActorClaim,
  type SecurityAction,
} from '../authorize/petAuthorize.js'
import { requireActor } from '../auth/session.js'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { recordAuditEvent } from '../persistence/audit.js'
import { executeIdempotent } from '../persistence/idempotency.js'
import { prisma } from '../prisma.js'

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
  claimedActorAccountId?: string
  petId?: string
  recordId?: string
  record?: Record<string, unknown>
  weight?: Record<string, unknown>
  encounter?: Record<string, unknown>
  emergencyCard?: unknown
  expectedVersion?: number
  action?: SecurityAction
  activeMode?: 'personal' | 'professional' | 'organization'
  idempotencyKey?: string
  correlationId?: string
}

function fingerprint(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex')
}

export function registerClinicalRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/clinical', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')
    if (!body.petId) return sendErr(reply, 'invalid', 'petId required')

    const forged = forgedDeny(
      rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId),
    )
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    const bundle = await loadPetAuthzBundle(body.petId, actor.accountId)
    if (!bundle.pet) return sendErr(reply, 'not_found', 'Pet not found', 404)

    const listOps = new Set([
      'listHealthRecords',
      'listWeights',
      'listEncounters',
    ])
    const action: SecurityAction =
      body.action ??
      (body.op === 'emergencyWrite'
        ? 'clinical.emergency.write'
        : listOps.has(body.op)
          ? 'health.read'
          : 'health.write')

    const decision = authorizePetAction({
      actorAccountId: actor.accountId,
      action,
      pet: bundle.pet,
      householdGrants: bundle.householdGrants,
      professionalGrants: bundle.professionalGrants,
      orgPetGrants: bundle.orgPetGrants,
      activeMode: body.activeMode,
    })

    await recordAuditEvent({
      actorAccountId: actor.accountId,
      resourceType: 'pet',
      resourceId: body.petId,
      action,
      result: decision.allowed ? 'allow' : 'deny',
      denyCode: decision.allowed ? undefined : decision.code,
      denyClass: decision.allowed ? undefined : decision.denyClass,
      allowPath: decision.allowed ? decision.path : undefined,
      grantId: decision.allowed ? decision.grantId : undefined,
      permission: decision.allowed ? decision.permission : undefined,
      correlationId: body.correlationId,
    })

    if (!decision.allowed) {
      return sendErr(reply, decision.code, decision.reason, 403)
    }

    const run = async () => {
      if (body.op === 'listHealthRecords') {
        const records = await prisma.healthRecord.findMany({
          where: { petId: body.petId!, withdrawnAt: null },
          orderBy: { updatedAt: 'desc' },
        })
        return { records }
      }

      if (body.op === 'upsertHealthRecord') {
        if (!body.record) throw Object.assign(new Error('record required'), { code: 'invalid' })
        const id =
          (body.record.id as string) ||
          body.recordId ||
          crypto.randomUUID()
        const existing = await prisma.healthRecord.findUnique({ where: { id } })
        if (
          existing &&
          body.expectedVersion != null &&
          existing.version !== body.expectedVersion
        ) {
          throw Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
        }
        const nextVersion = existing ? existing.version + 1 : 1
        const row = await prisma.healthRecord.upsert({
          where: { id },
          create: {
            id,
            petId: body.petId!,
            type: String(body.record.type ?? 'note'),
            title: (body.record.title as string | undefined) ?? null,
            notes: (body.record.notes as string | undefined) ?? null,
            status: (body.record.status as string | undefined) ?? null,
            version: 1,
            createdByAccountId: actor.accountId,
            payload: body.record as Prisma.InputJsonValue,
          },
          update: {
            type: body.record.type != null ? String(body.record.type) : undefined,
            title: (body.record.title as string | undefined) ?? undefined,
            notes: (body.record.notes as string | undefined) ?? undefined,
            status: (body.record.status as string | undefined) ?? undefined,
            version: nextVersion,
            payload: body.record as Prisma.InputJsonValue,
          },
        })
        await prisma.healthRecordVersion.create({
          data: {
            recordId: row.id,
            version: row.version,
            snapshot: body.record as Prisma.InputJsonValue,
          },
        })
        return { record: row }
      }

      if (body.op === 'withdrawHealthRecord') {
        if (!body.recordId) throw Object.assign(new Error('recordId required'), { code: 'invalid' })
        const record = await prisma.healthRecord.update({
          where: { id: body.recordId },
          data: { withdrawnAt: new Date() },
        })
        return { record }
      }

      if (body.op === 'listWeights') {
        const weights = await prisma.weightMeasurement.findMany({
          where: { petId: body.petId! },
          orderBy: { measuredOn: 'desc' },
        })
        return { weights }
      }

      if (body.op === 'createWeight') {
        if (!body.weight) throw Object.assign(new Error('weight required'), { code: 'invalid' })
        const weight = await prisma.weightMeasurement.create({
          data: {
            id: (body.weight.id as string) || crypto.randomUUID(),
            petId: body.petId!,
            measuredOn: new Date(String(body.weight.measuredOn ?? body.weight.date ?? Date.now())),
            weight: new Prisma.Decimal(String(body.weight.weight ?? 0)),
            createdByAccountId: actor.accountId,
            payload: body.weight as Prisma.InputJsonValue,
          },
        })
        return { weight }
      }

      if (body.op === 'listEncounters') {
        const encounters = await prisma.clinicalEncounter.findMany({
          where: { petId: body.petId!, withdrawnAt: null },
          orderBy: { updatedAt: 'desc' },
        })
        return { encounters }
      }

      if (body.op === 'upsertEncounter') {
        if (!body.encounter) {
          throw Object.assign(new Error('encounter required'), { code: 'invalid' })
        }
        const id = (body.encounter.id as string) || crypto.randomUUID()
        const existing = await prisma.clinicalEncounter.findUnique({ where: { id } })
        const nextVersion = existing ? existing.version + 1 : 1
        const encounter = await prisma.clinicalEncounter.upsert({
          where: { id },
          create: {
            id,
            petId: body.petId!,
            status: String(body.encounter.status ?? 'open'),
            encounterType: (body.encounter.encounterType as string | undefined) ?? null,
            version: 1,
            createdByAccountId: actor.accountId,
            payload: body.encounter as Prisma.InputJsonValue,
          },
          update: {
            status: body.encounter.status != null ? String(body.encounter.status) : undefined,
            encounterType:
              (body.encounter.encounterType as string | undefined) ?? undefined,
            version: nextVersion,
            payload: body.encounter as Prisma.InputJsonValue,
          },
        })
        await prisma.clinicalEncounterVersion.create({
          data: {
            encounterId: encounter.id,
            version: encounter.version,
            snapshot: body.encounter as Prisma.InputJsonValue,
          },
        })
        return { encounter }
      }

      if (body.op === 'emergencyWrite') {
        const pet = await prisma.pet.update({
          where: { id: body.petId! },
          data: {
            emergencyCard: (body.emergencyCard ?? null) as Prisma.InputJsonValue,
          },
          select: { id: true, emergencyCard: true },
        })
        return { pet: { id: pet.id, emergency_card: pet.emergencyCard } }
      }

      throw Object.assign(new Error('unknown op'), { code: 'invalid' })
    }

    try {
      if (body.idempotencyKey) {
        const idem = await executeIdempotent({
          actorAccountId: actor.accountId,
          operation: `clinical.${body.op}`,
          resourceRef: `pet:${body.petId}`,
          clientKey: body.idempotencyKey,
          fingerprint: fingerprint({
            op: body.op,
            petId: body.petId,
            record: body.record,
            weight: body.weight,
            encounter: body.encounter,
            emergencyCard: body.emergencyCard,
          }),
          run,
        })
        if (!idem.ok) {
          return sendErr(reply, idem.code, idem.message, 409)
        }
        return sendOk(reply, { replay: idem.replay, ...(idem.result as object) })
      }

      const result = await run()
      return sendOk(reply, result as Record<string, unknown>)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'VERSION_CONFLICT') {
        return sendErr(reply, 'VERSION_CONFLICT', 'Version conflict', 409)
      }
      if (code === 'invalid') {
        return sendErr(reply, 'invalid', (err as Error).message)
      }
      throw err
    }
  })
}
