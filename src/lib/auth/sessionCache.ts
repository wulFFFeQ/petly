/**
 * Sync cache of authenticated Supabase user id for SecurityContext / gates.
 * Updated only by AuthSessionBridge from onAuthStateChange — never from client forms.
 */

let cachedAccountId: string | null = null
let authReady = false

export function getCachedAuthenticatedAccountId(): string | null {
  return cachedAccountId
}

export function setCachedAuthenticatedAccountId(accountId: string | null): void {
  if (accountId === 'owner_self') {
    cachedAccountId = null
    return
  }
  cachedAccountId = accountId
}

export function isAuthSessionReady(): boolean {
  return authReady
}

export function setAuthSessionReady(ready: boolean): void {
  authReady = ready
}

export function clearAuthSessionCache(): void {
  cachedAccountId = null
  authReady = true
}
