/**
 * Projection helpers — authorize FIRST, then project.
 * Projection never replaces authorization.
 */

import { projectPetForHousehold } from '../../household/project'
import type { PetHouseholdAccess } from '../../household/types'
import { projectPetForOrganization } from '../../organization/petProject'
import type { OrganizationMembership, OrganizationPetAccess } from '../../organization/types'
import { projectPetForProfessional } from '../../professional/project'
import type { PetProfessionalAccess } from '../../professional/types'
import type { Pet } from '../../../types'
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
  },
): unknown | null {
  if (!decision.allowed) return null

  switch (options.path) {
    case 'public':
      return projectAuthorizedPublicPet(pet)
    case 'owner':
    case 'household':
      return projectPetForHousehold(pet, {
        actorAccountId: options.actorAccountId ?? '',
        access: options.householdAccess,
      })
    case 'professional':
      return projectPetForProfessional(pet, {
        access: options.professionalAccess ?? null,
      })
    case 'organization':
      return projectPetForOrganization(pet, {
        access: options.organizationAccess ?? null,
        membership: options.membership ?? null,
        actorAccountId: options.actorAccountId ?? '',
      })
    default:
      return null
  }
}
