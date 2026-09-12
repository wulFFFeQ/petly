/**
 * Projection helpers — authorize FIRST, then project.
 * Projection never replaces authorization.
 */

import type { HealthRecord, Pet, PetDocument } from '../../../types'
import { projectPetForHousehold } from '../../household/project'
import type { PetHouseholdAccess } from '../../household/types'
import { projectPetForOrganization } from '../../organization/petProject'
import type { OrganizationMembership, OrganizationPetAccess } from '../../organization/types'
import { projectPetForProfessional } from '../../professional/project'
import type { PetProfessionalAccess } from '../../professional/types'
import { projectAuthorizedPublicPet } from './public'
import type { AuthorizationDecision } from '../types'

export function projectAfterAuthorize(
  decision: AuthorizationDecision,
  pet: Pet,
  options: {
    path: 'household' | 'professional' | 'organization' | 'public' | 'owner'
    householdAccess?: PetHouseholdAccess | null
    professionalAccess?: PetProfessionalAccess | null
    organizationAccess?: OrganizationPetAccess | null
    membership?: OrganizationMembership | null
    actorAccountId?: string
    /** Clinical SSOT — forwarded into domain projectors (K50). */
    healthRecords?: HealthRecord[]
    documents?: PetDocument[]
  },
): unknown | null {
  if (!decision.allowed) return null

  switch (options.path) {
    case 'public':
      return projectAuthorizedPublicPet(pet)
    case 'owner':
    case 'household': {
      const view = projectPetForHousehold(pet, {
        actorAccountId: options.actorAccountId ?? '',
        access: options.householdAccess,
        healthRecords: options.healthRecords,
        documents: options.documents,
      })
      return view
    }
    case 'professional': {
      const { view } = projectPetForProfessional(pet, {
        access: options.professionalAccess ?? null,
        healthRecords: options.healthRecords,
        documents: options.documents,
      })
      return view
    }
    case 'organization':
      return projectPetForOrganization(pet, {
        access: options.organizationAccess ?? null,
        membership: options.membership ?? null,
        actorAccountId: options.actorAccountId ?? '',
        healthRecords: options.healthRecords,
        documents: options.documents,
      })
    default:
      return null
  }
}
