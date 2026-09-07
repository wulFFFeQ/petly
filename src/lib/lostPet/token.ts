/** Opaque token for public lost-pet announcement URLs — never derived from microchip. */
export function createLostAnnouncementToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `lp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export function isLostAnnouncementToken(value: string | undefined): boolean {
  return typeof value === 'string' && /^[a-z0-9]{16,64}$/i.test(value.trim())
}

/** Stable anonymous id for a finder session (no PII). */
export function getOrCreateReporterAnonymousId(): string {
  const key = 'lovedandknown.lostPetReporterId'
  try {
    const existing = window.localStorage.getItem(key)?.trim()
    if (existing && existing.length >= 8) return existing
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/-/g, '')
        : `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
    window.localStorage.setItem(key, id)
    return id
  } catch {
    return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  }
}
