/** Opaque token for public found-pet QR URLs — never derived from microchip. */
export function createFoundContactToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `fc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}

export function isFoundContactToken(value: string | undefined): boolean {
  return typeof value === 'string' && /^[a-z0-9]{16,64}$/i.test(value.trim())
}
