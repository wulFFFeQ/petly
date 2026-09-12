/**
 * K62 — Emergency write scope validation.
 *
 * clinical.emergency.write mutates ONLY Pet.emergencyCard (Emergency Card SSOT).
 * Never HealthRecord / WeightMeasurement / PetDocument / Encounter / access grants.
 * Emergency card free-text is owner-authored acute projection — not clinical history SSOT.
 */

import type {
  EmergencyCardHealthContent,
  EmergencyCardSettings,
  EmergencyCardVetContent,
  EmergencyCardVisibility,
} from '../../types/emergencyCard'
import { ensureEmergencyCardSettings, mergeEmergencyVisibility } from '../emergencyCard/defaults'
import type { Pet } from '../../types'
import { ClinicalError } from './errors'
import { actorAccountId } from '../security/context'
import type { SecurityContext } from '../security/types'

/** Allowed top-level keys on emergency write patch. */
export const EMERGENCY_WRITE_ALLOWED_KEYS = [
  'publicSlug',
  'health',
  'vet',
  'ownerPhoneForPrint',
  'visibility',
] as const

/** Forbidden keys that indicate clinical / access escalation attempts. */
export const EMERGENCY_WRITE_FORBIDDEN_KEYS = [
  'healthRecords',
  'healthRecord',
  'recordId',
  'documentId',
  'documents',
  'weight',
  'weightMeasurement',
  'measurementId',
  'encounterId',
  'encounter',
  'medications',
  'vaccinations',
  'labs',
  'microchip',
  'ownerContacts',
  'canEmergencyWrite',
  'grantedBy',
  'grantedByAccountId',
  'createdBy',
  'createdByAccountId',
  'updatedBy',
  'updatedByAccountId',
  'actorId',
  'actorAccountId',
  'expiresAt',
  'capabilityId',
  'grantId',
  'permissions',
  'scope',
  'ownership',
  'ownerId',
] as const

export type ClinicalEmergencyWritePatch = {
  publicSlug?: string
  health?: EmergencyCardHealthContent | null
  vet?: EmergencyCardVetContent | null
  ownerPhoneForPrint?: string | null
  visibility?: Partial<EmergencyCardVisibility>
}

export type ClinicalEmergencyWriteInput = {
  petId: string
  /** Emergency Card field patch only. */
  patch: ClinicalEmergencyWritePatch
  /**
   * Client-forged provenance / escalation flags — if present → DENY.
   * Never trusted; trusted actor comes from SecurityContext.
   */
  claimedUpdatedByAccountId?: string
  claimedGrantedByAccountId?: string
  claimedActorAccountId?: string
  canEmergencyWrite?: boolean
  /** Any extra clinical entity mutation attempt. */
  healthRecord?: unknown
  weightMeasurement?: unknown
  document?: unknown
  encounter?: unknown
}

