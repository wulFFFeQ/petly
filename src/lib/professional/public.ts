import { isActiveTrustVerification } from '../verification/status'
import type { Verification } from '../verification/types'
import { toSafePublicLabel } from '../lostPet/privacy'
import type { ProfessionalProfile, PublicProfessionalProfile } from './types'

/** Safe public trust row for professional profile UI (labels only — no private metadata). */
export type PublicProfessionalTrustItem = {
  id: 'professional' | 'email' | 'phone' | 'veterinary'
  label: string
}

const TRUST_LABELS: Record<PublicProfessionalTrustItem['id'], string> = {
  professional: 'Ověřený profesionální profil',
  email: 'Ověřený e-mail',
  phone: 'Ověřený telefon',
  veterinary: 'Veterinární ověření',
}

/** Keys forbidden on any public professional payload. */
export const PUBLIC_PROFESSIONAL_FORBIDDEN_KEYS = [
  'address',
  'professionalCredentials',
  'licenseNumber',
  'registrationId',
  'accountId',
  'organizationId',
  'verifications',
  'metadata',
  'employee',
  'employees',
  'internalNotes',
  'verified',
  'health',
  'healthRecords',
  'weight',
  'weightMeasurements',
  'microchip',
  'ownerContacts',
  'publicVisibility',
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
 * Returns null when the profile is not publicly visible.
 */
export function toPublicProfessionalProfile(
  profile: ProfessionalProfile,
  options: ToPublicProfessionalOptions = {},
): PublicProfessionalProfile | null {
  if ((profile.publicVisibility ?? 'private') !== 'public') {
    return null
  }

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
  if (profile.services?.length) {
    pub.services = [...profile.services]
  }
  if (profile.profilePhotoUrl?.trim()) {
    pub.profilePhotoUrl = profile.profilePhotoUrl.trim()
  }
  if (profile.logoUrl?.trim()) {
    pub.logoUrl = profile.logoUrl.trim()
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

/**
 * Public trust checklist for a professional profile.
 * Derived only from real active trust Verifications + professional badge rules.
 * DEMO / pending / expired / revoked never appear. Role alone never creates trust.
 * Never returns accountId or verification metadata.
 */
export function listPublicProfessionalTrustItems(
  profile: ProfessionalProfile,
  verifications: Verification[] = [],
  now: number = Date.now(),
): PublicProfessionalTrustItem[] {
  const items: PublicProfessionalTrustItem[] = []

  if (hasProfessionalVerifiedBadge(profile, verifications, now)) {
    items.push({ id: 'professional', label: TRUST_LABELS.professional })
  }

  const accountId = profile.accountId
  const hasEmail = verifications.some(
    (v) =>
      v.type === 'email' &&
      v.subjectType === 'user' &&
      v.subjectId === accountId &&
      isActiveTrustVerification(v, now),
  )
  if (hasEmail) {
    items.push({ id: 'email', label: TRUST_LABELS.email })
  }

  const hasPhone = verifications.some(
    (v) =>
      v.type === 'phone' &&
      v.subjectType === 'user' &&
      v.subjectId === accountId &&
      isActiveTrustVerification(v, now),
  )
  if (hasPhone) {
    items.push({ id: 'phone', label: TRUST_LABELS.phone })
  }

  const hasVeterinary = verifications.some(
    (v) =>
      v.type === 'veterinary' &&
      v.subjectType === 'professional' &&
      v.subjectId === profile.id &&
      isActiveTrustVerification(v, now),
  )
  if (hasVeterinary) {
    items.push({ id: 'veterinary', label: TRUST_LABELS.veterinary })
  }

  return items
}
