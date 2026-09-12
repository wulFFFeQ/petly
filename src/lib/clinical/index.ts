/**
 * K56/K57/K58/K59/K60/K61/K62/K63 — Server clinical vertical (service / authority boundary).
 *
 * Not a parallel Health / Access / Permission / Audit system.
 * HealthRecord / PetDocument / WeightMeasurement remain SSOT.
 * ClinicalEncounter is a clinical episode container only.
 * SecurityContext + authorize() remain the only authorization path.
 * K57: integer version + immutable HealthRecord version snapshots.
 * K58: Encounter lifecycle + separate immutable encounter history.
 * K59: PetDocument clinical boundary + separate immutable document history.
 * K60: WeightMeasurement clinical boundary (health.read/write; no parallel ACL).
 * K61: Clinical Share = workflow over authorize + Messages (not access grant).
 * K62: clinical.emergency.write = Emergency Card only (≠ health.write).
 * K63: unified idempotency AFTER authorize for create side-effects (DEMO store ≠ production).
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

export { toAuthorizedWeightView, toAuthorizedWeightViews } from './measurementProjection'
export type { AuthorizedWeightViewMode } from './measurementProjection'

export type {
  ClinicalEncounter,
  ClinicalEncounterStatus,
  ClinicalEncounterType,
} from '../../types'

export {
  ClinicalError,
  clinicalErrorFromAuthorization,
  clinicalErrorFromIdempotency,
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
  createWiredServerClinicalPersistenceAdapter,
  type ClinicalPersistenceAdapter,
  type DemoClinicalStoreHooks,
  type ServerClinicalPersistenceOptions,
} from './adapter'

export {
  ClinicalService,
  createClinicalService,
  createDemoClinicalService,
  createServerClinicalService,
  createServerClinicalServiceStub,
} from './service'

export {
  createClinicalShare,
  getClinicalShareAttachment,
  type ClinicalShareResult,
  type CreateClinicalShareInput,
} from './share'

export {
  canUseServerClinicalRemote,
  serverEmergencyWrite,
  serverListHealthRecords,
  serverPrepareDocumentUpload,
  serverSignedDocumentDownload,
  serverUpsertHealthRecord,
} from './serverRemote'

export {
  buildAppClinicalAdapter,
  createAppClinicalService,
  resolveAppClinicalStampContext,
} from './runtime'
