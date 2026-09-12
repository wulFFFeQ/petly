import type { FastifyInstance } from 'fastify'
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
import { prisma } from '../prisma.js'
import { createSignedDownloadUrl, isStorageConfigured } from '../storage/s3.js'

type Body = {
  op: 'prepareUpload' | 'completeUpload' | 'signedDownload'
  claimedActorAccountId?: string
  petId?: string
  documentId?: string
  correlationId?: string
  activeMode?: 'personal' | 'professional' | 'organization'
}

export function registerDocumentsRoutes(app: FastifyInstance, env: ServerEnv) {
  app.post('/api/documents', async (request, reply) => {
    const actor = await requireActor(env, request, reply)
    if (!actor) return

    const body = (request.body ?? {}) as Body
    if (!body.op) return sendErr(reply, 'invalid', 'op required')
    if (!body.petId) return sendErr(reply, 'invalid', 'petId required')

    const forged = forgedDeny(
      rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId),
    )
    if (forged) return sendErr(reply, forged.code, forged.reason, 403)

    if (body.op === 'prepareUpload' || body.op === 'completeUpload') {
      return sendErr(
        reply,
        'upload_disabled',
        'Document upload disabled until malware scanner is configured',
        503,
        { malwareScanStatus: 'not_configured' },
      )
    }

    if (body.op !== 'signedDownload') return sendErr(reply, 'invalid', 'unknown op')
    if (!body.documentId) return sendErr(reply, 'invalid', 'documentId required')

    const bundle = await loadPetAuthzBundle(body.petId, actor.accountId)
    if (!bundle.pet) return sendErr(reply, 'not_found', 'Pet not found', 404)

    const action: SecurityAction = 'documents.read'
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
      resourceType: 'pet_document',
      resourceId: body.documentId,
      action,
      result: decision.allowed ? 'allow' : 'deny',
      denyCode: decision.allowed ? undefined : decision.code,
      allowPath: decision.allowed ? decision.path : undefined,
      correlationId: body.correlationId,
    })

    if (!decision.allowed) {
      return sendErr(reply, decision.code, decision.reason, 403)
    }

    const doc = await prisma.petDocument.findFirst({
      where: { id: body.documentId, petId: body.petId },
    })
    if (!doc) return sendErr(reply, 'not_found', 'Document not found', 404)

    if (!isStorageConfigured(env)) {
      return sendErr(reply, 'not_configured', 'Object storage not configured', 503)
    }

    const signedUrl = await createSignedDownloadUrl(env, doc.storageKey, 60)
    if (!signedUrl) {
      return sendErr(reply, 'not_configured', 'Object storage not configured', 503)
    }

    return sendOk(reply, {
      signedUrl,
      expiresInSeconds: 60,
      filename: doc.filename,
      mimeType: doc.mimeType,
    })
  })
}
