/** Absolute URL for a pet’s found-contact QR code. */
export function buildFoundPetUrl(token: string): string {
  const path = `/found/${encodeURIComponent(token)}`
  if (typeof window === 'undefined') return path
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${window.location.origin}${base}${path}`
}
