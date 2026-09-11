const FORBIDDEN_PATTERNS = [
  /microchip/i,
  /ownerContacts?/i,
  /ownerPhone/i,
  /ownerEmail/i,
  /medication/i,
  /vaccination/i,
  /healthRecord/i,
  /documentContent/i,
  /internalNote/i,
  /clinicInternal/i,
  /verificationStatus/i,
  /licenseNumber/i,
  /password/i,
]

/** True when payload JSON does not contain forbidden private fields. */
export function isSafeMessagingPayload(payload: unknown): boolean {
  if (payload == null) return true
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return !FORBIDDEN_PATTERNS.some((re) => re.test(text))
}

export function assertMessagingPayloadSafe(payload: unknown, label = 'messaging'): void {
  if (!isSafeMessagingPayload(payload)) {
    throw new Error(`${label}: payload contains forbidden private fields`)
  }
}
