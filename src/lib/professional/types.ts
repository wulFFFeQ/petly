export type {
  Account,
  AccountKind,
  AccountRole,
  ConsumerRole,
  Organization,
  PetProfessionalAccess,
  ProfessionalAccessLog,
  ProfessionalAccessLogAction,
  ProfessionalAccessStatus,
  ProfessionalCredentials,
  ProfessionalPermission,
  ProfessionalProfile,
  ProfessionalPublicVisibility,
  ProfessionalType,
  ProfessionalVerificationStatus,
  PublicProfessionalProfile,
} from '../../types/professional'

/** Built-in professional types (extensible beyond this list via ProfessionalType). */
export const KNOWN_PROFESSIONAL_TYPES = [
  'veterinarian',
  'veterinary_clinic',
  'shelter',
  'groomer',
  'trainer',
  'breeder',
  'pet_hotel',
  'pet_service',
] as const

/** Organization-style roles (clinic / shelter / future salon teams). */
export const ORGANIZATION_PROFESSIONAL_TYPES = [
  'veterinary_clinic',
  'shelter',
] as const

export const PROFESSIONAL_PUBLIC_VISIBILITIES = ['public', 'private'] as const

export const CONSUMER_ROLES = ['owner'] as const

export const ACCOUNT_KINDS = ['consumer', 'professional'] as const

export const PROFESSIONAL_PERMISSIONS = [
  'viewHealth',
  'viewVaccinations',
  'viewMedications',
  'viewDocuments',
  'addVisit',
  'addVaccination',
  'addHealthRecord',
  'addNote',
] as const

export const PROFESSIONAL_ACCESS_STATUSES = [
  'pending',
  'active',
  'revoked',
  'expired',
] as const

export const PROFESSIONAL_ACCESS_LOG_ACTIONS = [
  'access_granted',
  'access_revoked',
  'record_viewed',
  'record_added',
  'vaccination_added',
  'document_viewed',
] as const

export const READ_PERMISSIONS = [
  'viewHealth',
  'viewVaccinations',
  'viewMedications',
  'viewDocuments',
] as const

export const WRITE_PERMISSIONS = [
  'addVisit',
  'addVaccination',
  'addHealthRecord',
  'addNote',
] as const
