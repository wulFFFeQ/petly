/**
 * K56 — Structured clinical service errors.
 * No sensitive internal details in client-facing messages.
 * K57 — STALE_VERSION / IMMUTABLE_VERSION / INVALID_VERSION.
 */

import {
  AuthorizationError,
  isAuthorizationError,
} from '../security/errors'
import type { AuthorizationDenyClass } from '../security/types'

export type ClinicalErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'STALE_ACCESS'
  | 'STALE_VERSION'
  | 'IMMUTABLE_VERSION'
  | 'INVALID_VERSION'
  | 'INVALID_RESOURCE'
  | 'INVALID_ENCOUNTER_TRANSITION'
  | 'SERVER_REQUIRED'
  | 'NOT_IMPLEMENTED'

export class ClinicalError extends Error {
  readonly code: ClinicalErrorCode
  readonly denyClass?: AuthorizationDenyClass

  constructor(code: ClinicalErrorCode, message: string, denyClass?: AuthorizationDenyClass) {
    super(message)
    this.name = 'ClinicalError'
    this.code = code
    this.denyClass = denyClass
  }
}

export function isClinicalError(err: unknown): err is ClinicalError {
  return err instanceof ClinicalError
}

export function staleVersion(message = 'Record was modified concurrently'): ClinicalError {
  return new ClinicalError('STALE_VERSION', message)
}

export function immutableVersion(message = 'Historical version is immutable'): ClinicalError {
  return new ClinicalError('IMMUTABLE_VERSION', message)
}

export function invalidVersion(message = 'Invalid version'): ClinicalError {
  return new ClinicalError('INVALID_VERSION', message)
}

export function invalidEncounterTransition(
  message = 'Invalid encounter status transition',
): ClinicalError {
  return new ClinicalError('INVALID_ENCOUNTER_TRANSITION', message)
}

/** Map K47 AuthorizationError → ClinicalError (no data leak expansion). */
export function clinicalErrorFromAuthorization(err: AuthorizationError): ClinicalError {
  if (err.code === 'unauthenticated') {
    return new ClinicalError('UNAUTHENTICATED', 'Authentication required', 'unauthenticated')
  }
  if (err.code === 'not_found' || err.denyClass === 'not_found') {
    return new ClinicalError('NOT_FOUND', 'Resource not found', 'not_found')
  }
  if (err.denyClass === 'revoked' || err.denyClass === 'expired') {
    return new ClinicalError('STALE_ACCESS', 'Access is no longer effective', err.denyClass)
  }
  if (err.denyClass === 'forged_identity') {
    return new ClinicalError('FORBIDDEN', 'Actor claim rejected', 'forged_identity')
  }
  return new ClinicalError('FORBIDDEN', 'Not authorized', err.denyClass ?? 'forbidden')
}

export function rethrowAsClinical(err: unknown): never {
  if (isClinicalError(err)) throw err
  if (isAuthorizationError(err)) throw clinicalErrorFromAuthorization(err)
  throw err
}

export function serverRequired(operation: string): ClinicalError {
  return new ClinicalError(
    'SERVER_REQUIRED',
    `${operation} requires server clinical authority`,
  )
}

export function notImplemented(operation: string): ClinicalError {
  return new ClinicalError(
    'NOT_IMPLEMENTED',
    `${operation} is not implemented in this step`,
  )
}
