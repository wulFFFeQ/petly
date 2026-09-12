/**
 * K56/K57 — Server clinical vertical (service / authority boundary).
 *
 * Not a parallel Health / Access / Permission / Audit system.
 * HealthRecord / PetDocument / WeightMeasurement remain SSOT.
 * SecurityContext + authorize() remain the only authorization path.
 * K57: integer version + immutable HealthRecord version snapshots.
 */

export type {
  ClinicalAuthority,
  ClinicalAudit,
  ClinicalAuthorizationDecision,
  ClinicalCorrectRecordInput,
  ClinicalCreateRecordInput,
  ClinicalCreateWeightInput,
  ClinicalMutationKind,
  ClinicalMutationResult,
  ClinicalPersistence,
  ClinicalReadRequest,
  ClinicalRequestBase,
  ClinicalResource,
  ClinicalServiceAction,
  ClinicalServiceOptions,
  ClinicalUpdateRecordInput,
  ClinicalWithdrawRecordInput,
  HealthRecordVersionSnapshot,
  TrustedActor,
} from './types'

export {
  ClinicalError,
  clinicalErrorFromAuthorization,
  immutableVersion,
  invalidVersion,
  isClinicalError,
  notImplemented,
  rethrowAsClinical,
  serverRequired,
  staleVersion,
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
