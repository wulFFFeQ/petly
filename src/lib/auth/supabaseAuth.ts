/**
 * LAUNCH 02 — real Supabase Auth (email + password).
 * No social / MFA / passwordless in this step.
 */

import type { Session, User } from '@supabase/supabase-js'
import { isProductionBackendConfigured } from '../backend/config'
import { getSupabaseBrowserClient } from './supabaseClient'

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export function isRealAuthAvailable(): boolean {
  return isProductionBackendConfigured() && getSupabaseBrowserClient() !== null
}

export async function signUpWithEmailPassword(input: {
  email: string
  password: string
  displayName?: string
}): Promise<AuthResult<{ user: User; session: Session | null }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { ok: false, message: 'PRODUCTION CONNECTION NOT CONFIGURED' }
  }
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: input.displayName?.trim()
        ? { display_name: input.displayName.trim() }
        : undefined,
    },
  })
  if (error || !data.user) {
    return { ok: false, message: error?.message ?? 'Sign up failed' }
  }
  return { ok: true, data: { user: data.user, session: data.session } }
}

export async function signInWithEmailPassword(input: {
  email: string
  password: string
}): Promise<AuthResult<{ user: User; session: Session }>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { ok: false, message: 'PRODUCTION CONNECTION NOT CONFIGURED' }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email.trim(),
    password: input.password,
  })
  if (error || !data.user || !data.session) {
    return { ok: false, message: error?.message ?? 'Sign in failed' }
  }
  return { ok: true, data: { user: data.user, session: data.session } }
}

export async function signOutAuth(): Promise<AuthResult<null>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { ok: false, message: 'PRODUCTION CONNECTION NOT CONFIGURED' }
  }
  const { error } = await supabase.auth.signOut()
  if (error) return { ok: false, message: error.message }
  return { ok: true, data: null }
}

export async function getAuthSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await getAuthSession()
  if (!session?.user?.id) return null
  const expiresAt = session.expires_at
  if (typeof expiresAt === 'number' && expiresAt * 1000 <= Date.now()) {
    return null
  }
  return session.user.id
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    callback(null)
    return () => {}
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => data.subscription.unsubscribe()
}
