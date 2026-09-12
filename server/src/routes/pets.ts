import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { rejectForgedActorClaim } from '../authorize/petAuthorize.js'
import { requireActor } from '../auth/session.js'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { recordAuditEvent } from '../persistence/audit.js'
import { prisma } from '../prisma.js'

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

export function registerPetsRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/pets', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')

    const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    if (body.op === 'getMyAccount') {
      const account = await prisma.account.findUnique({ where: { id: actor.accountId } })
      return sendOk(reply, { account })
    }

    if (body.op === 'updateMyAccount') {
      const data: Prisma.AccountUpdateInput = {}
      if (typeof body.displayName === 'string') data.displayName = body.displayName.trim()
      if (Array.isArray(body.roles)) data.roles = body.roles
      if (typeof body.kind === 'string') data.kind = body.kind
      const account = await prisma.account.update({
        where: { id: actor.accountId },
        data,
      })
      return sendOk(reply, { account })
    }

    if (body.op === 'listMine') {
      const pets = await prisma.pet.findMany({
        where: { ownerAccountId: actor.accountId, withdrawnAt: null },
        orderBy: { updatedAt: 'desc' },
      })
      return sendOk(reply, { pets: pets.map(petToRow) })
    }

    if (body.op === 'withdraw') {
      if (!body.petId) return sendErr(reply, 'invalid', 'petId required')
      const existing = await prisma.pet.findUnique({
        where: { id: body.petId },
        select: { id: true, ownerAccountId: true },
      })
      if (!existing) return sendErr(reply, 'not_found', 'Pet not found', 404)
      if (existing.ownerAccountId !== actor.accountId) {
        return sendErr(reply, 'not_owner', 'Only owner may withdraw pet', 403)
      }
      await prisma.pet.update({
        where: { id: body.petId },
        data: { withdrawnAt: new Date() },
      })
      await recordAuditEvent({
        actorAccountId: actor.accountId,
        resourceType: 'pet',
        resourceId: body.petId,
        action: 'pet.profile.write',
        result: 'allow',
        allowPath: 'owner',
        correlationId: body.correlationId,
      })
      return sendOk(reply, {})
    }

    if (!body.pet) return sendErr(reply, 'invalid', 'op and pet required')

    if (body.claimedOwnerAccountId && body.claimedOwnerAccountId !== actor.accountId) {
      return sendErr(reply, 'forged_owner', 'ownerAccountId does not match session', 403)
    }

    if (body.op === 'create') {
      const id =
        typeof body.pet.id === 'string' && body.pet.id ? body.pet.id : crypto.randomUUID()
      const pet = await prisma.pet.create({
        data: {
          id,
          ownerAccountId: actor.accountId,
          name: String(body.pet.name ?? ''),
          type: String(body.pet.type ?? ''),
          breed: (body.pet.breed as string | undefined) ?? null,
          image: (body.pet.image as string | undefined) ?? null,
          payload: body.pet as Prisma.InputJsonValue,
        },
      })
      await recordAuditEvent({
        actorAccountId: actor.accountId,
        resourceType: 'pet',
        resourceId: pet.id,
        action: 'pet.profile.write',
        result: 'allow',
        allowPath: 'owner',
        correlationId: body.correlationId,
      })
      return sendOk(reply, { pet: petToRow(pet) })
    }

    if (body.op !== 'update') return sendErr(reply, 'invalid', 'unknown op')
    if (!body.petId) return sendErr(reply, 'invalid', 'petId required')

    const existing = await prisma.pet.findUnique({
      where: { id: body.petId },
      select: { id: true, ownerAccountId: true },
    })
    if (!existing) return sendErr(reply, 'not_found', 'Pet not found', 404)
    if (existing.ownerAccountId !== actor.accountId) {
      await recordAuditEvent({
        actorAccountId: actor.accountId,
        resourceType: 'pet',
        resourceId: body.petId,
        action: 'pet.profile.write',
        result: 'deny',
        denyCode: 'not_owner',
        correlationId: body.correlationId,
      })
      return sendErr(reply, 'not_owner', 'Only owner may update ownership fields', 403)
    }

    const pet = await prisma.pet.update({
      where: { id: body.petId },
      data: {
        name: body.pet.name != null ? String(body.pet.name) : undefined,
        type: body.pet.type != null ? String(body.pet.type) : undefined,
        breed: (body.pet.breed as string | undefined) ?? undefined,
        image: (body.pet.image as string | undefined) ?? undefined,
        emergencyCard:
          body.pet.emergencyCard != null
            ? (body.pet.emergencyCard as Prisma.InputJsonValue)
            : undefined,
        payload: body.pet as Prisma.InputJsonValue,
      },
    })
    return sendOk(reply, { pet: petToRow(pet) })
  })
}

function petToRow(pet: {
  id: string
  ownerAccountId: string
  name: string
  type: string
  breed: string | null
  image: string | null
  emergencyCard: unknown
  payload: unknown
  withdrawnAt?: Date | null
}) {
  return {
    id: pet.id,
    owner_account_id: pet.ownerAccountId,
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    image: pet.image,
    emergency_card: pet.emergencyCard,
    payload: pet.payload,
    withdrawn_at: pet.withdrawnAt ?? null,
  }
}
