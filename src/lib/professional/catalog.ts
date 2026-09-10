import {
  KNOWN_PROFESSIONAL_TYPES,
  ORGANIZATION_PROFESSIONAL_TYPES,
  type AccountRole,
  type ProfessionalType,
} from './types'
import { isProfessionalType } from './roles'

export type RoleCategory = 'consumer' | 'professional' | 'organization' | 'services'

export type RoleMeta = {
  id: AccountRole
  label: string
  shortDescription: string
  category: RoleCategory
}

export type OnboardingChoiceId =
  | 'owner'
  | 'breeder'
  | 'veterinarian'
  | 'veterinary_clinic'
  | 'shelter'
  | 'pet_services'

export type OnboardingChoice = {
  id: OnboardingChoiceId
  label: string
  shortDescription: string
  /** Direct role(s) when choice maps 1:1; empty for pet_services (needs sub-pick). */
  roles: AccountRole[]
  needsServiceSubPick: boolean
  organizationStyle: boolean
}

/** Central role labels — UI must use this instead of scattered string switches. */
export const ROLE_CATALOG: Record<string, RoleMeta> = {
  owner: {
    id: 'owner',
    label: 'Majitel mazlíčka',
    shortDescription: 'Osobní účet pro péči o vaše mazlíčky.',
    category: 'consumer',
  },
  veterinarian: {
    id: 'veterinarian',
    label: 'Veterinář',
    shortDescription: 'Profesionální účet pro veterinární péči.',
    category: 'professional',
  },
  veterinary_clinic: {
    id: 'veterinary_clinic',
    label: 'Veterinární klinika',
    shortDescription: 'Profil kliniky a tým profesionálů.',
    category: 'organization',
  },
  shelter: {
    id: 'shelter',
    label: 'Útulek / záchranná organizace',
    shortDescription: 'Evidence zvířat, adopce a komunikace.',
    category: 'organization',
  },
  groomer: {
    id: 'groomer',
    label: 'Groomer / salon',
    shortDescription: 'Úprava a péče o vzhled mazlíčků.',
    category: 'services',
  },
  trainer: {
    id: 'trainer',
    label: 'Trenér / výcvikové centrum',
    shortDescription: 'Výcvik a chování.',
    category: 'services',
  },
  breeder: {
    id: 'breeder',
    label: 'Chovatel / chovná stanice',
    shortDescription: 'Nástroje pro chov, prezentaci a evidenci.',
    category: 'professional',
  },
  pet_hotel: {
    id: 'pet_hotel',
    label: 'Pet hotel / hlídání',
    shortDescription: 'Ubytování a hlídání mazlíčků.',
    category: 'services',
  },
  pet_service: {
    id: 'pet_service',
    label: 'Jiný profesionál / služba',
    shortDescription: 'Další služby pro mazlíčky.',
    category: 'services',
  },
}

export const ONBOARDING_CHOICES: OnboardingChoice[] = [
  {
    id: 'owner',
    label: 'Majitel mazlíčka',
    shortDescription: 'Osobní účet pro péči o vaše mazlíčky.',
    roles: ['owner'],
    needsServiceSubPick: false,
    organizationStyle: false,
  },
  {
    id: 'breeder',
    label: 'Chovatel / chovná stanice',
    shortDescription: 'Nástroje pro chov, prezentaci a evidenci.',
    roles: ['owner', 'breeder'],
    needsServiceSubPick: false,
    organizationStyle: false,
  },
  {
    id: 'veterinarian',
    label: 'Veterinář',
    shortDescription: 'Profesionální účet pro veterinární péči.',
    roles: ['owner', 'veterinarian'],
    needsServiceSubPick: false,
    organizationStyle: false,
  },
  {
    id: 'veterinary_clinic',
    label: 'Veterinární klinika',
    shortDescription: 'Profil kliniky a tým profesionálů.',
    roles: ['veterinary_clinic'],
    needsServiceSubPick: false,
    organizationStyle: true,
  },
  {
    id: 'shelter',
    label: 'Útulek / záchranná organizace',
    shortDescription: 'Evidence zvířat, adopce a komunikace.',
    roles: ['shelter'],
    needsServiceSubPick: false,
    organizationStyle: true,
  },
  {
    id: 'pet_services',
    label: 'Služby pro mazlíčky',
    shortDescription: 'Grooming, výcvik, hotel, hlídání a další služby.',
    roles: [],
    needsServiceSubPick: true,
    organizationStyle: false,
  },
]

export const SERVICE_SUB_ROLES: AccountRole[] = [
  'groomer',
  'trainer',
  'pet_hotel',
  'pet_service',
]

export function getRoleMeta(role: string): RoleMeta {
  const known = ROLE_CATALOG[role]
  if (known) return known
  return {
    id: role as AccountRole,
    label: role,
    shortDescription: 'Profesionální typ účtu.',
    category: 'professional',
  }
}

export function listOnboardingOptions(): OnboardingChoice[] {
  return [...ONBOARDING_CHOICES]
}

export function getOnboardingChoice(id: OnboardingChoiceId): OnboardingChoice | undefined {
  return ONBOARDING_CHOICES.find((c) => c.id === id)
}

/**
 * Resolve concrete roles for an onboarding choice.
 * Pet services require a serviceRole sub-pick.
 */
export function rolesForOnboardingChoice(
  choiceId: OnboardingChoiceId,
  serviceRole?: AccountRole,
): AccountRole[] {
  const choice = getOnboardingChoice(choiceId)
  if (!choice) return ['owner']
  if (choice.needsServiceSubPick) {
    const service =
      serviceRole && SERVICE_SUB_ROLES.includes(serviceRole) ? serviceRole : 'pet_service'
    return ['owner', service]
  }
  return [...choice.roles]
}

export function isOrganizationProfessionalType(type: string): boolean {
  return (ORGANIZATION_PROFESSIONAL_TYPES as readonly string[]).includes(type)
}

/**
 * Unknown / future roles must never auto-gain pet permissions.
 * They are still treated as professional identity strings only.
 */
export function unknownRoleIsSafe(role: string): boolean {
  if (role === 'owner') return true
  if ((KNOWN_PROFESSIONAL_TYPES as readonly string[]).includes(role)) return true
  // Extensible string: allowed as identity, but callers must not grant access from it.
  return isProfessionalType(role)
}

export function listAddableRoles(existing: AccountRole[]): RoleMeta[] {
  const have = new Set(existing)
  const order: AccountRole[] = [
    'owner',
    'breeder',
    'veterinarian',
    'veterinary_clinic',
    'shelter',
    'groomer',
    'trainer',
    'pet_hotel',
    'pet_service',
  ]
  return order.filter((r) => !have.has(r)).map((r) => getRoleMeta(r))
}

export function professionalTypeFromRole(role: AccountRole): ProfessionalType | null {
  if (role === 'owner') return null
  if (isProfessionalType(role)) return role
  return null
}
