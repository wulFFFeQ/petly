import type { HealthRecord, Pet, PetDocument, WeightMeasurement } from '../../types'
import { toAuthorizedDocumentViews } from '../clinical/documentProjection'
import { toAuthorizedWeightViews } from '../clinical/measurementProjection'
import {
  canProfessionalViewDocuments,
  canProfessionalViewHealth,
  canProfessionalViewMedications,
  canProfessionalViewVaccinations,
  isAccessEffective,
} from './access'
import { appendAccessLog, createAccessLogEntry } from './audit'
import type { PetProfessionalAccess, ProfessionalAccessLog } from './types'

/**
 * Permission-filtered view of an owned pet for a professional.
 * Reads from existing SSOT (Pet / HealthRecord / PetDocument / WeightMeasurement) — never a parallel health store.
 * Microchip and ownerContacts are never included (no such permissions in KROK 17).
 */
export interface ProfessionalPetView {
  petId: string
  name?: string
  type?: string
  breed?: string
  healthRecords?: HealthRecord[]
  vaccinations?: HealthRecord[]
  medications?: HealthRecord[]
  documents?: PetDocument[]
  /** K60 — scrubbed WeightMeasurement series (requires viewHealth). */
  weightMeasurements?: WeightMeasurement[]
}

export type ProjectProfessionalPetOptions = {
  access: PetProfessionalAccess | null | undefined
  healthRecords?: HealthRecord[]
  documents?: PetDocument[]
  weightMeasurements?: WeightMeasurement[]
  /** Owner contact blob — must never appear on the view. */
  ownerContacts?: { phone?: string; email?: string; address?: string }
  now?: number
  /** Existing audit log list; new view entries are appended when logViews is true. */
  auditLogs?: ProfessionalAccessLog[]
  logViews?: boolean
}

export type ProjectProfessionalPetResult = {
  view: ProfessionalPetView
  logs: ProfessionalAccessLog[]
}

/**
 * Project pet data for a professional under PetProfessionalAccess.
 * Does not use ViewerRole=owner and never bypasses missing permissions.
 */
export function projectPetForProfessional(
  pet: Pet,
  options: ProjectProfessionalPetOptions,
): ProjectProfessionalPetResult {
  const now = options.now ?? Date.now()
  let logs = options.auditLogs ? [...options.auditLogs] : []
  const access = options.access

  const view: ProfessionalPetView = {
    petId: pet.id,
  }

  if (!isAccessEffective(access, now) || !access) {
    return { view, logs }
  }

  view.name = pet.name
  view.type = pet.type
  view.breed = pet.breed

  const petRecords = (options.healthRecords ?? []).filter(
    (r) => r.petId === pet.id && r.lifecycleStatus !== 'withdrawn',
  )
  const petDocs = (options.documents ?? []).filter(
    (d) => d.petId === pet.id && d.lifecycleStatus !== 'withdrawn',
  )
  const petWeights = (options.weightMeasurements ?? []).filter((w) => w.petId === pet.id)

  let viewedRecords = false
  let viewedDocs = false

  if (canProfessionalViewHealth(access, now)) {
    view.healthRecords = [...petRecords]
    view.weightMeasurements = toAuthorizedWeightViews(petWeights, 'professional')
    if (petRecords.length > 0 || petWeights.length > 0) viewedRecords = true
  }

  if (canProfessionalViewVaccinations(access, now)) {
    view.vaccinations = petRecords.filter((r) => r.type === 'vaccination')
    if (view.vaccinations.length > 0) viewedRecords = true
  }

  if (canProfessionalViewMedications(access, now)) {
    view.medications = petRecords.filter((r) => r.type === 'medication')
    if (view.medications.length > 0) viewedRecords = true
  }

  if (canProfessionalViewDocuments(access, now)) {
    view.documents = toAuthorizedDocumentViews(petDocs, 'professional')
    if (petDocs.length > 0) viewedDocs = true
  }

  // Explicit runtime guard: never attach microchip or owner contacts.
  void options.ownerContacts
  void pet.microchip

  if (options.logViews) {
    if (viewedRecords) {
      logs = appendAccessLog(
        logs,
        createAccessLogEntry({
          petId: pet.id,
          professionalId: access.professionalId,
          action: 'record_viewed',
          metadata: { accessId: access.id },
        }),
      )
    }
    if (viewedDocs) {
      logs = appendAccessLog(
        logs,
        createAccessLogEntry({
          petId: pet.id,
          professionalId: access.professionalId,
          action: 'document_viewed',
          metadata: { accessId: access.id },
        }),
      )
    }
  }

  return { view, logs }
}

/** Keys that must never appear on a professional pet view (privacy + KROK 17). */
export const PROFESSIONAL_VIEW_FORBIDDEN_KEYS = [
  'microchip',
  'microchipNumber',
  'microchipVerification',
  'ownerContacts',
  'ownerPhone',
  'ownerEmail',
  'ownerAddress',
  'phone',
  'email',
  'address',
  'professionalCredentials',
  'licenseNumber',
] as const

export function assertProfessionalViewSafe(view: ProfessionalPetView): void {
  const record = view as unknown as Record<string, unknown>
  for (const key of PROFESSIONAL_VIEW_FORBIDDEN_KEYS) {
    if (key in record && record[key] != null) {
      throw new Error(`ProfessionalPetView must not include ${key}`)
    }
  }
}
