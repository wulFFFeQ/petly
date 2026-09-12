/**
 * K51 — Minimal clinical provenance stamps for existing HealthRecord /
 * PetDocument / WeightMeasurement. Not a new Health or Actor model.
 *
 * recordSource is metadata only — never an authorization bypass.
 * K57 — version is server/DEMO-authority; client Partial must never set it.
 */

import type {
  ClinicalLifecycleStatus,
  ClinicalRecordSource,
  HealthRecord,
  Pet,
  PetDocument,
  WeightMeasurement,
} from '../../types'
import { findHouseholdAccess } from '../household/access'
import { loadPetHouseholdAccess } from '../household/storage'
import { isPetOwner } from '../pets/ownership'
import { actorAccountId } from '../security/context'
import { resolveAppClinicalStampContext } from '../clinical/runtime'
import type { SecurityContext } from '../security/types'

export type ClinicalCreateStamp = {
  createdAt: string
  updatedAt: string
  createdByAccountId?: string
  updatedByAccountId?: string
  recordSource?: ClinicalRecordSource
  lifecycleStatus: ClinicalLifecycleStatus
  version: number
}

export type ClinicalUpdateStamp = {
  createdAt?: string
  createdByAccountId?: string
  updatedAt: string
  updatedByAccountId?: string
  recordSource?: ClinicalRecordSource
  lifecycleStatus?: ClinicalLifecycleStatus
}

/** Fields that client Partial updates must never overwrite. */
export const HEALTH_RECORD_IMMUTABLE_KEYS = [
  'id',
  'petId',
  'createdAt',
  'createdByAccountId',
  'lifecycleStatus',
  'withdrawnAt',
  'withdrawnByAccountId',
  'version',
] as const

export const DOCUMENT_IMMUTABLE_KEYS = [
  'id',
  'petId',
  'uploadedAt',
  'uploadedByAccountId',
  'lifecycleStatus',
  'withdrawnAt',
  'withdrawnByAccountId',
  'version',
  /** K59 — encounter link immutable after create (reference only, not authz). */
  'encounterId',
] as const

/** K58 — Encounter identity / provenance never client-authoritative. */
export const ENCOUNTER_IMMUTABLE_KEYS = [
  'id',
  'petId',
  'createdAt',
  'createdByAccountId',
  'lifecycleStatus',
  'withdrawnAt',
  'withdrawnByAccountId',
  'version',
] as const

const PROVENANCE_STRIP_KEYS = new Set([
  'id',
  'petId',
  'createdAt',
  'createdByAccountId',
  'updatedAt',
  'updatedByAccountId',
  'uploadedAt',
  'uploadedByAccountId',
  'recordSource',
  'lifecycleStatus',
  'withdrawnAt',
  'withdrawnByAccountId',
  'ownerAccountId',
  'ownerContacts',
  'microchip',
  'version',
  'mutationKind',
  'correctionOfVersion',
  'correctionReason',
  /** K59 — encounter link not client-mutable after create. */
  'encounterId',
  'isPublic',
])

/** Current SecurityContext for stamping after clinicalGate ALLOW (DEMO or REAL). */
export function resolveClinicalStampContext(): SecurityContext {
  return resolveAppClinicalStampContext()
}

/**
 * Best-effort informational source from ownership / HH role / pro / org facet.
 * Does NOT grant permissions.
 */
export function resolveRecordSource(
  ctx: SecurityContext,
  pet: Pick<Pet, 'id' | 'ownerAccountId'> | Pet,
): ClinicalRecordSource | undefined {
  const accountId = actorAccountId(ctx)
  if (!accountId) return undefined

  if (ctx.organization?.organizationId) return 'organization'
  if (ctx.professional?.professionalProfileId || ctx.activeMode === 'professional') {
    return 'professional'
  }

  if (isPetOwner(pet, accountId)) return 'owner'

  const access = findHouseholdAccess(loadPetHouseholdAccess(), pet.id, accountId)
  if (access?.role === 'co_owner') return 'co_owner'
  if (access?.role === 'caregiver') return 'caregiver'

  return undefined
}

export function stampNewClinicalRecord(
  ctx: SecurityContext,
  pet?: Pick<Pet, 'id' | 'ownerAccountId'> | Pet,
): ClinicalCreateStamp {
  const now = new Date().toISOString()
  const actor = actorAccountId(ctx)
  const source = pet ? resolveRecordSource(ctx, pet) : undefined
  return {
    createdAt: now,
    updatedAt: now,
    ...(actor ? { createdByAccountId: actor, updatedByAccountId: actor } : {}),
    ...(source ? { recordSource: source } : {}),
    lifecycleStatus: 'active',
    version: 1,
  }
}

export function stampClinicalUpdate(
  existing: {
    createdAt?: string
    createdByAccountId?: string
    recordSource?: ClinicalRecordSource
    lifecycleStatus?: ClinicalLifecycleStatus
  },
  ctx: SecurityContext,
): ClinicalUpdateStamp {
  const now = new Date().toISOString()
  const actor = actorAccountId(ctx)
  return {
    createdAt: existing.createdAt,
    createdByAccountId: existing.createdByAccountId,
    updatedAt: now,
    ...(actor ? { updatedByAccountId: actor } : {}),
    recordSource: existing.recordSource,
    lifecycleStatus: existing.lifecycleStatus ?? 'active',
  }
}

