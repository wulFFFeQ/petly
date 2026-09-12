/**
 * K63 — Privacy / GDPR data classification.
 *
 * Extends (does NOT replace) PET_PRIVACY_FIELDS / ACCOUNT_PRIVACY_FIELDS.
 * Maps product data classes A–I onto existing projection / scrub anchors.
 * Not a second privacy settings taxonomy or parallel ACL.
 */

import { ACCOUNT_PRIVACY_FIELDS, PET_PRIVACY_FIELDS, PUBLIC_PAYLOAD_FORBIDDEN_KEYS } from './fields'

/** K63 data classes — technical boundaries for docs + tests. */
export type PrivacyDataClass =
  | 'public'
  | 'account_private'
  | 'household_private'
  | 'professional_access'
  | 'organization_access'
  | 'clinical'
  | 'sensitive_identifier'
  | 'storage_internal'
  | 'audit_security'

export type PrivacyDataClassMeta = {
  id: PrivacyDataClass
  label: string
  /** Existing code anchors — not a new settings model. */
  anchors: readonly string[]
  /** Never public by default unless explicit allowlist projection. */
  publicDefault: 'deny' | 'allowlist_only'
}

/**
 * Canonical classification map.
 * Public surfaces must use allowlist projections — never strip-from-full-object.
 */
export const PRIVACY_DATA_CLASSES: readonly PrivacyDataClassMeta[] = [
  {
    id: 'public',
    label: 'Public data',
    anchors: [
      'projectPublicPet',
      'sanitizeDiscoverPet',
      'buildEmergencyCardPublicView',
      'toPublicTrustBadges',
      'DISCOVER_IDENTITY_FIELDS',
    ],
    publicDefault: 'allowlist_only',
  },
  {
    id: 'account_private',
    label: 'Account / private data',
    anchors: ACCOUNT_PRIVACY_FIELDS.map((f) => f.id),
    publicDefault: 'deny',
  },
  {
    id: 'household_private',
    label: 'Household / private data',
    anchors: ['projectPetForHousehold', 'connections viewer', ...PET_PRIVACY_FIELDS.map((f) => f.id)],
    publicDefault: 'deny',
  },
  {
    id: 'professional_access',
    label: 'Professional-access data',
    anchors: ['projectPetForProfessional', 'toAuthorizedDocumentView(professional)'],
    publicDefault: 'deny',
  },
  {
    id: 'organization_access',
    label: 'Organization-access data',
    anchors: ['organization/petProject', 'toAuthorizedDocumentView(organization)'],
    publicDefault: 'deny',
  },
  {
    id: 'clinical',
    label: 'Clinical data',
    anchors: [
      'HealthRecord',
      'WeightMeasurement',
      'PetDocument',
      'ClinicalEncounter',
      'emergencyCard.health',
      'health.read',
      'documents.read',
    ],
    publicDefault: 'deny',
  },
  {
    id: 'sensitive_identifier',
    label: 'Sensitive identifiers',
    anchors: [
      'microchip',
      'ownerContacts',
      'phone',
      'email',
      'address',
      'exact location',
      'account IDs (internal)',
    ],
    publicDefault: 'deny',
  },
  {
    id: 'storage_internal',
    label: 'Storage / internal metadata',
    anchors: [
      'storageKey',
      'objectPath',
      'signedUrl',
      'providerUrl',
      'providerAccountId',
      'raw document URLs',
    ],
    publicDefault: 'deny',
  },
  {
    id: 'audit_security',
    label: 'Audit / security metadata',
    anchors: ['AuditEvent', 'scrubAuditMetadata', 'K48'],
    publicDefault: 'deny',
  },
] as const

export function getPrivacyDataClass(id: PrivacyDataClass): PrivacyDataClassMeta {
  const meta = PRIVACY_DATA_CLASSES.find((c) => c.id === id)
  if (!meta) throw new Error(`Unknown privacy data class: ${id}`)
  return meta
}

/** Keys that must never appear on public / transport serializers (SSOT with fields.ts). */
export const STORAGE_INTERNAL_FORBIDDEN_KEYS = [
  'storageKey',
  'objectPath',
  'signedUrl',
  'providerUrl',
  'providerAccountId',
  'rawUrl',
  'blobUrl',
  'downloadUrl',
] as const

/** Clinical entity key names never public by default. */
export const CLINICAL_PUBLIC_FORBIDDEN_KEYS = [
  'healthRecords',
  'weightMeasurements',
  'documents',
  'clinicalEncounters',
  'encounters',
  'medications',
  'allergies',
  'healthStatus',
  'health',
] as const

/** Assert helper: every storage/internal key is in the public forbidden backstop. */
export function assertStorageKeysForbiddenInPublicPayload(): void {
  for (const key of STORAGE_INTERNAL_FORBIDDEN_KEYS) {
    if (!(PUBLIC_PAYLOAD_FORBIDDEN_KEYS as readonly string[]).includes(key)) {
      throw new Error(`PUBLIC_PAYLOAD_FORBIDDEN_KEYS missing storage key: ${key}`)
    }
  }
}

/**
 * Retention classes (documentation / contract only).
 * No automatic deletion scheduler in DEMO.
 */
export type RetentionClass =
  | 'clinical_records'
  | 'documents'
  | 'audit_security'
  | 'messages'
  | 'notifications'
  | 'access_grants'
  | 'idempotency_records'
  | 'account_data'

export const RETENTION_CLASS_NOTES: Record<RetentionClass, string> = {
  clinical_records:
    'Production: legal/clinical retention; soft withdraw ≠ hard delete; SERVER_REQUIRED policy.',
  documents:
    'Production: blob + metadata retention; legal hold may block erasure; SERVER_REQUIRED.',
  audit_security:
    'K48 security metadata; may outlive account deletion for abuse/fraud; not a clinical copy.',
  messages: 'Conversation retention separate from clinical SSOT; scrub attachments on export.',
  notifications: 'Short-lived UX; never store clinical payload; DEMO may prune locally.',
  access_grants: 'HH/Pro/Org grants — revoke ≠ erase history; expiry evaluated at authorize.',
  idempotency_records: 'TTL on server; DEMO localStorage is best-effort only.',
  account_data: 'GDPR access/erasure subject to legal retention of clinical/audit history.',
}
