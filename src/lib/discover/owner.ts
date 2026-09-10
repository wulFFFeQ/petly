/** Stable owner id for the signed-in user's Discover projections. */
export const SELF_OWNER_ID = 'owner_self'

const USER_DISPLAY_NAME_KEY = 'lovedandknown.userDisplayName'
export const DEFAULT_USER_DISPLAY_NAME = 'Tereza V.'

export function getUserDisplayName(): string {
  if (typeof window === 'undefined') return DEFAULT_USER_DISPLAY_NAME
  try {
    const raw = window.localStorage.getItem(USER_DISPLAY_NAME_KEY)?.trim()
    if (raw) return raw
  } catch {
    // ignore
  }
  return DEFAULT_USER_DISPLAY_NAME
}

export function setUserDisplayName(value: string): void {
  if (typeof window === 'undefined') return
  const trimmed = value.trim()
  try {
    if (trimmed) window.localStorage.setItem(USER_DISPLAY_NAME_KEY, trimmed)
    else window.localStorage.removeItem(USER_DISPLAY_NAME_KEY)
  } catch {
    // ignore
  }
}
