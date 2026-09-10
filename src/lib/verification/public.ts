import { SELF_OWNER_ID } from '../discover/owner'
import { isActiveTrustVerification } from './status'
import type {
  PublicTrustBadge,
  PublicTrustBadgeType,
  Verification,
  VerificationType,
} from './types'

const PUBLIC_BADGE_LABELS: Record<PublicTrustBadgeType, string> = {
  email: 'Ověřený e-mail',
  phone: 'Ověřený telefon',
  pet: 'Ověřený mazlíček',
  breeding: 'Ověřený chovný profil',
}

const SOURCE_SUMMARY: Partial<Record<Verification['source'], string>> = {
  email_provider: 'E-mail',
  sms_provider: 'Telefon',
  pet_relation_provider: 'Vztah k mazlíčkovi',
  breeding_composite: 'Chovný profil',
  identity_provider: 'Identita',
  vet_attestation: 'Veterinární potvrzení',
}

const PUBLIC_TYPES = new Set<VerificationType>(['email', 'phone', 'pet', 'breeding'])

/**
 * Build safe public trust badges from verification records.
 * Never includes metadata, chip numbers, documents, or demo presentations.
 */
export function toPublicTrustBadges(
  verifications: Verification[],
  opts?: {
    petId?: string
    ownerId?: string
    now?: number
  },
): PublicTrustBadge[] {
  const ownerId = opts?.ownerId ?? SELF_OWNER_ID
  const petId = opts?.petId
  const now = opts?.now ?? Date.now()
  const badges: PublicTrustBadge[] = []
  const seen = new Set<PublicTrustBadgeType>()

  for (const v of verifications) {
    if (!PUBLIC_TYPES.has(v.type)) continue
    if (!isActiveTrustVerification(v, now)) continue

    const type = v.type as PublicTrustBadgeType

    if (type === 'email' || type === 'phone') {
      if (v.subjectType !== 'user' || v.subjectId !== ownerId) continue
    } else if (type === 'pet' || type === 'breeding') {
      if (!petId) continue
      if (v.subjectType !== 'pet' || v.subjectId !== petId) continue
    }

    if (seen.has(type)) continue
    seen.add(type)

    const badge: PublicTrustBadge = {
      type,
      label: PUBLIC_BADGE_LABELS[type],
    }
    if (v.verifiedAt) badge.verifiedAt = v.verifiedAt
    if (v.expiresAt) badge.expiresAt = v.expiresAt
    const summary = SOURCE_SUMMARY[v.source]
    if (summary) badge.sourceSummary = summary
    badges.push(badge)
  }

  return badges
}

/** Discover filter helper: any public trust badge. */
export function hasPublicTrust(badges: PublicTrustBadge[] | undefined): boolean {
  return Boolean(badges && badges.length > 0)
}

/**
 * Keys that must never leak on public payloads (verification-related).
 * Merged into privacy forbidden list.
 */
export const VERIFICATION_PUBLIC_FORBIDDEN_KEYS = [
  'verifications',
  'verification',
  'verificationMetadata',
  'metadata',
  'chipNumber',
  'microchipNumber',
  'documentIds',
  'providerPayload',
  'rawProviderResponse',
  'attestorId',
  'attestorDocument',
] as const
