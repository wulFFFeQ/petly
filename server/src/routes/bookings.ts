import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { rejectForgedActorClaim } from '../authorize/petAuthorize.js'
import { requireActor } from '../auth/session.js'
import type { ServerEnv } from '../env.js'
import { sendErr, sendOk } from '../http.js'
import { prisma } from '../prisma.js'

const BLOCKING = new Set(['requested', 'payment_pending', 'confirmed'])

type Body = {
  op:
    | 'create'
    | 'confirm'
    | 'decline'
    | 'cancel'
    | 'complete'
    | 'no_show'
    | 'reschedule'
  claimedActorAccountId?: string
  ownerAccountId?: string
  bookingId?: string
  professionalId?: string
  serviceId?: string
  petId?: string
  startAt?: string
  endAt?: string
  note?: string
  petName?: string
  professionalName?: string
  ownerDisplayName?: string
}

async function hasOverlap(input: {
  professionalId: string
  startAt: Date
  endAt: Date
  excludeId?: string
}): Promise<boolean> {
  const rows = await prisma.booking.findMany({
    where: {
      professionalId: input.professionalId,
      status: { in: [...BLOCKING] },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
    },
    select: { id: true },
    take: 1,
  })
  return rows.length > 0
}

export function registerBookingsRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/bookings', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')

    const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    if (body.op === 'create') {
      if (body.ownerAccountId && body.ownerAccountId !== actor.accountId) {
        return sendErr(reply, 'forged_owner', 'ownerAccountId does not match session', 403)
      }
      if (!body.professionalId || !body.serviceId || !body.petId || !body.startAt || !body.endAt) {
        return sendErr(reply, 'invalid', 'professionalId, serviceId, petId, startAt, endAt required')
      }
      const service = await prisma.professionalService.findFirst({
        where: {
          id: body.serviceId,
          professionalId: body.professionalId,
          active: true,
        },
      })
      if (!service) return sendErr(reply, 'not_found', 'Service not found', 404)

      const startAt = new Date(body.startAt)
      const endAt = new Date(body.endAt)
      const durationMs = endAt.getTime() - startAt.getTime()
      const expectedMs = service.durationMinutes * 60 * 1000
      if (Math.abs(durationMs - expectedMs) > 60_000) {
        return sendErr(reply, 'invalid', 'endAt must match service duration')
      }
      if (await hasOverlap({ professionalId: body.professionalId, startAt, endAt })) {
        return sendErr(reply, 'slot_conflict', 'Time slot conflicts with existing booking', 409)
      }

      const professional = await prisma.professionalProfile.findUnique({
        where: { id: body.professionalId },
      })
      const booking = await prisma.booking.create({
        data: {
          ownerAccountId: actor.accountId,
          professionalId: body.professionalId,
          serviceId: body.serviceId,
          petId: body.petId,
          startAt,
          endAt,
          status: 'requested',
          note: body.note ?? null,
          serviceNameSnapshot: service.name,
          petName: body.petName ?? null,
          professionalName: body.professionalName ?? professional?.displayName ?? null,
          ownerDisplayName: body.ownerDisplayName ?? null,
          priceSnapshot: service.price,
          currencySnapshot: service.currency,
          durationSnapshot: service.durationMinutes,
        },
      })
      return sendOk(reply, { booking })
    }

    if (!body.bookingId) return sendErr(reply, 'invalid', 'bookingId required')
    const booking = await prisma.booking.findUnique({
      where: { id: body.bookingId },
      include: { professional: true },
    })
    if (!booking) return sendErr(reply, 'not_found', 'Booking not found', 404)

    const isOwner = booking.ownerAccountId === actor.accountId
    const isPro = booking.professional.accountId === actor.accountId

    if (body.op === 'confirm') {
      if (!isPro) return sendErr(reply, 'forbidden', 'Only professional may confirm', 403)
      if (!['requested', 'payment_pending'].includes(booking.status)) {
        return sendErr(reply, 'invalid_state', 'Cannot confirm from current state', 409)
      }
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'confirmed', confirmedAt: new Date() },
      })
      return sendOk(reply, { booking: updated })
    }

    if (body.op === 'decline') {
      if (!isPro) return sendErr(reply, 'forbidden', 'Only professional may decline', 403)
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'declined', declinedAt: new Date() },
      })
      return sendOk(reply, { booking: updated })
    }

    if (body.op === 'cancel') {
      if (!isOwner && !isPro) return sendErr(reply, 'forbidden', 'Not a booking party', 403)
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: isOwner ? 'cancelled_by_owner' : 'cancelled_by_professional',
          cancelledAt: new Date(),
        },
      })
      return sendOk(reply, { booking: updated })
    }

    if (body.op === 'complete') {
      if (!isPro) return sendErr(reply, 'forbidden', 'Only professional may complete', 403)
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'completed', completedAt: new Date() },
      })
      return sendOk(reply, { booking: updated })
    }

    if (body.op === 'no_show') {
      if (!isPro) return sendErr(reply, 'forbidden', 'Only professional may mark no_show', 403)
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'no_show', noShowAt: new Date() },
      })
      return sendOk(reply, { booking: updated })
    }

    if (body.op === 'reschedule') {
      if (!isOwner && !isPro) return sendErr(reply, 'forbidden', 'Not a booking party', 403)
      if (!body.startAt || !body.endAt) {
        return sendErr(reply, 'invalid', 'startAt and endAt required')
      }
      const startAt = new Date(body.startAt)
      const endAt = new Date(body.endAt)
      if (
        await hasOverlap({
          professionalId: booking.professionalId,
          startAt,
          endAt,
          excludeId: booking.id,
        })
      ) {
        return sendErr(reply, 'slot_conflict', 'Time slot conflicts with existing booking', 409)
      }
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          startAt,
          endAt,
          originalStartAt: booking.originalStartAt ?? booking.startAt,
          originalEndAt: booking.originalEndAt ?? booking.endAt,
          rescheduledAt: new Date(),
          status: booking.status === 'confirmed' ? 'confirmed' : 'requested',
        },
      })
      return sendOk(reply, { booking: updated })
    }

    void Prisma
    return sendErr(reply, 'invalid', 'unknown op')
  })
}
