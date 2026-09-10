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
} from './types'

export {
  ACCOUNT_KINDS,
  CONSUMER_ROLES,
  KNOWN_PROFESSIONAL_TYPES,
  ORGANIZATION_PROFESSIONAL_TYPES,
  PROFESSIONAL_ACCESS_LOG_ACTIONS,
  PROFESSIONAL_ACCESS_STATUSES,
  PROFESSIONAL_PERMISSIONS,
  PROFESSIONAL_PUBLIC_VISIBILITIES,
  READ_PERMISSIONS,
  WRITE_PERMISSIONS,
} from './types'

export {
  accountHasRole,
  addAccountRole,
  isConsumerAccount,
  isConsumerRole,
  isProfessionalAccount,
  isProfessionalType,
  roleGrantsPetDataAccess,
} from './roles'

export {
  ONBOARDING_CHOICES,
  ROLE_CATALOG,
  SERVICE_SUB_ROLES,
  getOnboardingChoice,
  getRoleMeta,
  isOrganizationProfessionalType,
  listAddableRoles,
  listOnboardingOptions,
  professionalTypeFromRole,
  rolesForOnboardingChoice,
  unknownRoleIsSafe,
  type OnboardingChoice,
  type OnboardingChoiceId,
  type RoleCategory,
  type RoleMeta,
} from './catalog'

export {
  isProfessionalPermission,
  isReadPermission,
  isWritePermission,
  normalizePermissions,
  readDoesNotImplyWrite,
} from './permissions'

export {
  appendAccessLog,
  createAccessLogEntry,
  createAccessLogId,
  filterLogsForPet,
  filterLogsForProfessional,
  logsIncludeAction,
} from './audit'

export {
  activateAccess,
  assertCanAddHealthRecord,
  assertCanAddVaccination,
  assertCanAddVisit,
  canProfessionalAddHealthRecord,
  canProfessionalAddNote,
  canProfessionalAddVaccination,
  canProfessionalAddVisit,
  canProfessionalViewDocuments,
  canProfessionalViewHealth,
  canProfessionalViewMedications,
  canProfessionalViewVaccinations,
  createAccessId,
  findAccess,
  grantPetAccess,
  hasPermission,
  isAccessEffective,
  listAccessForOwner,
  listAccessForPet,
  listAccessForProfessional,
  resolveAccessStatus,
  revokeAccess,
  type GrantPetAccessInput,
} from './access'

export {
  PROFESSIONAL_VIEW_FORBIDDEN_KEYS,
  assertProfessionalViewSafe,
  projectPetForProfessional,
  type ProfessionalPetView,
  type ProjectProfessionalPetOptions,
  type ProjectProfessionalPetResult,
} from './project'

export {
  PUBLIC_PROFESSIONAL_FORBIDDEN_KEYS,
  assertPublicProfessionalSafe,
  hasProfessionalVerifiedBadge,
  toPublicProfessionalProfile,
  type ToPublicProfessionalOptions,
} from './public'

export {
  ACCOUNTS_STORAGE_KEY,
  ORGANIZATIONS_STORAGE_KEY,
  PET_PROFESSIONAL_ACCESS_STORAGE_KEY,
  PROFESSIONAL_ACCESS_LOGS_STORAGE_KEY,
  PROFESSIONAL_PROFILES_STORAGE_KEY,
  createProfessionalId,
  loadAccounts,
  loadOrganizations,
  loadPetProfessionalAccess,
  loadProfessionalAccessLogs,
  loadProfessionalProfiles,
  normalizeAccessLog,
  normalizeAccessLogs,
  normalizeAccount,
  normalizeAccounts,
  normalizeOrganization,
  normalizeOrganizations,
  normalizePetProfessionalAccess,
  normalizePetProfessionalAccessList,
  normalizeProfessionalProfile,
  normalizeProfessionalProfiles,
  saveAccounts,
  saveOrganizations,
  savePetProfessionalAccess,
  saveProfessionalAccessLogs,
  saveProfessionalProfiles,
} from './storage'
