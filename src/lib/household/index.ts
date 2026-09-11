export type {
  HouseholdAccessLogAction,
  HouseholdAccessStatus,
  HouseholdPetPermission,
  HouseholdPetRole,
  PetHouseholdAccess,
  PetHouseholdAccessLog,
} from './types'
export {
  HOUSEHOLD_ACCESS_STATUSES,
  HOUSEHOLD_PET_PERMISSIONS,
  HOUSEHOLD_PET_ROLES,
} from './types'

export {
  isHouseholdPetPermission,
  isHouseholdPetRole,
  normalizeHouseholdPermissions,
  suggestedHouseholdPermissionsForRole,
} from './permissions'

export {
  HOUSEHOLD_PERMISSION_LABELS,
  HOUSEHOLD_PERMISSION_OPTIONS,
  HOUSEHOLD_ROLE_LABELS,
  formatHouseholdPermissionList,
} from './permissionLabels'

export {
  appendHouseholdAccessLog,
  createHouseholdAccessLogEntry,
  createHouseholdAccessLogId,
  filterHouseholdLogsForPet,
} from './audit'

export {
  actorHasHouseholdPermission,
  assertCanManagePetLostFound,
  assertCannotRemoveOrTransferOwner,
  assertCanWritePetEmergency,
  canManagePetLostFound,
  canReadPetEmergency,
  canWritePetEmergency,
  createHouseholdAccessId,
  findHouseholdAccess,
  findOpenHouseholdAccess,
  grantHouseholdAccess,
  hasHouseholdPermission,
  HouseholdPermissionError,
  isHouseholdAccessEffective,
  listHouseholdAccessForAccount,
  listHouseholdAccessForPet,
  resolveHouseholdAccessStatus,
  revokeHouseholdAccess,
  transferPetOwnership,
  updateHouseholdAccess,
  type GrantHouseholdAccessInput,
  type HouseholdAccessMutationResult,
  type UpdateHouseholdAccessInput,
} from './access'

export {
  PET_HOUSEHOLD_ACCESS_LOGS_STORAGE_KEY,
  PET_HOUSEHOLD_ACCESS_STORAGE_KEY,
  loadPetHouseholdAccess,
  loadPetHouseholdAccessLogs,
  normalizeHouseholdAccessLog,
  normalizeHouseholdAccessLogs,
  normalizePetHouseholdAccess,
  normalizePetHouseholdAccessList,
  savePetHouseholdAccess,
  savePetHouseholdAccessLogs,
} from './storage'

export {
  getHouseholdAccessListForPet,
  getOpenHouseholdAccessForPair,
  grantOwnerHouseholdAccess,
  loadHouseholdAccessState,
  revokePetHouseholdAccess,
  updatePetHouseholdAccess,
  updatePetHouseholdAccessPermissions,
  type HouseholdAccessSessionResult,
} from './accessSession'

export {
  HOUSEHOLD_VIEW_FORBIDDEN_KEYS,
  assertHouseholdViewSafe,
  projectPetForHousehold,
  type HouseholdPetView,
  type ProjectHouseholdPetOptions,
} from './project'

export {
  DEMO_HOUSEHOLD_ACCOUNTS,
  ensureDemoHouseholdAccounts,
} from './demoAccounts'

/** Re-export ownership asserts used by household owner-only ops. */
export {
  assertPetOwner,
  ensurePetOwnerAccountId,
  isPetOwner,
  PetOwnershipError,
  resolvePetOwnerAccountId,
} from '../pets/ownership'
