import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { forgedDeny } from '../authorize/forged.js'
import { rejectForgedActorClaim } from '../authorize/petAuthorize.js'
import { requireActor } from '../auth/session.js'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { prisma } from '../prisma.js'

type Body = {
  op: 'listMine' | 'markRead' | 'createServerNotification'
  claimedActorAccountId?: string
  claimedRecipientAccountId?: string
  notificationId?: string
  recipientAccountId?: string
  type?: string
  title?: string
  message?: string
  relatedIds?: Record<string, unknown>
  priority?: string
  dedupeKey?: string
}

export function registerNotificationsRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/notifications', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')

    const forged = forgedDeny(
      rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId),
    )
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    if (body.op === 'listMine') {
      const notifications = await prisma.notification.findMany({
        where: { recipientAccountId: actor.accountId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return sendOk(reply, { notifications })
    }

    if (body.op === 'markRead') {
      if (!body.notificationId) return sendErr(reply, 'invalid', 'notificationId required')
      const existing = await prisma.notification.findFirst({
        where: { id: body.notificationId, recipientAccountId: actor.accountId },
      })
      if (!existing) return sendErr(reply, 'not_found', 'Notification not found', 404)
      const notification = await prisma.notification.update({
        where: { id: existing.id },
        data: { unread: false },
      })
      return sendOk(reply, { notification })
    }

    if (body.op === 'createServerNotification') {
      const recipientAccountId = body.recipientAccountId
      if (!recipientAccountId || !body.type || !body.title || !body.message) {
        return sendErr(reply, 'invalid', 'recipientAccountId, type, title, message required')
      }
      if (recipientAccountId !== actor.accountId) {
        const bookingId = body.relatedIds?.bookingId
        if (typeof bookingId !== 'string') {
          return sendErr(reply, 'forbidden', 'Cross-account notify requires related booking', 403)
        }
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: { professional: true },
        })
        if (!booking) return sendErr(reply, 'not_found', 'Booking not found', 404)
        const parties = new Set([
          booking.ownerAccountId,
          booking.professional.accountId,
        ])
        if (!parties.has(actor.accountId) || !parties.has(recipientAccountId)) {
          return sendErr(reply, 'forbidden', 'Actor and recipient must be booking parties', 403)
        }
      }

      const notification = await prisma.notification.create({
        data: {
          recipientAccountId,
          type: body.type,
          title: body.title,
          message: body.message,
          relatedIds: (body.relatedIds ?? undefined) as Prisma.InputJsonValue | undefined,
          priority: body.priority ?? null,
          dedupeKey: body.dedupeKey ?? null,
          unread: true,
        },
      })
      return sendOk(reply, { notification })
    }

    return sendErr(reply, 'invalid', 'unknown op')
  })
}
