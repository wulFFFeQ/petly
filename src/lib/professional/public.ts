import { isActiveTrustVerification } from '../verification/status'
import type { Verification } from '../verification/types'
import { toSafePublicLabel } from '../lostPet/privacy'
import type { ProfessionalProfile, PublicProfessionalProfile } from './types'

/** Keys forbidden on any public professional payload. */
export const PUBLIC_PROFESSIONAL_FORBIDDEN_KEYS = [
  'address',
  'professionalCredentials',
  'licenseNumber',
  'registrationId',
  'accountId',
  'verifications',
  'metadata',
  'employee',
  'employees',
  'internalNotes',
  'verified',
] as const

/**
 * Whether a professional may show a verified badge.
 * Requires profile verificationStatus === 'verified' AND an active trust
 * Verification for subjectType professional (DEMO never qualifies).
 */
export function hasProfessionalVerifiedBadge(
  profile: ProfessionalProfile,
  verifications: Verification[] = [],
  now: number = Date.now(),
): boolean {
  if (profile.verificationStatus !== 'verified') return false
  return verifications.some(
    (v) =>
      v.subjectType === 'professional' &&
      v.subjectId === profile.id &&
      isActiveTrustVerification(v, now),
  )
}

export type ToPublicProfessionalOptions = {
  verifications?: Verification[]
  now?: number
  /**
   * When true, include profile.email / profile.phone as public contacts.
   * Default true for intentional public directory fields on the profile model;
   * credentials and street address are still stripped.
   */
  includePublicContacts?: boolean
}

/**
 * Project a safe public professional profile.
 * Never includes street address, credentials, or DEMO trust as verified badge.
 */
export function toPublicProfessionalProfile(
  profile: ProfessionalProfile,
  options: ToPublicProfessionalOptions = {},
): PublicProfessionalProfile {
  const includeContacts = options.includePublicContacts !== false
  const now = options.now ?? Date.now()
  const verifications = options.verifications ?? []

  const pub: PublicProfessionalProfile = {
    id: profile.id,
    type: profile.type,
    displayName: profile.displayName,
  }

  if (profile.organizationName?.trim()) {
    pub.organizationName = profile.organizationName.trim()
  }
  if (profile.description?.trim()) {
    pub.description = profile.description.trim()
  }
  if (profile.specializations?.length) {
    pub.specializations = [...profile.specializations]
  }
  if (profile.website?.trim()) {
    pub.website = profile.website.trim()
  }
  if (profile.hoursSummary?.trim()) {
    pub.hoursSummary = profile.hoursSummary.trim()
  }

  const cityRaw = profile.city?.trim() || profile.address?.trim()
  if (cityRaw) {
    // Prefer explicit city; if only address exists, coerce to safe public label.
    pub.city = profile.city?.trim()
      ? profile.city.trim()
      : toSafePublicLabel(cityRaw) || undefined
  }

  if (includeContacts) {
    if (profile.email?.trim()) pub.publicEmail = profile.email.trim()
    if (profile.phone?.trim()) pub.publicPhone = profile.phone.trim()
  }

  if (hasProfessionalVerifiedBadge(profile, verifications, now)) {
    pub.verifiedBadge = true
  }

  return pub
}

export function assertPublicProfessionalSafe(pub: PublicProfessionalProfile): void {
  const record = pub as Record<string, unknown>
  for (const key of PUBLIC_PROFESSIONAL_FORBIDDEN_KEYS) {
    if (key in record && record[key] != null) {
      throw new Error(`PublicProfessionalProfile must not include ${key}`)
    }
  }
  if (record.verified === true) {
    throw new Error('PublicProfessionalProfile must not use hardcoded verified=true')
  }
}
