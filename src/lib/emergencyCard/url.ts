/** Absolute URL for a pet’s public emergency card (QR target). */
export function buildEmergencyCardUrl(publicSlug: string): string {
  const path = `/pet/${encodeURIComponent(publicSlug)}/emergency`
  if (typeof window === 'undefined') return path
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}${path}`
}

export function buildEmergencyCardPath(publicSlug: string): string {
  return `/pet/${encodeURIComponent(publicSlug)}/emergency`
}
