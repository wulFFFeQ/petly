export {
  ONBOARDING_COMPLETED_KEY,
  accountNeedsOnboarding,
  addSelfAccountRole,
  completeOnboarding,
  ensureDefaultSelfAccount,
  findProfessionalProfileById,
  getSelfAccount,
  isOnboardingCompleted,
  listSelfProfessionalProfiles,
  markOnboardingCompleted,
  resetOnboardingDemo,
  saveSelfAccount,
  setProfessionalPublicVisibility,
  upsertProfessionalIdentity,
  type CompleteOnboardingInput,
  type ProfessionalProfileDraft,
} from './session'

export {
  UI_WORKSPACE_STORAGE_KEY,
  getUiWorkspace,
  isProfessionalUiWorkspace,
  normalizeUiWorkspace,
  setUiWorkspace,
  type UiWorkspace,
} from './workspace'
