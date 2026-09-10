export type {
  Account,
  AccountKind,
  AccountRole,
  ConsumerRole,
  PetProfessionalAccess,
  ProfessionalAccessLog,
  ProfessionalAccessLogAction,
  ProfessionalAccessStatus,
  ProfessionalCredentials,
  ProfessionalPermission,
  ProfessionalProfile,
  ProfessionalType,
  ProfessionalVerificationStatus,
  PublicProfessionalProfile,
} from './types'

export {
  ACCOUNT_KINDS,
  CONSUMER_ROLES,
  KNOWN_PROFESSIONAL_TYPES,
  PROFESSIONAL_ACCESS_LOG_ACTIONS,
  PROFESSIONAL_ACCESS_STATUSES,
  PROFESSIONAL_PERMISSIONS,
  READ_PERMISSIONS,
  WRITE_PERMISSIONS,
} from './types'

export {
  accountHasRole,
  isConsumerAccount,
  isConsumerRole,
  isProfessionalAccount,
  isProfessionalType,
  roleGrantsPetDataAccess,
} from './roles'

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
  PET_PROFESSIONAL_ACCESS_STORAGE_KEY,
  PROFESSIONAL_ACCESS_LOGS_STORAGE_KEY,
  PROFESSIONAL_PROFILES_STORAGE_KEY,
  createProfessionalId,
  loadAccounts,
  loadPetProfessionalAccess,
  loadProfessionalAccessLogs,
  loadProfessionalProfiles,
  normalizeAccessLog,
  normalizeAccessLogs,
  normalizeAccount,
  normalizeAccounts,
  normalizePetProfessionalAccess,
  normalizePetProfessionalAccessList,
  normalizeProfessionalProfile,
  normalizeProfessionalProfiles,
  saveAccounts,
  savePetProfessionalAccess,
  saveProfessionalAccessLogs,
  saveProfessionalProfiles,
} from './storage'
