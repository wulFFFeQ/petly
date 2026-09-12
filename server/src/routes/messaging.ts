import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import {
  authorizeMessaging,
  rejectForgedActorClaim,
} from '../authorize/petAuthorize.js'
import { requireActor } from '../auth/session.js'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { prisma } from '../prisma.js'

type Body = {
  op: 'createConversation' | 'listMessages' | 'sendMessage'
  claimedActorAccountId?: string
  conversationId?: string
  participantAccountIds?: string[]
  contactType?: string
  bookingId?: string
  professionalId?: string
  petId?: string
  subject?: string
  text?: string
  attachment?: unknown
}

export function registerMessagingRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/messaging', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')

    const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    if (body.op === 'createConversation') {
      const participants = body.participantAccountIds ?? []
      if (participants.length < 2 || !participants.includes(actor.accountId)) {
        return sendErr(
          reply,
          'missing_participants',
          'Conversation must include actor and at least one other participant',
          403,
        )
      }
      const conversation = await prisma.conversation.create({
        data: {
          participantAccountIds: participants,
          contactType: body.contactType ?? null,
          bookingId: body.bookingId ?? null,
          professionalId: body.professionalId ?? null,
          petId: body.petId ?? null,
          subject: body.subject ?? null,
        },
      })
      return sendOk(reply, { conversation })
    }

    if (!body.conversationId) return sendErr(reply, 'invalid', 'conversationId required')

    const conversation = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
    })
    const decision = authorizeMessaging({
      actorAccountId: actor.accountId,
      action: body.op === 'sendMessage' ? 'messaging.send' : 'messaging.read',
      conversation: conversation
        ? {
            id: conversation.id,
            participant_account_ids: conversation.participantAccountIds,
          }
        : null,
    })
    if (!decision.allowed) {
      return sendErr(reply, decision.code, decision.reason, 403)
    }

    if (body.op === 'listMessages') {
      const messages = await prisma.message.findMany({
        where: { conversationId: body.conversationId },
        orderBy: { createdAt: 'asc' },
      })
      return sendOk(reply, { messages })
    }

    if (body.op === 'sendMessage') {
      const message = await prisma.message.create({
        data: {
          conversationId: body.conversationId,
          senderAccountId: actor.accountId,
          text: body.text ?? null,
          attachment:
            body.attachment != null
              ? (body.attachment as Prisma.InputJsonValue)
              : undefined,
        },
      })
      return sendOk(reply, { message })
    }

    return sendErr(reply, 'invalid', 'unknown op')
  })
}
