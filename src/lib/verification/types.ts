export type {
  PublicTrustBadge,
  PublicTrustBadgeType,
  Verification,
  VerificationPresentation,
  VerificationSource,
  VerificationStatus,
  VerificationSubjectType,
  VerificationType,
} from '../../types/verification'

export const VERIFICATION_TYPES = [
  'email',
  'phone',
  'identity',
  'pet',
  'veterinary',
  'breeding',
] as const

export const VERIFICATION_STATUSES = [
  'unverified',
  'pending',
  'verified',
  'expired',
  'revoked',
] as const

export const VERIFICATION_SOURCES = [
  'local_demo',
  'email_provider',
  'sms_provider',
  'identity_provider',
  'vet_attestation',
  'pet_relation_provider',
  'breeding_composite',
] as const

export const PUBLIC_TRUST_BADGE_TYPES = ['email', 'phone', 'pet', 'breeding'] as const
