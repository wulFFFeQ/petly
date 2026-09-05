export type {
  LovedKnownMicrochipMatch,
  MicrochipAggregateStatus,
  MicrochipRegistryProvider,
  MicrochipRegistryResult,
  MicrochipVerificationMode,
  MicrochipVerificationResult,
  PetMicrochipVerification,
} from './types'
export { maskMicrochip } from './mask'
export {
  isValidMicrochipFormat,
  microchipValidationMessage,
  normalizeMicrochipInput,
} from './validate'
export {
  isMicrochipDevMockMode,
  lookupLovedKnownPetByMicrochip,
  MICROCHIP_REGISTRY_INFO_LINKS,
  verifyMicrochip,
} from './verificationService'
