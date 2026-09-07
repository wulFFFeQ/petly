/** Normalize and lightly validate a phone for optional contact exchange. */
export function normalizeSharedPhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 15) return null
  // Keep user formatting lightly cleaned
  return trimmed.replace(/\s{2,}/g, ' ').slice(0, 32)
}
