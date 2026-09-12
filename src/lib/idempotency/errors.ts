/**
 * K63 — Idempotency errors.
 * Not AuthorizationError — callers must already have passed authorize().
 */

export type IdempotencyErrorCode =
  | 'IDEMPOTENCY_CONFLICT'
  | 'IDEMPOTENCY_IN_PROGRESS'
  | 'SERVER_REQUIRED'
  | 'INVALID_KEY'

export class IdempotencyError extends Error {
  readonly code: IdempotencyErrorCode

  constructor(code: IdempotencyErrorCode, message: string) {
    super(message)
    this.name = 'IdempotencyError'
    this.code = code
  }
}

export function isIdempotencyError(err: unknown): err is IdempotencyError {
  return err instanceof IdempotencyError
}

export function idempotencyConflict(
  message = 'Idempotency key reused with a different request fingerprint',
): IdempotencyError {
  return new IdempotencyError('IDEMPOTENCY_CONFLICT', message)
}

export function idempotencyInProgress(
  message = 'Idempotency request is already in progress',
): IdempotencyError {
  return new IdempotencyError('IDEMPOTENCY_IN_PROGRESS', message)
}

export function idempotencyServerRequired(
  message = 'Production idempotency requires server-side atomic storage',
): IdempotencyError {
  return new IdempotencyError('SERVER_REQUIRED', message)
}
