/**
 * K63 — Request fingerprint for idempotency conflict detection.
 * Same key + different operation/context/payload → IDEMPOTENCY_CONFLICT.
 */

/** Stable JSON for fingerprinting (sorted object keys, array order preserved). */
export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableSerialize(v)).join(',')}]`
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(',')}}`
  }
  return JSON.stringify(String(value))
}

/** FNV-1a 32-bit — sync, DEMO-safe; production may use stronger server hashes. */
export function hashFingerprintMaterial(material: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Fingerprint covers operation + resource + payload.
 * Actor is NOT in the fingerprint — actor isolation is via store key scope.
 */
export function buildRequestFingerprint(input: {
  operation: string
  resourceRef: string
  payload: unknown
}): string {
  const material = stableSerialize({
    operation: input.operation,
    resourceRef: input.resourceRef,
    payload: input.payload,
  })
  return hashFingerprintMaterial(material)
}
