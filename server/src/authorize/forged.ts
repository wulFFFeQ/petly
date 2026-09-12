import type { AuthorizationDecision } from '../authorize/petAuthorize.js'

/** Narrow forged-claim deny (rejectForgedActorClaim returns null or deny). */
export function forgedDeny(
  decision: AuthorizationDecision | null,
): { code: string; reason: string } | null {
  if (!decision || decision.allowed) return null
  return { code: decision.code, reason: decision.reason }
}
