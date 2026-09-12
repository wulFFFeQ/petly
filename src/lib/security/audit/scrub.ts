/**
 * Privacy scrubber for audit metadata.
 * Stricter than HH/Pro domain access logs — never clinical / PII / secrets.
 */

const FORBIDDEN_KEY =
  /password|token|cookie|session|cvv|card|secret|microchip|ownerPhone|ownerEmail|address|medication|healthRecord|diagnosis|lab|documentContent|message|body|payload|iban|providerAccount|emergencyContact|ownerContact|license/i

/**
 * Strip forbidden keys from metadata. Returns undefined if nothing safe remains.
 * Values are never inspected for clinical content beyond key names —
 * callers must not pass raw health/microchip/PII values under safe key names either.
 */
export function scrubAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata || Object.keys(metadata).length === 0) return undefined
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(metadata)) {
    if (FORBIDDEN_KEY.test(k)) continue
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const nested = scrubAuditMetadata(v as Record<string, unknown>)
      if (nested && Object.keys(nested).length > 0) safe[k] = nested
      continue
    }
    if (typeof v === 'string' && looksLikeSensitiveValue(k, v)) continue
    safe[k] = v
  }
  return Object.keys(safe).length > 0 ? safe : undefined
}

function looksLikeSensitiveValue(key: string, value: string): boolean {
  // Defensive: numeric-looking chip-length strings under ambiguous keys
  if (/chip/i.test(key) && /^\d{9,15}$/.test(value.trim())) return true
  return false
}

/** Assert an AuditEvent JSON string contains none of the forbidden substrings (tests). */
export function auditEventContainsForbiddenContent(
  serialized: string,
  forbiddenSubstrings: string[],
): boolean {
  const lower = serialized.toLowerCase()
  return forbiddenSubstrings.some((s) => lower.includes(s.toLowerCase()))
}
