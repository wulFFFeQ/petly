/**
 * Structured authorization errors — no HTTP framework required.
 * Sensitive resources may later map unauthorized → not_found (existence masking).
 */

import type { AuthorizationDenyClass, AuthorizationDenyCode } from './types'

export class AuthorizationError extends Error {
  readonly code: AuthorizationDenyCode
  readonly denyClass: AuthorizationDenyClass

  constructor(
    code: AuthorizationDenyCode,
    message: string,
    denyClass: AuthorizationDenyClass = code === 'unauthenticated'
      ? 'unauthenticated'
      : code === 'not_found'
        ? 'not_found'
        : 'forbidden',
  ) {
    super(message)
    this.name = 'AuthorizationError'
    this.code = code
    this.denyClass = denyClass
  }
}

export function isAuthorizationError(err: unknown): err is AuthorizationError {
  return err instanceof AuthorizationError
}
