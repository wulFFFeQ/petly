/**
 * Logical security actions and their domain vocab mappings.
 * Existing HouseholdPetPermission / ProfessionalPermission remain source of truth.
 */

import type { HouseholdPetPermission } from '../household/types'
import type { ProfessionalPermission } from '../professional/types'
import type { SecurityAction } from './types'

export const KNOWN_SECURITY_ACTIONS: SecurityAction[] = [
  'health.read',
  'health.write',
  'medication.read',
  'medication.write',
  'documents.read',
  'documents.write',
  'labs.read',
  'labs.write',
  'vaccination.read',
  'vaccination.write',
  'microchip.read',
  'ownerContacts.read',
  'pet.profile.read',
  'pet.profile.write',
  'booking.read',
  'booking.confirm',
  'booking.cancel',
  'payment.read',
  'payment.checkout',
  'messaging.read',
  'messaging.send',
  'public.pet.project',
  'organization.ops',
  'organization.pet.access',
]

export function isKnownSecurityAction(action: string): action is SecurityAction {
  return (KNOWN_SECURITY_ACTIONS as string[]).includes(action)
}

/** Pet-scoped health / profile actions that use HH / Pro / Org paths. */
export function isPetDataAction(action: SecurityAction): boolean {
  return (
    action.startsWith('health.') ||
    action.startsWith('medication.') ||
    action.startsWith('documents.') ||
    action.startsWith('labs.') ||
    action.startsWith('vaccination.') ||
    action.startsWith('pet.profile.') ||
    action === 'microchip.read' ||
    action === 'ownerContacts.read' ||
    action === 'organization.pet.access'
  )
}

export function isBookingAction(action: SecurityAction): boolean {
  return action.startsWith('booking.')
}

export function isPaymentAction(action: SecurityAction): boolean {
  return action.startsWith('payment.')
}

export function isMessagingAction(action: SecurityAction): boolean {
  return action.startsWith('messaging.')
}

export function isPublicAction(action: SecurityAction): boolean {
  return action === 'public.pet.project'
}

/**
 * Map logical health/profile action → HouseholdPetPermission.
 * Labs fold under health_* (no separate HH permission — preserve existing semantics).
 * Medication/vaccination fold under health_* for household.
 */
export function householdPermissionForAction(
  action: SecurityAction,
): HouseholdPetPermission | null {
  switch (action) {
    case 'health.read':
    case 'medication.read':
    case 'labs.read':
    case 'vaccination.read':
      return 'health_read'
    case 'health.write':
    case 'medication.write':
    case 'labs.write':
    case 'vaccination.write':
      return 'health_write'
    case 'documents.read':
      return 'documents_read'
    case 'documents.write':
      return 'documents_write'
    case 'pet.profile.read':
      return 'pet_profile_read'
    case 'pet.profile.write':
      return 'pet_profile_write'
    default:
      return null
  }
}

/**
 * Map logical action → primary ProfessionalPermission check.
 * Vaccination/medication reads: viewX OR viewHealth (existing canProfessional* semantics).
 */
export type ProfessionalActionMapping = {
  /** Primary permission that must be present (or implied by viewHealth for some reads). */
  permission: ProfessionalPermission
  /** When true, viewHealth also satisfies this read (existing Pro semantics). */
  viewHealthImplies?: boolean
}

export function professionalPermissionForAction(
  action: SecurityAction,
): ProfessionalActionMapping | null {
  switch (action) {
    case 'health.read':
    case 'labs.read':
      return { permission: 'viewHealth' }
    case 'health.write':
      return { permission: 'addHealthRecord' }
    case 'medication.read':
      return { permission: 'viewMedications', viewHealthImplies: true }
    case 'medication.write':
      return { permission: 'addHealthRecord' }
    case 'documents.read':
      return { permission: 'viewDocuments' }
    case 'documents.write':
      return { permission: 'addNote' }
    case 'vaccination.read':
      return { permission: 'viewVaccinations', viewHealthImplies: true }
    case 'vaccination.write':
      return { permission: 'addVaccination' }
    case 'labs.write':
      return { permission: 'addHealthRecord' }
    case 'pet.profile.read':
      return { permission: 'viewHealth' }
    case 'organization.pet.access':
      return { permission: 'viewHealth' }
    default:
      return null
  }
}

/** Actions that require an authenticated human account (not public/anonymous). */
export function requiresAuthenticatedAccount(action: SecurityAction): boolean {
  if (isPublicAction(action)) return false
  return true
}
