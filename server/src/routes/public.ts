import type { FastifyInstance } from 'fastify'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { prisma } from '../prisma.js'

const FORBIDDEN_KEYS = new Set([
  'microchip',
  'ownerAccountId',
  'owner_account_id',
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
])

type Body = {
  op: 'emergencyCard' | 'petPublic'
  publicSlug?: string
  petId?: string
}

export function registerPublicRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/public', async (request, reply) => {
    if (!env.databaseConfigured) {
      return sendErr(reply, 'not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
    }

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')

    if (body.op === 'emergencyCard') {
      if (!body.publicSlug) return sendErr(reply, 'invalid', 'publicSlug required')
      const pet = await prisma.pet.findFirst({
        where: { publicSlug: body.publicSlug, withdrawnAt: null },
      })
      if (!pet) return sendErr(reply, 'not_found', 'Pet not found', 404)

      const card = (pet.emergencyCard ?? {}) as Record<string, unknown>
      const visibility = (card.visibility ?? {}) as Record<string, unknown>
      const projection: Record<string, unknown> = {
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        image: pet.image,
      }
      if (visibility.health === true && card.health != null) {
        projection.health = card.health
      }
      if (visibility.vet === true && card.vet != null) {
        projection.vet = card.vet
      }
      scrub(projection)
      return sendOk(reply, { projection })
    }

    if (body.op === 'petPublic') {
      if (!body.petId) return sendErr(reply, 'invalid', 'petId required')
      const pet = await prisma.pet.findFirst({
        where: { id: body.petId, withdrawnAt: null },
        select: { id: true, name: true, type: true, breed: true, image: true },
      })
      if (!pet) return sendErr(reply, 'not_found', 'Pet not found', 404)
      return sendOk(reply, {
        projection: {
          id: pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          image: pet.image,
        },
      })
    }

    return sendErr(reply, 'invalid', 'unknown op')
  })
}

function scrub(obj: Record<string, unknown>) {
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) delete obj[key]
  }
}
