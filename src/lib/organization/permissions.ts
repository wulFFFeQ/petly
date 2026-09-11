import {
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLES,
  ORGANIZATION_TYPES,
  type OrganizationPermission,
  type OrganizationRole,
  type OrganizationType,
} from './types'

const TYPE_SET = new Set<string>(ORGANIZATION_TYPES)
const ROLE_SET = new Set<string>(ORGANIZATION_ROLES)
const PERM_SET = new Set<string>(ORGANIZATION_PERMISSIONS)

export function isOrganizationType(value: unknown): value is OrganizationType {
  return typeof value === 'string' && value.trim().length > 0 && TYPE_SET.has(value.trim())
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return typeof value === 'string' && ROLE_SET.has(value)
}

export function isOrganizationPermission(value: unknown): value is OrganizationPermission {
  return typeof value === 'string' && PERM_SET.has(value)
}

/**
 * Role → organization-ops permissions.
 * Never grants pet health / documents / microchip / emergency / lost.
 */
export function permissionsForOrganizationRole(
  role: OrganizationRole,
): OrganizationPermission[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return [
        'organization_manage',
        'organization_members_manage',
        'organization_settings_manage',
      ]
    case 'professional':
    case 'staff':
    case 'viewer':
      return []
    default:
      return []
  }
}

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Vlastník',
  admin: 'Administrátor',
  professional: 'Profesionál',
  staff: 'Personál',
  viewer: 'Prohlížeč',
}

export const ORGANIZATION_TYPE_LABELS: Record<(typeof ORGANIZATION_TYPES)[number], string> = {
  veterinary_clinic: 'Veterinární klinika',
  shelter: 'Útulek',
  breeder: 'Chovatel',
  groomer: 'Salon / grooming',
  trainer: 'Trenér',
  pet_hotel: 'Psí hotel',
  pet_service: 'Pet služba',
  insurance: 'Pojišťovna',
  public_institution: 'Veřejná instituce',
  other: 'Jiné',
}
