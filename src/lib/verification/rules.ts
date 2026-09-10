import { SELF_OWNER_ID } from '../discover/owner'
import { createVerificationId } from './storage'
import type { Verification, VerificationType } from './types'
import { getEmailProvider, getSmsProvider, getIdentityProvider, getPetRelationProvider, getVetAttestationProvider } from './providers'

/**
 * Rules for each verification type.
 * Identity / pet / veterinary cannot become trust-verified without a real provider.
 */

export function findSubjectVerifications(
  list: Verification[],
  subjectType: Verification['subjectType'],
  subjectId: string,
  type?: VerificationType,
): Verification[] {
  return list.filter(
    (v) =>
      v.subjectType === subjectType &&
      v.subjectId === subjectId &&
      (type == null || v.type === type),
  )
}

/**
 * Start / complete a local DEMO email confirmation.
 * Always presentation:'demo' — never public trust.
 */
export function createDemoEmailVerification(opts: {
  email: string
  userId?: string
  nowIso?: string
}): Verification {
  const provider = getEmailProvider()
  return {
    id: createVerificationId('email'),
    subjectType: 'user',
    subjectId: opts.userId ?? SELF_OWNER_ID,
    type: 'email',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: opts.nowIso ?? new Date().toISOString(),
    metadata: {
      channel: 'email',
      demo: true,
      providerId: provider.id,
      providerMode: provider.mode,
      // Store hashed-ish hint only in metadata — never for public projection
      emailHint: maskContact(opts.email),
    },
  }
}

export function createDemoPhoneVerification(opts: {
  phone: string
  userId?: string
  nowIso?: string
}): Verification {
  const provider = getSmsProvider()
  return {
    id: createVerificationId('phone'),
    subjectType: 'user',
    subjectId: opts.userId ?? SELF_OWNER_ID,
    type: 'phone',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: opts.nowIso ?? new Date().toISOString(),
    metadata: {
      channel: 'phone',
      demo: true,
      providerId: provider.id,
      providerMode: provider.mode,
      phoneHint: maskContact(opts.phone),
    },
  }
}

/**
 * Factory for tests / future providers: trust email verification.
 * App UI must not call this until a real email provider is wired.
 */
export function createTrustEmailVerification(opts: {
  userId?: string
  nowIso?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}): Verification {
  return {
    id: createVerificationId('email'),
    subjectType: 'user',
    subjectId: opts.userId ?? SELF_OWNER_ID,
    type: 'email',
    status: 'verified',
    source: 'email_provider',
    presentation: 'trust',
    verifiedAt: opts.nowIso ?? new Date().toISOString(),
    expiresAt: opts.expiresAt,
    metadata: opts.metadata,
  }
}

export function createTrustPhoneVerification(opts: {
  userId?: string
  nowIso?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}): Verification {
  return {
    id: createVerificationId('phone'),
    subjectType: 'user',
    subjectId: opts.userId ?? SELF_OWNER_ID,
    type: 'phone',
    status: 'verified',
    source: 'sms_provider',
    presentation: 'trust',
    verifiedAt: opts.nowIso ?? new Date().toISOString(),
    expiresAt: opts.expiresAt,
    metadata: opts.metadata,
  }
}

export function createTrustPetVerification(opts: {
  petId: string
  nowIso?: string
  metadata?: Record<string, unknown>
}): Verification {
  return {
    id: createVerificationId('pet'),
    subjectType: 'pet',
    subjectId: opts.petId,
    type: 'pet',
    status: 'verified',
    source: 'pet_relation_provider',
    presentation: 'trust',
    verifiedAt: opts.nowIso ?? new Date().toISOString(),
    metadata: opts.metadata,
  }
}

export function createTrustIdentityVerification(opts: {
  userId?: string
  nowIso?: string
  metadata?: Record<string, unknown>
}): Verification {
  return {
    id: createVerificationId('identity'),
    subjectType: 'user',
    subjectId: opts.userId ?? SELF_OWNER_ID,
    type: 'identity',
    status: 'verified',
    source: 'identity_provider',
    presentation: 'trust',
    verifiedAt: opts.nowIso ?? new Date().toISOString(),
    metadata: opts.metadata,
  }
}

/** Identity cannot be verified without a live provider. */
export function assertIdentityProviderAllowsTrust(): { ok: false; reason: string } | { ok: true } {
  const p = getIdentityProvider()
  if (!p.canIssueTrust) {
    return { ok: false, reason: p.note }
  }
  return { ok: true }
}

export function assertPetRelationProviderAllowsTrust(): { ok: false; reason: string } | { ok: true } {
  const p = getPetRelationProvider()
  if (!p.canIssueTrust) {
    return { ok: false, reason: p.note }
  }
  return { ok: true }
}

export function assertVetProviderAllowsTrust(): { ok: false; reason: string } | { ok: true } {
  const p = getVetAttestationProvider()
  if (!p.canIssueTrust) {
    return { ok: false, reason: p.note }
  }
  return { ok: true }
}

/**
 * Microchip entry / registry check must NEVER auto-create a Verified Pet record.
 */
export function microchipDoesNotProveOwnership(): true {
  return true
}

function maskContact(value: string): string {
  const t = value.trim()
  if (t.length <= 4) return '****'
  return `${t.slice(0, 2)}***${t.slice(-2)}`
}

export function revokeVerification(v: Verification, nowIso = new Date().toISOString()): Verification {
  return {
    ...v,
    status: 'revoked',
    metadata: {
      ...(v.metadata ?? {}),
      revokedAt: nowIso,
    },
  }
}
