/** Subject of a verification record. */
export type VerificationSubjectType = 'user' | 'pet' | 'breeding_profile'

/**
 * Concrete verification kinds. Never collapse these into a single profile `verified: true`.
 */
export type VerificationType =
  | 'email'
  | 'phone'
  | 'identity'
  | 'pet'
  | 'veterinary'
  | 'breeding'

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'expired'
  | 'revoked'

/**
 * Where the verification came from.
 * `local_demo` must never be presented as real public trust.
 */
export type VerificationSource =
  | 'local_demo'
  | 'email_provider'
  | 'sms_provider'
  | 'identity_provider'
  | 'vet_attestation'
  | 'pet_relation_provider'
  | 'breeding_composite'

/**
 * `trust` — eligible for public trust badges.
 * `demo` — architecture/demo only; never shown as real verification.
 */
export type VerificationPresentation = 'trust' | 'demo'

/**
 * Central verification record. Persist privately; public surfaces use PublicTrustBadge only.
 */
export interface Verification {
  id: string
  subjectType: VerificationSubjectType
  subjectId: string
  type: VerificationType
  status: VerificationStatus
  source: VerificationSource
  presentation: VerificationPresentation
  verifiedAt?: string
  expiresAt?: string
  /** Owner-private only — never project to public payloads. */
  metadata?: Record<string, unknown>
}

/** Safe public summary for profile / Discover badges (Krok 15). */
export type PublicTrustBadgeType = 'email' | 'phone' | 'pet' | 'breeding'

export interface PublicTrustBadge {
  type: PublicTrustBadgeType
  label: string
  verifiedAt?: string
  /** High-level safe source label, e.g. "E-mail" — never internal provider IDs. */
  sourceSummary?: string
  expiresAt?: string
}
