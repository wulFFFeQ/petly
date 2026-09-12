/**
 * K56 — Server clinical vertical (service / authority boundary).
 *
 * Not a parallel Health / Access / Permission / Audit system.
 * HealthRecord / PetDocument / WeightMeasurement remain SSOT.
 * SecurityContext + authorize() remain the only authorization path.
 */

export type {
  ClinicalAuthority,
  ClinicalAudit,
  ClinicalAuthorizationDecision,
  ClinicalCreateRecordInput,
  ClinicalCreateWeightInput,
  ClinicalMutationResult,
  ClinicalPersistence,
  ClinicalReadRequest,
  ClinicalRequestBase,
  ClinicalResource,
  ClinicalServiceAction,
  ClinicalServiceOptions,
  ClinicalUpdateRecordInput,
  ClinicalWithdrawRecordInput,
  TrustedActor,
} from './types'

export {
  ClinicalError,
  clinicalErrorFromAuthorization,
  isClinicalError,
  notImplemented,
  rethrowAsClinical,
  serverRequired,
  type ClinicalErrorCode,
} from './errors'

export {
  DemoClinicalPersistenceAdapter,
  ServerClinicalPersistenceAdapter,
  assertAdapterAuthority,
  createInMemoryDemoClinicalAdapter,
  createServerClinicalPersistenceStub,
  type ClinicalPersistenceAdapter,
  type DemoClinicalStoreHooks,
} from './adapter'

export {
  ClinicalService,
  createClinicalService,
  createDemoClinicalService,
  createServerClinicalServiceStub,
} from './service'
