/**
 * K56/K57/K58 — Server clinical vertical (service / authority boundary).
 *
 * Not a parallel Health / Access / Permission / Audit system.
 * HealthRecord / PetDocument / WeightMeasurement remain SSOT.
 * ClinicalEncounter is a clinical episode container only.
 * SecurityContext + authorize() remain the only authorization path.
 * K57: integer version + immutable HealthRecord version snapshots.
 * K58: Encounter lifecycle + separate immutable encounter history.
 */

export type {
  ClinicalAuthority,
  ClinicalAudit,
  ClinicalAuthorizationDecision,
  ClinicalCorrectRecordInput,
  ClinicalCreateEncounterInput,
  ClinicalCreateRecordInput,
  ClinicalCreateWeightInput,
  ClinicalEncounterVersionSnapshot,
  ClinicalMutationKind,
  ClinicalMutationResult,
  ClinicalPersistence,
  ClinicalReadRequest,
  ClinicalRequestBase,
  ClinicalResource,
  ClinicalServiceAction,
  ClinicalServiceOptions,
  ClinicalUpdateEncounterInput,
  ClinicalUpdateRecordInput,
  ClinicalWithdrawRecordInput,
  HealthRecordVersionSnapshot,
  TrustedActor,
} from './types'

export type {
  ClinicalEncounter,
  ClinicalEncounterStatus,
  ClinicalEncounterType,
} from '../../types'

export {
  ClinicalError,
  clinicalErrorFromAuthorization,
  immutableVersion,
  invalidEncounterTransition,
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
