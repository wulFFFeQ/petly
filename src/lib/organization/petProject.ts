/**
 * projectPetForOrganization — permission-filtered pet view for org actors (K44).
 * Same privacy pattern as projectPetForProfessional; never leaks microchip / owner PII.
 */

import type { HealthRecord, Pet, PetDocument } from '../../types'
import { toAuthorizedDocumentViews } from '../clinical/documentProjection'
import {
  canOrganizationActorViewDocuments,
  canOrganizationActorViewHealth,
  canOrganizationActorViewMedications,
  canOrganizationActorViewVaccinations,
  isMemberPetEligible,
  isOrganizationPetAccessEffective,
  type ActorOrgPetAccessContext,
} from './petAccess'
import type { OrganizationMembership, OrganizationPetAccess } from './types'

/**
 * Permission-filtered view of a pet for an organization actor.
 * Reads from existing SSOT — never a parallel health store.
 */
export interface OrganizationPetView {
  petId: string
  name?: string
  type?: string
  breed?: string
  healthRecords?: HealthRecord[]
  vaccinations?: HealthRecord[]
  medications?: HealthRecord[]
  documents?: PetDocument[]
}

export type ProjectOrganizationPetOptions = {
  access: OrganizationPetAccess | null | undefined
  membership: OrganizationMembership | null | undefined
  actorAccountId: string
  healthRecords?: HealthRecord[]
  documents?: PetDocument[]
  /** Owner contact blob — must never appear on the view. */
  ownerContacts?: { phone?: string; email?: string; address?: string }
  now?: number
}

/** Keys that must never appear on an organization pet view. */
export const ORGANIZATION_PET_VIEW_FORBIDDEN_KEYS = [
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

export function assertOrganizationPetViewSafe(view: OrganizationPetView): void {
  const record = view as Record<string, unknown>
  for (const key of ORGANIZATION_PET_VIEW_FORBIDDEN_KEYS) {
    if (key in record && record[key] != null) {
      throw new Error(`OrganizationPetView must not include ${key}`)
    }
  }
}

/**
 * Project pet data for an organization member under OrganizationPetAccess.
 * Ineffective grant, inactive membership, or ineligible member → `{ petId }` only.
 */
export function projectPetForOrganization(
  pet: Pet,
  options: ProjectOrganizationPetOptions,
): OrganizationPetView {
  const now = options.now ?? Date.now()
  const view: OrganizationPetView = { petId: pet.id }

  const ctx: ActorOrgPetAccessContext = {
    access: options.access,
    membership: options.membership,
    actorAccountId: options.actorAccountId,
    now,
  }

  if (
    !isOrganizationPetAccessEffective(options.access, now) ||
    !options.access ||
    !isMemberPetEligible(options.access, options.membership, options.actorAccountId)
  ) {
    void options.ownerContacts
    void pet.microchip
    assertOrganizationPetViewSafe(view)
    return view
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

  if (canOrganizationActorViewHealth(ctx)) {
    view.healthRecords = [...petRecords]
  }

  if (canOrganizationActorViewVaccinations(ctx)) {
    view.vaccinations = petRecords.filter((r) => r.type === 'vaccination')
  }

  if (canOrganizationActorViewMedications(ctx)) {
    view.medications = petRecords.filter((r) => r.type === 'medication')
  }

  if (canOrganizationActorViewDocuments(ctx)) {
    view.documents = toAuthorizedDocumentViews(petDocs, 'organization')
  }

  void options.ownerContacts
  void pet.microchip
  assertOrganizationPetViewSafe(view)
  return view
}
