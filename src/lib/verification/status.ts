import type { Verification, VerificationStatus } from './types'

/** Whether status is currently active for trust/UI purposes (before presentation filter). */
export function isActiveVerificationStatus(
  status: VerificationStatus,
  expiresAt?: string,
  now = Date.now(),
): boolean {
  if (status !== 'verified') return false
  if (expiresAt) {
    const exp = Date.parse(expiresAt)
    if (Number.isFinite(exp) && exp <= now) return false
  }
  return true
}

/**
 * Active for public/owner trust badges: verified, not expired, and presentation === 'trust'.
 * Demo records are never active trust.
 */
export function isActiveTrustVerification(v: Verification, now = Date.now()): boolean {
  if (v.presentation !== 'trust') return false
  return isActiveVerificationStatus(v.status, v.expiresAt, now)
}

/** Demo verification that must not be shown as real trust. */
export function isDemoVerification(v: Verification): boolean {
  return v.presentation === 'demo' || v.source === 'local_demo'
}

/**
 * If a verified record has passed expiresAt, treat effective status as expired.
 * Does not mutate storage — callers may persist the update.
 */
export function effectiveStatus(v: Verification, now = Date.now()): VerificationStatus {
  if (v.status === 'verified' && v.expiresAt) {
    const exp = Date.parse(v.expiresAt)
    if (Number.isFinite(exp) && exp <= now) return 'expired'
  }
  return v.status
}
