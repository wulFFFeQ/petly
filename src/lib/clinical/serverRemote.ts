/**
 * Production clinical remote API — Edge Function calls.
 * Used when production backend is configured; DEMO path stays local.
 */

import { invokeEdgeFunction } from '../api/edgeClient'
import { isProductionBackendConfigured } from '../backend/config'

export function canUseServerClinicalRemote(): boolean {
  return isProductionBackendConfigured()
}

export async function serverListHealthRecords(petId: string) {
  return invokeEdgeFunction<{ records: unknown[] }>('clinical', {
    op: 'listHealthRecords',
    petId,
  })
}

export async function serverUpsertHealthRecord(input: {
  petId: string
  record: Record<string, unknown>
  expectedVersion?: number
  idempotencyKey?: string
  activeMode?: 'personal' | 'professional' | 'organization'
}) {
  return invokeEdgeFunction('clinical', {
    op: 'upsertHealthRecord',
    ...input,
  })
}

export async function serverEmergencyWrite(input: {
  petId: string
  emergencyCard: Record<string, unknown>
  idempotencyKey?: string
}) {
  return invokeEdgeFunction('clinical', {
    op: 'emergencyWrite',
    ...input,
  })
}

export async function serverPrepareDocumentUpload(input: {
  petId: string
  filename: string
  mimeType: string
  sizeBytes: number
}) {
  return invokeEdgeFunction('documents', {
    op: 'prepareUpload',
    ...input,
  })
}

export async function serverSignedDocumentDownload(input: {
  petId: string
  documentId: string
}) {
  return invokeEdgeFunction('documents', {
    op: 'signedDownload',
    ...input,
  })
}