export function stampClinicalWithdraw(
  existing: HealthRecord | PetDocument,
  ctx: SecurityContext,
): Pick<
  HealthRecord,
  | 'lifecycleStatus'
  | 'withdrawnAt'
  | 'withdrawnByAccountId'
  | 'updatedAt'
  | 'updatedByAccountId'
  | 'createdAt'
  | 'createdByAccountId'
  | 'recordSource'
> {
  const now = new Date().toISOString()
  const actor = actorAccountId(ctx)
  const createdAt =
    'createdAt' in existing && typeof existing.createdAt === 'string'
      ? existing.createdAt
      : 'uploadedAt' in existing
        ? existing.uploadedAt
        : undefined
  const createdBy =
    'createdByAccountId' in existing
      ? existing.createdByAccountId
      : 'uploadedByAccountId' in existing
        ? existing.uploadedByAccountId
        : undefined

  return {
    createdAt,
    createdByAccountId: createdBy,
    recordSource: existing.recordSource,
    lifecycleStatus: 'withdrawn',
    withdrawnAt: now,
    ...(actor ? { withdrawnByAccountId: actor, updatedByAccountId: actor } : {}),
    updatedAt: now,
  }
}

/** Strip provenance / ownership / identity / version keys from client Partial updates. */
export function stripClinicalClientUpdates<T extends Record<string, unknown>>(
  updates: T,
): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(updates)) {
    if (PROVENANCE_STRIP_KEYS.has(key)) continue
    out[key] = value
  }
  return out as Partial<T>
}

export function isClinicalWithdrawn(
  record: Pick<HealthRecord, 'lifecycleStatus'> | Pick<PetDocument, 'lifecycleStatus'>,
): boolean {
  return record.lifecycleStatus === 'withdrawn'
}

/** Safe Czech UI label — never expose account IDs. */
export function clinicalRecordSourceLabel(
  source: ClinicalRecordSource | undefined,
): string | null {
  switch (source) {
    case 'owner':
      return 'Přidáno majitelem'
    case 'co_owner':
      return 'Přidáno spolumajitelem'
    case 'caregiver':
      return 'Přidáno pečovatelem'
    case 'professional':
      return 'Přidáno veterinářem'
    case 'organization':
      return 'Přidáno organizací'
    default:
      return null
  }
}

/** Format updatedAt for progressive disclosure (locale date/time). */
export function formatClinicalUpdatedAt(iso: string | undefined): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  try {
    return new Intl.DateTimeFormat('cs-CZ', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms))
  } catch {
    return iso
  }
}

/**
 * Backfill missing timestamps / version for legacy/seed rows.
 * Never invents fake actors or fabricated multi-version history.
 */
export function normalizeHealthRecordProvenance(record: HealthRecord): HealthRecord {
  const now = new Date().toISOString()
  const createdAt = record.createdAt ?? now
  const updatedAt = record.updatedAt ?? createdAt
  const lifecycleStatus = record.lifecycleStatus ?? 'active'
  const version =
    typeof record.version === 'number' && Number.isInteger(record.version) && record.version >= 1
      ? record.version
      : 1
  if (
    record.createdAt === createdAt &&
    record.updatedAt === updatedAt &&
    record.lifecycleStatus === lifecycleStatus &&
    record.version === version
  ) {
    return record
  }
  return {
    ...record,
    createdAt,
    updatedAt,
    lifecycleStatus,
    version,
  }
}

/** Additive version normalize for PetDocument — no fabricated history. */
export function normalizePetDocumentVersion(doc: PetDocument): PetDocument {
  const version =
    typeof doc.version === 'number' && Number.isInteger(doc.version) && doc.version >= 1
      ? doc.version
      : 1
  if (doc.version === version) return doc
  return { ...doc, version }
}

/** Additive version normalize for WeightMeasurement — no fabricated history. */
export function normalizeWeightMeasurementVersion(
  entry: WeightMeasurement,
): WeightMeasurement {
  const version =
    typeof entry.version === 'number' && Number.isInteger(entry.version) && entry.version >= 1
      ? entry.version
      : 1
  if (entry.version === version) return entry
  return { ...entry, version }
}

export function stampWeightCreate(
  ctx: SecurityContext,
  pet: Pick<Pet, 'id' | 'ownerAccountId'> | Pet,
  entry: Omit<
    WeightMeasurement,
    'createdAt' | 'updatedAt' | 'createdByAccountId' | 'updatedByAccountId' | 'recordSource' | 'version'
  >,
): WeightMeasurement {
  const stamp = stampNewClinicalRecord(ctx, pet)
  return {
    ...entry,
    createdAt: stamp.createdAt,
    updatedAt: stamp.updatedAt,
    createdByAccountId: stamp.createdByAccountId,
    updatedByAccountId: stamp.updatedByAccountId,
    recordSource: stamp.recordSource,
    version: 1,
  }
}

/** Current version integer from a clinical row (migration: missing → 1). */
export function clinicalCurrentVersion(
  record: { version?: number } | null | undefined,
): number {
  if (
    record &&
    typeof record.version === 'number' &&
    Number.isInteger(record.version) &&
    record.version >= 1
  ) {
    return record.version
  }
  return 1
}
