/**
 * Select DEMO vs production SecurityContext factory.
 * Production path requires configured API + authenticated UUID.
 */

import { isProductionBackendConfigured } from '../backend/config'
import {
  createDemoSecurityContext,
  type DemoSessionAdapterInput,
  type DemoSessionAdapterResult,
} from './demoSessionAdapter'
import {
  createServerSecurityContextFromSession,
  type ServerSessionAdapterResult,
} from './serverSessionAdapter'

export type CreateAppSecurityContextInput = DemoSessionAdapterInput & {
  /** Trusted auth user id when production backend is configured. */
  authenticatedAccountId?: string | null
  sessionId?: string
  authenticatedAt?: string
}

export type AppSecurityContextResult =
  | DemoSessionAdapterResult
  | ServerSessionAdapterResult

/**
 * When production backend is configured, require authenticatedAccountId from Auth.
 * Otherwise use DEMO session (owner_self localStorage) — never mix authorities.
 */
export function createAppSecurityContext(
  input: CreateAppSecurityContextInput = {},
): AppSecurityContextResult {
  if (isProductionBackendConfigured()) {
    return createServerSecurityContextFromSession({
      authenticatedAccountId: input.authenticatedAccountId ?? '',
      sessionId: input.sessionId,
      authenticatedAt: input.authenticatedAt,
      channel: input.channel,
      activeMode: input.activeMode,
      correlationId: input.correlationId,
      requestId: input.requestId,
      claimedActorAccountId: input.claimedActorAccountId,
    })
  }
  return createDemoSecurityContext(input)
}
