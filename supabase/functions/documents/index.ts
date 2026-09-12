/**
 * Documents: authorize → validate → upload/metadata OR signed download.
 * Private bucket only. No malware scanner (production gap hook).
 */

import { authorizePetAction, rejectForgedActorClaim } from '../_shared/authorize.ts'
import { loadPetAuthzBundle, recordAuditEvent } from '../_shared/db.ts'
import {
  corsHeaders,
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
    return new Response('ok', { headers: corsHeaders })
  }

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
    const validation = validateUpload(body)
    if (!validation.ok) return errorResponse(validation.code, validation.message)

    // Hook for future malware scanning provider — not implemented (honest gap).
    const malwareScanStatus = 'not_configured'

    if (body.op === 'prepareUpload') {
      const documentId = crypto.randomUUID()
      const safeName = sanitizeFilename(body.filename!)
      const storageKey = `${body.petId}/${documentId}/${safeName}`
      const { data: signed, error } = await db.storage
        .from('pet-documents')
        .createSignedUploadUrl(storageKey)
      if (error) return errorResponse('storage_error', error.message, 500)
      return jsonResponse({
        ok: true,
        documentId,
        storageKey,
        signedUpload: signed,
        malwareScanStatus,
      })
    }

    // completeUpload — metadata transaction after authorized upload
    const documentId = body.documentId ?? crypto.randomUUID()
    const storageKey = body.storageKey!
    const row = {
      id: documentId,
      pet_id: body.petId,
      category: body.category ?? null,
      document_type: body.documentType ?? null,
      filename: sanitizeFilename(body.filename!),
      mime_type: body.mimeType!,
      size_bytes: body.sizeBytes!,
      storage_key: storageKey,
      is_public: false,
      version: 1,
      created_by_account_id: actor.accountId,
      payload: { malwareScanStatus },
    }
    const { data, error } = await db.from('pet_documents').insert(row).select('*').single()
    if (error) return errorResponse('db_error', error.message, 500)
    await db.from('pet_document_versions').insert({
      document_id: data.id,
      version: 1,
      snapshot: data,
    })
    return jsonResponse({ ok: true, document: data, malwareScanStatus })
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

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180)
}

function validateUpload(body: Body): { ok: true } | { ok: false; code: string; message: string } {
  if (!body.filename || !body.mimeType || typeof body.sizeBytes !== 'number') {
    return { ok: false, code: 'invalid', message: 'filename, mimeType, sizeBytes required' }
  }
  if (body.sizeBytes <= 0 || body.sizeBytes > MAX_BYTES) {
    return { ok: false, code: 'invalid_size', message: 'File size out of bounds' }
  }
  if (!ALLOWED_MIME.has(body.mimeType)) {
    return { ok: false, code: 'invalid_mime', message: 'MIME type not allowed' }
  }
  const ext = body.filename.split('.').pop()?.toLowerCase() ?? ''
  if (BLOCKED_EXT.has(ext)) {
    return { ok: false, code: 'executable_rejected', message: 'Executable content rejected' }
  }
  return { ok: true }
}
