/**
 * K51 — Minimal clinical provenance stamps for existing HealthRecord /
 * PetDocument / WeightMeasurement. Not a new Health or Actor model.
 *
 * recordSource is metadata only — never an authorization bypass.
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
import { createDemoSecurityContext } from '../security/demoSessionAdapter'
import type { SecurityContext } from '../security/types'

export type ClinicalCreateStamp = {
  createdAt: string
  updatedAt: string
  createdByAccountId?: string
  updatedByAccountId?: string
  recordSource?: ClinicalRecordSource
  lifecycleStatus: ClinicalLifecycleStatus
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
] as const

export const DOCUMENT_IMMUTABLE_KEYS = [
  'id',
  'petId',
  'uploadedAt',
  'uploadedByAccountId',
  'lifecycleStatus',
  'withdrawnAt',
  'withdrawnByAccountId',
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
])

/** Current DEMO SecurityContext for stamping after clinicalGate ALLOW. */
export function resolveClinicalStampContext(): SecurityContext {
  return createDemoSecurityContext().context
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

/** Strip provenance / ownership / identity keys from client Partial updates. */
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
 * Backfill missing timestamps for legacy/seed rows.
 * Never invents fake actors.
 */
export function normalizeHealthRecordProvenance(record: HealthRecord): HealthRecord {
  const now = new Date().toISOString()
  const createdAt = record.createdAt ?? now
  const updatedAt = record.updatedAt ?? createdAt
  const lifecycleStatus = record.lifecycleStatus ?? 'active'
  if (
    record.createdAt === createdAt &&
    record.updatedAt === updatedAt &&
    record.lifecycleStatus === lifecycleStatus
  ) {
    return record
  }
  return {
    ...record,
    createdAt,
    updatedAt,
    lifecycleStatus,
  }
}

export function stampWeightCreate(
  ctx: SecurityContext,
  pet: Pick<Pet, 'id' | 'ownerAccountId'> | Pet,
  entry: Omit<WeightMeasurement, 'createdAt' | 'updatedAt' | 'createdByAccountId' | 'updatedByAccountId' | 'recordSource'>,
): WeightMeasurement {
  const stamp = stampNewClinicalRecord(ctx, pet)
  return {
    ...entry,
    createdAt: stamp.createdAt,
    updatedAt: stamp.updatedAt,
    createdByAccountId: stamp.createdByAccountId,
    updatedByAccountId: stamp.updatedByAccountId,
    recordSource: stamp.recordSource,
  }
}
