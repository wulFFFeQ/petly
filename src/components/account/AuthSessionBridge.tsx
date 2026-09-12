/**
 * Keeps sync auth cache aligned with Node API cookie session (REAL mode only).
 */

import { useEffect, useState, type ReactNode } from 'react'
import { isRealAuthAvailable, onAuthStateChange } from '../../lib/auth'
import {
  clearAuthSessionCache,
  setAuthSessionReady,
  setCachedAuthenticatedAccountId,
} from '../../lib/auth/sessionCache'

export function AuthSessionBridge({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isRealAuthAvailable())

  useEffect(() => {
    if (!isRealAuthAvailable()) {
      clearAuthSessionCache()
      setReady(true)
      return
    }

    setAuthSessionReady(false)
    setReady(false)

    const unsub = onAuthStateChange((session) => {
      const id = session?.user?.id ?? null
      setCachedAuthenticatedAccountId(id)
      setAuthSessionReady(true)
      setReady(true)
    })

    return () => {
      unsub()
    }
  }, [])

  if (!ready) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#FAF8F5] text-sm text-[#5A6660]"
        data-testid="auth-session-loading"
      >
        Načítám session…
      </div>
    )
  }

  return <>{children}</>
}
