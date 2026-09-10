import type { VerificationStatus } from './verification'

/** Everyday pet-owner role (consumer). */
export type ConsumerRole = 'owner'

/**
 * Known professional / B2B account types.
 * Extensible via `(string & {})` so new types do not require a core rewrite.
 */
export type ProfessionalType =
  | 'veterinarian'
  | 'veterinary_clinic'
  | 'shelter'
  | 'groomer'
  | 'trainer'
  | 'breeder'
  | 'pet_hotel'
  | 'pet_service'
  | (string & {})

/** Role on an account. Role ≠ data permission. */
export type AccountRole = ConsumerRole | ProfessionalType

export type AccountKind = 'consumer' | 'professional'

/**
 * Account identity. A consumer may later also hold professional roles (hybrid),
 * but professional type never grants pet data access by itself.
 */
export interface Account {
  id: string
  kind: AccountKind
  roles: AccountRole[]
  displayName?: string
  createdAt: string
  updatedAt: string
}

/** Mirrors KROK 16 VerificationStatus — never hardcode verified=true on profiles. */
export type ProfessionalVerificationStatus = VerificationStatus

/** Future credential fields — architecture only; never expose fully on public surfaces. */
export interface ProfessionalCredentials {
  licenseNumber?: string
  registrationId?: string
  specialties?: string[]
}

export type ProfessionalPublicVisibility = 'public' | 'private'

export interface ProfessionalProfile {
  id: string
  accountId: string
  type: ProfessionalType
  displayName: string
  organizationName?: string
  description?: string
  phone?: string
  email?: string
  /** Internal / private street address — never on public profile as-is. */
  address?: string
  website?: string
  /** Safe locality for public display. */
  city?: string
  specializations?: string[]
  hoursSummary?: string
  professionalCredentials?: ProfessionalCredentials
  profilePhotoUrl?: string
  logoUrl?: string
  services?: string[]
  /** Default private — public route only when explicitly public. */
  publicVisibility?: ProfessionalPublicVisibility
  /** Optional link to Organization stub (clinic / shelter / salon). */
  organizationId?: string
  /** Default unverified; DEMO vs trust handled via Verification records (KROK 16). */
  verificationStatus: ProfessionalVerificationStatus
  createdAt: string
  updatedAt: string
}

/**
 * Organization stub for clinics, shelters, salons, hotels.
 * Team management is out of scope for KROK 19.
 */
export interface Organization {
  id: string
  type: ProfessionalType
  name: string
  memberAccountIds: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Granular permissions — READ and WRITE are separate.
 * No viewOwnerContacts / viewMicrochip in KROK 17 (never auto-granted).
 */
export type ProfessionalPermission =
  | 'viewHealth'
  | 'viewVaccinations'
  | 'viewMedications'
  | 'viewDocuments'
  | 'addVisit'
  | 'addVaccination'
  | 'addHealthRecord'
  | 'addNote'

export type ProfessionalAccessStatus = 'pending' | 'active' | 'revoked' | 'expired'

/**
 * Owner-controlled grant of professional access to a specific pet.
 * Access exists only via explicit consent (or a future defined auth mechanism).
 */
export interface PetProfessionalAccess {
  id: string
  petId: string
  /** ProfessionalProfile.id */
  professionalId: string
  permissions: ProfessionalPermission[]
  status: ProfessionalAccessStatus
  /** Set when a request is created (pending); grant may reuse as grantedAt. */
  requestedAt?: string
  grantedAt: string
  expiresAt?: string
  revokedAt?: string
  grantedByAccountId: string
}

export type ProfessionalAccessLogAction =
  | 'access_requested'
  | 'access_granted'
  | 'access_revoked'
  | 'record_viewed'
  | 'record_added'
  | 'vaccination_added'
  | 'document_viewed'
  | (string & {})

/** Separate from health records — audit trail only. */
export interface ProfessionalAccessLog {
  id: string
  petId: string
  professionalId: string
  action: ProfessionalAccessLogAction
  timestamp: string
  /** Must not contain clinical content or PII payloads. */
  metadata?: Record<string, unknown>
}

/**
 * Safe public professional surface.
 * Never includes credentials, full license, employee PII, or internal docs.
 */
export interface PublicProfessionalProfile {
  id: string
  type: ProfessionalType
  displayName: string
  organizationName?: string
  city?: string
  description?: string
  specializations?: string[]
  services?: string[]
  profilePhotoUrl?: string
  logoUrl?: string
  publicEmail?: string
  publicPhone?: string
  website?: string
  hoursSummary?: string
  /** True only when real active trust verification exists — never DEMO. */
  verifiedBadge?: boolean
}
