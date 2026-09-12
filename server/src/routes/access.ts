import type { FastifyInstance } from 'fastify'
import { forgedDeny } from '../authorize/forged.js'
import { rejectForgedActorClaim } from '../authorize/petAuthorize.js'
import { requireActor } from '../auth/session.js'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { recordAuditEvent } from '../persistence/audit.js'
import { prisma } from '../prisma.js'

type Body = {
  op:
    | 'listForPet'
    | 'grantHousehold'
    | 'revokeHousehold'
    | 'grantProfessional'
    | 'revokeProfessional'
    | 'grantOrgPet'
    | 'revokeOrgPet'
  claimedActorAccountId?: string
  petId?: string
  accountId?: string
  role?: string
  permissions?: string[]
  professionalId?: string
  organizationId?: string
  expiresAt?: string
  correlationId?: string
}

async function requirePetOwner(
  petId: string,
  actorAccountId: string,
  correlationId?: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string; status: number }> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { ownerAccountId: true },
  })
  if (!pet) return { ok: false, code: 'not_found', message: 'Pet not found', status: 404 }
  if (pet.ownerAccountId !== actorAccountId) {
    await recordAuditEvent({
      actorAccountId,
      resourceType: 'pet',
      resourceId: petId,
      action: 'organization.pet.access',
      result: 'deny',
      denyCode: 'not_owner',
      correlationId,
    })
    return { ok: false, code: 'not_owner', message: 'Only owner may manage access', status: 403 }
  }
  return { ok: true }
}

export function registerAccessRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/access', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')
    if (!body.petId) return sendErr(reply, 'invalid', 'petId required')

    const forged = forgedDeny(
      rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId),
    )
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    const owner = await requirePetOwner(body.petId, actor.accountId, body.correlationId)
    if (!owner.ok) return sendErr(reply, owner.code, owner.message, owner.status)

    if (body.op === 'listForPet') {
      const [household, professional, organization] = await Promise.all([
        prisma.petHouseholdAccess.findMany({ where: { petId: body.petId } }),
        prisma.petProfessionalAccess.findMany({ where: { petId: body.petId } }),
        prisma.organizationPetAccess.findMany({ where: { petId: body.petId } }),
      ])
      return sendOk(reply, { household, professional, organization })
    }

    if (body.op === 'grantHousehold') {
      if (!body.accountId || !body.role) {
        return sendErr(reply, 'invalid', 'accountId and role required')
      }
      const grant = await prisma.petHouseholdAccess.upsert({
        where: {
          petId_accountId: { petId: body.petId, accountId: body.accountId },
        },
        create: {
          petId: body.petId,
          accountId: body.accountId,
          role: body.role,
          permissions: body.permissions ?? [],
          status: 'active',
          grantedByAccountId: actor.accountId,
          revokedAt: null,
        },
        update: {
          role: body.role,
          permissions: body.permissions ?? [],
          status: 'active',
          grantedByAccountId: actor.accountId,
          revokedAt: null,
          grantedAt: new Date(),
        },
      })
      return sendOk(reply, { grant })
    }

    if (body.op === 'revokeHousehold') {
      if (!body.accountId) return sendErr(reply, 'invalid', 'accountId required')
      const grant = await prisma.petHouseholdAccess.update({
        where: {
          petId_accountId: { petId: body.petId, accountId: body.accountId },
        },
        data: { status: 'revoked', revokedAt: new Date() },
      })
      return sendOk(reply, { grant })
    }

    if (body.op === 'grantProfessional') {
      if (!body.professionalId) return sendErr(reply, 'invalid', 'professionalId required')
      const permissions = body.permissions ?? []
      if (permissions.includes('emergencyWrite') && !body.expiresAt) {
        return sendErr(reply, 'invalid', 'emergencyWrite requires expiresAt')
      }
      const grant = await prisma.petProfessionalAccess.upsert({
        where: {
          petId_professionalId: {
            petId: body.petId,
            professionalId: body.professionalId,
          },
        },
        create: {
          petId: body.petId,
          professionalId: body.professionalId,
          permissions,
          status: 'active',
          grantedByAccountId: actor.accountId,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          revokedAt: null,
        },
        update: {
          permissions,
          status: 'active',
          grantedByAccountId: actor.accountId,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          revokedAt: null,
          grantedAt: new Date(),
        },
      })
      return sendOk(reply, { grant })
    }

    if (body.op === 'revokeProfessional') {
      if (!body.professionalId) return sendErr(reply, 'invalid', 'professionalId required')
      const grant = await prisma.petProfessionalAccess.update({
        where: {
          petId_professionalId: {
            petId: body.petId,
            professionalId: body.professionalId,
          },
        },
        data: { status: 'revoked', revokedAt: new Date() },
      })
      return sendOk(reply, { grant })
    }

    if (body.op === 'grantOrgPet') {
      if (!body.organizationId) return sendErr(reply, 'invalid', 'organizationId required')
      const grant = await prisma.organizationPetAccess.upsert({
        where: {
          petId_organizationId: {
            petId: body.petId,
            organizationId: body.organizationId,
          },
        },
        create: {
          petId: body.petId,
          organizationId: body.organizationId,
          permissions: body.permissions ?? [],
          status: 'active',
          visibilityMode: 'assigned_only',
          assignedAccountIds: [],
          grantedByAccountId: actor.accountId,
          revokedAt: null,
        },
        update: {
          permissions: body.permissions ?? [],
          status: 'active',
          grantedByAccountId: actor.accountId,
          revokedAt: null,
          grantedAt: new Date(),
        },
      })
      return sendOk(reply, { grant })
    }

    if (body.op === 'revokeOrgPet') {
      if (!body.organizationId) return sendErr(reply, 'invalid', 'organizationId required')
      const grant = await prisma.organizationPetAccess.update({
        where: {
          petId_organizationId: {
            petId: body.petId,
            organizationId: body.organizationId,
          },
        },
        data: { status: 'revoked', revokedAt: new Date() },
      })
      return sendOk(reply, { grant })
    }

    return sendErr(reply, 'invalid', 'unknown op')
  })
}
