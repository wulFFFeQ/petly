/**
 * K56/K57/K58/K59 — Server clinical vertical (service / authority boundary).
 *
 * Not a parallel Health / Access / Permission / Audit system.
 * HealthRecord / PetDocument / WeightMeasurement remain SSOT.
 * ClinicalEncounter is a clinical episode container only.
 * SecurityContext + authorize() remain the only authorization path.
 * K57: integer version + immutable HealthRecord version snapshots.
 * K58: Encounter lifecycle + separate immutable encounter history.
 * K59: PetDocument clinical boundary + separate immutable document history.
 */

export type {
  ClinicalAuthority,
  ClinicalAudit,
  ClinicalAuthorizationDecision,
  ClinicalCorrectDocumentInput,
  ClinicalCorrectRecordInput,
  ClinicalCreateDocumentInput,
  ClinicalCreateEncounterInput,
  ClinicalCreateRecordInput,
  ClinicalCreateWeightInput,
  ClinicalEncounterVersionSnapshot,
  ClinicalMutationKind,
  ClinicalMutationResult,
  ClinicalPersistence,
  ClinicalReadRequest,
  ClinicalReplaceDocumentContentInput,
  ClinicalRequestBase,
  ClinicalResource,
  ClinicalServiceAction,
  ClinicalServiceOptions,
  ClinicalUpdateDocumentInput,
  ClinicalUpdateEncounterInput,
  ClinicalUpdateRecordInput,
  ClinicalWithdrawDocumentInput,
  ClinicalWithdrawRecordInput,
  HealthRecordVersionSnapshot,
  PetDocumentVersionSnapshot,
  TrustedActor,
} from './types'

export { toAuthorizedDocumentView, toAuthorizedDocumentViews } from './documentProjection'
export type { AuthorizedDocumentViewMode } from './documentProjection'

export type {
  ClinicalEncounter,
  ClinicalEncounterStatus,
  ClinicalEncounterType,
} from '../../types'

export {
  ClinicalError,
  clinicalErrorFromAuthorization,
  immutableVersion,
  invalidDocument,
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
