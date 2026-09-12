/**
 * Cookie-session auth against Node API (/api/auth).
 * Replaces Supabase Auth.
 */

import { isProductionBackendConfigured } from '../backend/config'
import { invokeApi } from '../api/apiClient'
import {
  clearAuthSessionCache,
  setCachedAuthenticatedAccountId,
  setAuthSessionReady,
} from './sessionCache'

export type AuthAccount = {
  id: string
  kind: string
  roles: string[]
  displayName: string | null
  email?: string | null
}

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export type AuthSession = {
  user: { id: string }
  account: AuthAccount
}

export function isRealAuthAvailable(): boolean {
  return isProductionBackendConfigured()
}

export async function signUpWithEmailPassword(input: {
  email: string
  password: string
  displayName?: string
}): Promise<AuthResult<{ user: { id: string }; session: AuthSession | null }>> {
  if (!isRealAuthAvailable()) {
    return { ok: false, message: 'PRODUCTION CONNECTION NOT CONFIGURED' }
  }
  const result = await invokeApi<{ ok?: boolean; account?: AuthAccount }>('auth', {
    op: 'register',
    email: input.email.trim(),
    password: input.password,
    displayName: input.displayName?.trim(),
  })
  if (!result.ok) return { ok: false, message: result.message }
  const account = result.data.account
  if (!account?.id) return { ok: false, message: 'Sign up failed' }
  setCachedAuthenticatedAccountId(account.id)
  setAuthSessionReady(true)
  return {
    ok: true,
    data: {
      user: { id: account.id },
      session: { user: { id: account.id }, account },
    },
  }
}

export async function signInWithEmailPassword(input: {
  email: string
  password: string
}): Promise<AuthResult<{ user: { id: string }; session: AuthSession }>> {
  if (!isRealAuthAvailable()) {
    return { ok: false, message: 'PRODUCTION CONNECTION NOT CONFIGURED' }
  }
  const result = await invokeApi<{ ok?: boolean; account?: AuthAccount }>('auth', {
    op: 'login',
    email: input.email.trim(),
    password: input.password,
  })
  if (!result.ok) return { ok: false, message: result.message }
  const account = result.data.account
  if (!account?.id) return { ok: false, message: 'Sign in failed' }
  setCachedAuthenticatedAccountId(account.id)
  setAuthSessionReady(true)
  return {
    ok: true,
    data: {
      user: { id: account.id },
      session: { user: { id: account.id }, account },
    },
  }
}

export async function signOutAuth(): Promise<AuthResult<null>> {
  if (!isRealAuthAvailable()) {
    clearAuthSessionCache()
    return { ok: true, data: null }
  }
  await invokeApi('auth', { op: 'logout' })
  clearAuthSessionCache()
  setAuthSessionReady(true)
  return { ok: true, data: null }
}

export async function getAuthSession(): Promise<AuthSession | null> {
  if (!isRealAuthAvailable()) return null
  const result = await invokeApi<{ ok?: boolean; account?: AuthAccount }>('auth', {
    op: 'me',
  })
  if (!result.ok || !result.data.account?.id) return null
  const account = result.data.account
  setCachedAuthenticatedAccountId(account.id)
  return { user: { id: account.id }, account }
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getAuthSession()
  return session?.user.id ?? null
}

/** Poll-friendly: subscribers called when session is refreshed via me/login/logout. */
const listeners = new Set<(session: AuthSession | null) => void>()

export function onAuthStateChange(
  callback: (session: AuthSession | null) => void,
): () => void {
  listeners.add(callback)
  void getAuthSession().then((session) => callback(session))
  return () => {
    listeners.delete(callback)
  }
}

export function notifyAuthListeners(session: AuthSession | null) {
  for (const cb of listeners) cb(session)
}
