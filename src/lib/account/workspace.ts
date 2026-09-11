/**
 * UI workspace mode only — does NOT change roles, access, permissions, or data.
 * Consumer and professional environments stay logically separated in the UI.
 */

export type UiWorkspace = 'consumer' | 'professional'

export const UI_WORKSPACE_STORAGE_KEY = 'lovedandknown.uiWorkspace'

export function normalizeUiWorkspace(raw: unknown): UiWorkspace {
  return raw === 'professional' ? 'professional' : 'consumer'
}

export function getUiWorkspace(): UiWorkspace {
  if (typeof sessionStorage === 'undefined') return 'consumer'
  try {
    return normalizeUiWorkspace(sessionStorage.getItem(UI_WORKSPACE_STORAGE_KEY))
  } catch {
    return 'consumer'
  }
}

export function setUiWorkspace(mode: UiWorkspace): UiWorkspace {
  const next = normalizeUiWorkspace(mode)
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(UI_WORKSPACE_STORAGE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }
  return next
}

export function isProfessionalUiWorkspace(): boolean {
  return getUiWorkspace() === 'professional'
}

/** Clear session-scoped UI workspace only (logout). Does not touch account data. */
export function clearUiWorkspace(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(UI_WORKSPACE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
