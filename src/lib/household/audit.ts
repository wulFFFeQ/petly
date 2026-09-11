import type { HouseholdAccessLogAction, PetHouseholdAccessLog } from './types'

export function createHouseholdAccessLogId(prefix = 'phal'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function createHouseholdAccessLogEntry(opts: {
  petId: string
  accountId: string
  action: HouseholdAccessLogAction
  timestamp?: string
  metadata?: Record<string, unknown>
}): PetHouseholdAccessLog {
  const entry: PetHouseholdAccessLog = {
    id: createHouseholdAccessLogId(),
    petId: opts.petId,
    accountId: opts.accountId,
    action: opts.action,
    timestamp: opts.timestamp ?? new Date().toISOString(),
  }
  if (opts.metadata && Object.keys(opts.metadata).length > 0) {
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(opts.metadata)) {
      if (/microchip|password|license|documentContent|ownerPhone|ownerEmail|address|medication|healthRecord/i.test(k)) {
        continue
      }
      safe[k] = v
    }
    if (Object.keys(safe).length > 0) entry.metadata = safe
  }
  return entry
}

export function appendHouseholdAccessLog(
  logs: PetHouseholdAccessLog[],
  entry: PetHouseholdAccessLog,
): PetHouseholdAccessLog[] {
  return [...logs, entry]
}

export function filterHouseholdLogsForPet(
  logs: PetHouseholdAccessLog[],
  petId: string,
): PetHouseholdAccessLog[] {
  return logs.filter((l) => l.petId === petId)
}
