export type {
  PublicTrustBadge,
  PublicTrustBadgeType,
  Verification,
  VerificationPresentation,
  VerificationSource,
  VerificationStatus,
  VerificationSubjectType,
  VerificationType,
} from './types'

export {
  PUBLIC_TRUST_BADGE_TYPES,
  VERIFICATION_SOURCES,
  VERIFICATION_STATUSES,
  VERIFICATION_TYPES,
} from './types'

export {
  effectiveStatus,
  isActiveTrustVerification,
  isActiveVerificationStatus,
  isDemoVerification,
} from './status'

export {
  VERIFICATIONS_STORAGE_KEY,
  createVerificationId,
  loadVerifications,
  normalizeVerification,
  normalizeVerifications,
  removeVerification,
  saveVerifications,
  upsertVerification,
} from './storage'

export {
  canRunLocalDemoConfirm,
  getEmailProvider,
  getIdentityProvider,
  getPetRelationProvider,
  getSmsProvider,
  getVetAttestationProvider,
  listVerificationProviders,
  type ProviderMode,
  type VerificationProviderInfo,
} from './providers'

export {
  assertIdentityProviderAllowsTrust,
  assertPetRelationProviderAllowsTrust,
  assertVetProviderAllowsTrust,
  createDemoEmailVerification,
  createDemoPhoneVerification,
  createTrustEmailVerification,
  createTrustIdentityVerification,
  createTrustPetVerification,
  createTrustPhoneVerification,
  findSubjectVerifications,
  microchipDoesNotProveOwnership,
  revokeVerification,
} from './rules'

export {
  BREEDING_VERIFICATION_REQUIREMENTS,
  applyBreedingEvaluation,
  evaluateBreedingVerification,
  type BreedingEvaluationResult,
  type BreedingRequirementType,
} from './breedingConfig'

export {
  VERIFICATION_PUBLIC_FORBIDDEN_KEYS,
  hasPublicTrust,
  toPublicTrustBadges,
} from './public'
