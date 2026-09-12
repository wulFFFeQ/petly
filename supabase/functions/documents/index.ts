/**
 * Documents: authorize → validate → upload/metadata OR signed download.
 * Private bucket only. No malware scanner (production gap hook).
 */

import { authorizePetAction, rejectForgedActorClaim } from '../_shared/authorize.ts'
import { loadPetAuthzBundle, recordAuditEvent } from '../_shared/db.ts'
import {
  bindRequestCors,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
  requireActorAccountId,
} from '../_shared/http.ts'

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'text/plain',
])

const BLOCKED_EXT = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'js',
  'mjs',
  'sh',
  'ps1',
  'dll',
  'msi',
  'scr',
  'vbs',
])

const MAX_BYTES = 25 * 1024 * 1024

type Body = {
  op: 'prepareUpload' | 'completeUpload' | 'signedDownload'
  petId: string
  claimedActorAccountId?: string
  activeMode?: 'personal' | 'professional' | 'organization'
  filename?: string
  mimeType?: string
  sizeBytes?: number
  documentId?: string
  storageKey?: string
  documentType?: string
  category?: string
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
  if (forged) return errorResponse(forged.code, forged.reason, 403)

  let db
  try {
    db = getServiceClient()
  } catch {
    return errorResponse('not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
  }

  const action =
    body.op === 'signedDownload' ? ('documents.read' as const) : ('documents.write' as const)

  const bundle = await loadPetAuthzBundle(db, body.petId, actor.accountId)
  if (!bundle.pet) return errorResponse('not_found', 'Pet not found', 404)

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
    correlationId: body.correlationId,
  })

  if (!decision.allowed) {
    return errorResponse(decision.code, decision.reason, 403)
  }

  if (body.op === 'prepareUpload' || body.op === 'completeUpload') {
    // Malware scanning provider not configured — production uploads MUST stay disabled.
    // Do not invent a fake scanner. Authorized download of existing objects remains allowed.
    return errorResponse(
      'upload_disabled',
      'Document upload is disabled until secure malware scanning is activated.',
      503,
      { malwareScanStatus: 'not_configured' },
    )
  }

  // signedDownload
  if (!body.documentId) return errorResponse('invalid', 'documentId required')
  const { data: doc, error } = await db
    .from('pet_documents')
    .select('*')
    .eq('id', body.documentId)
    .eq('pet_id', body.petId)
    .maybeSingle()
  if (error || !doc) return errorResponse('not_found', 'Document not found', 404)

  const { data: signed, error: signErr } = await db.storage
    .from('pet-documents')
    .createSignedUrl(doc.storage_key, 60)
  if (signErr || !signed?.signedUrl) {
    return errorResponse('storage_error', signErr?.message ?? 'sign failed', 500)
  }
  return jsonResponse({
    ok: true,
    signedUrl: signed.signedUrl,
    expiresInSeconds: 60,
    filename: doc.filename,
    mimeType: doc.mime_type,
  })
})

// Upload validation helpers remain documented in LAUNCH-02; re-enable with malware scanner.
void ALLOWED_MIME
void BLOCKED_EXT
void MAX_BYTES