export type EmergencyWriteProvenance = {
  updatedAt: string
  updatedByAccountId: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertNoForbiddenKeys(raw: Record<string, unknown>, path: string): void {
  for (const key of Object.keys(raw)) {
    if ((EMERGENCY_WRITE_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      throw new ClinicalError(
        'FORBIDDEN',
        `Emergency write forbids field: ${path}${key}`,
        'isolation',
      )
    }
  }
}

function sanitizeHealth(
  health: EmergencyCardHealthContent | null | undefined,
): EmergencyCardHealthContent | undefined {
  if (health == null) return undefined
  if (!isPlainObject(health)) {
    throw new ClinicalError('INVALID_RESOURCE', 'Invalid emergency health content')
  }
  assertNoForbiddenKeys(health as Record<string, unknown>, 'health.')
  const out: EmergencyCardHealthContent = {}
  if (typeof health.allergies === 'string') out.allergies = health.allergies
  if (typeof health.chronicConditions === 'string') out.chronicConditions = health.chronicConditions
  if (typeof health.regularMedication === 'string') out.regularMedication = health.regularMedication
  if (typeof health.importantRestrictions === 'string') {
    out.importantRestrictions = health.importantRestrictions
  }
  if (typeof health.other === 'string') out.other = health.other
  return out
}

function sanitizeVet(
  vet: EmergencyCardVetContent | null | undefined,
): EmergencyCardVetContent | undefined {
  if (vet == null) return undefined
  if (!isPlainObject(vet)) {
    throw new ClinicalError('INVALID_RESOURCE', 'Invalid emergency vet content')
  }
  assertNoForbiddenKeys(vet as Record<string, unknown>, 'vet.')
  const clinicOrName =
    typeof vet.clinicOrName === 'string' ? vet.clinicOrName.trim() : ''
  if (!clinicOrName) {
    throw new ClinicalError('INVALID_RESOURCE', 'vet.clinicOrName is required')
  }
  const out: EmergencyCardVetContent = { clinicOrName }
  if (typeof vet.label === 'string') out.label = vet.label
  if (typeof vet.phone === 'string') out.phone = vet.phone
  if (typeof vet.navigateQuery === 'string') out.navigateQuery = vet.navigateQuery
  return out
}

/**
 * Validate emergency write input + strip forged provenance / clinical payloads.
 * Throws ClinicalError on deny / invalid input.
 */
export function assertValidEmergencyWriteInput(
  input: ClinicalEmergencyWriteInput,
  ctx: SecurityContext,
): ClinicalEmergencyWritePatch {
  if (!input?.petId?.trim()) {
    throw new ClinicalError('INVALID_RESOURCE', 'petId is required')
  }

  // Client must never self-assert emergency capability.
  if (input.canEmergencyWrite === true) {
    throw new ClinicalError(
      'FORBIDDEN',
      'Client cannot set canEmergencyWrite',
      'forged_identity',
    )
  }

  const trusted = actorAccountId(ctx)
  if (
    input.claimedUpdatedByAccountId &&
    input.claimedUpdatedByAccountId !== trusted
  ) {
    throw new ClinicalError('FORBIDDEN', 'Forged updatedBy rejected', 'forged_identity')
  }
  if (
    input.claimedGrantedByAccountId &&
    input.claimedGrantedByAccountId !== trusted
  ) {
    throw new ClinicalError('FORBIDDEN', 'Forged grantedBy rejected', 'forged_identity')
  }
  if (
    input.claimedActorAccountId &&
    input.claimedActorAccountId !== trusted
  ) {
    throw new ClinicalError('FORBIDDEN', 'Forged actor rejected', 'forged_identity')
  }

  if (
    input.healthRecord != null ||
    input.weightMeasurement != null ||
    input.document != null ||
    input.encounter != null
  ) {
    throw new ClinicalError(
      'FORBIDDEN',
      'clinical.emergency.write cannot mutate clinical entities',
      'isolation',
    )
  }

  const patchRaw = input.patch
  if (!isPlainObject(patchRaw)) {
    throw new ClinicalError('INVALID_RESOURCE', 'patch is required')
  }

  assertNoForbiddenKeys(patchRaw, '')

  for (const key of Object.keys(patchRaw)) {
    if (!(EMERGENCY_WRITE_ALLOWED_KEYS as readonly string[]).includes(key)) {
      throw new ClinicalError(
        'FORBIDDEN',
        `Emergency write forbids field: ${key}`,
        'isolation',
      )
    }
  }

  const patch: ClinicalEmergencyWritePatch = {}

  if ('publicSlug' in patchRaw) {
    if (typeof patchRaw.publicSlug !== 'string' || !patchRaw.publicSlug.trim()) {
      throw new ClinicalError('INVALID_RESOURCE', 'publicSlug must be a non-empty string')
    }
    const slug = patchRaw.publicSlug.trim()
    // Microchip must never become the public slug.
    if (/^\d{9,}$/.test(slug)) {
      throw new ClinicalError(
        'INVALID_RESOURCE',
        'publicSlug must not be a microchip number',
      )
    }
    patch.publicSlug = slug
  }

  if ('health' in patchRaw) {
    patch.health = sanitizeHealth(patchRaw.health as EmergencyCardHealthContent | null) ?? null
  }

  if ('vet' in patchRaw) {
    patch.vet = sanitizeVet(patchRaw.vet as EmergencyCardVetContent | null) ?? null
  }

  if ('ownerPhoneForPrint' in patchRaw) {
    const phone = patchRaw.ownerPhoneForPrint
    if (phone == null || phone === '') {
      patch.ownerPhoneForPrint = null
    } else if (typeof phone === 'string') {
      patch.ownerPhoneForPrint = phone
    } else {
      throw new ClinicalError('INVALID_RESOURCE', 'Invalid ownerPhoneForPrint')
    }
  }

  if ('visibility' in patchRaw) {
    if (!isPlainObject(patchRaw.visibility)) {
      throw new ClinicalError('INVALID_RESOURCE', 'Invalid visibility')
    }
    assertNoForbiddenKeys(patchRaw.visibility, 'visibility.')
    patch.visibility = patchRaw.visibility as Partial<EmergencyCardVisibility>
  }

  if (Object.keys(patch).length === 0) {
    throw new ClinicalError('INVALID_RESOURCE', 'Empty emergency write patch')
  }

  return patch
}

/** Merge validated patch onto existing Emergency Card (SSOT). */
export function applyEmergencyWritePatch(
  pet: Pet,
  patch: ClinicalEmergencyWritePatch,
): EmergencyCardSettings {
  const base = ensureEmergencyCardSettings(pet)
  const next: EmergencyCardSettings = {
    publicSlug: patch.publicSlug?.trim() || base.publicSlug,
    visibility: patch.visibility
      ? mergeEmergencyVisibility({ ...base.visibility, ...patch.visibility })
      : base.visibility,
  }

  if ('health' in patch) {
    if (patch.health == null) {
      // clear
    } else {
      next.health = patch.health
    }
  } else if (base.health) {
    next.health = base.health
  }

  if ('vet' in patch) {
    if (patch.vet != null) next.vet = patch.vet
  } else if (base.vet) {
    next.vet = base.vet
  }

  if ('ownerPhoneForPrint' in patch) {
    if (patch.ownerPhoneForPrint != null && patch.ownerPhoneForPrint !== '') {
      next.ownerPhoneForPrint = patch.ownerPhoneForPrint
    }
  } else if (base.ownerPhoneForPrint) {
    next.ownerPhoneForPrint = base.ownerPhoneForPrint
  }

  return next
}

export function stampEmergencyWriteProvenance(
  ctx: SecurityContext,
): EmergencyWriteProvenance {
  const accountId = actorAccountId(ctx)
  if (!accountId) {
    throw new ClinicalError('UNAUTHENTICATED', 'Authentication required', 'unauthenticated')
  }
  return {
    updatedAt: new Date().toISOString(),
    updatedByAccountId: accountId,
  }
}
