import type { ProfessionalPermission, ProfessionalType } from './types'
import { READ_PERMISSIONS, WRITE_PERMISSIONS } from './types'

/** Czech labels for permission checkboxes / cards. */
export const PERMISSION_LABELS: Record<ProfessionalPermission, string> = {
  viewHealth: 'Zdravotní záznamy',
  viewVaccinations: 'Očkování',
  viewMedications: 'Léky a doplňky',
  viewDocuments: 'Dokumenty',
  addVisit: 'Přidat návštěvu',
  addVaccination: 'Přidat očkování',
  addHealthRecord: 'Přidat zdravotní záznam',
  addNote: 'Přidat poznámku',
  emergencyWrite: 'Nouzová karta (časově omezené)',
}

export const READ_PERMISSION_OPTIONS = READ_PERMISSIONS.map((id) => ({
  id,
  label: PERMISSION_LABELS[id],
}))

export const WRITE_PERMISSION_OPTIONS = WRITE_PERMISSIONS.map((id) => ({
  id,
  label: PERMISSION_LABELS[id],
}))

/**
 * Suggested permissions by role — NEVER auto-granted.
 * Used only as optional UI prefill hints; owner must still confirm.
 * Non-vet roles default to empty (no health access suggestion).
 */
export function suggestedPermissionsForRole(
  role: ProfessionalType | string,
): ProfessionalPermission[] {
  switch (role) {
    case 'veterinarian':
    case 'veterinary_clinic':
      return [
        'viewHealth',
        'viewVaccinations',
        'viewMedications',
        'viewDocuments',
        'addVisit',
        'addVaccination',
        'addHealthRecord',
        'addNote',
      ]
    case 'shelter':
    case 'groomer':
    case 'trainer':
    case 'breeder':
    case 'pet_hotel':
    case 'pet_service':
    default:
      return []
  }
}

export function formatPermissionList(permissions: ProfessionalPermission[]): string[] {
  return permissions.map((p) => PERMISSION_LABELS[p] ?? p)
}
