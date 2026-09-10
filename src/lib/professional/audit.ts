import type { ProfessionalAccessLog, ProfessionalAccessLogAction } from './types'

export function createAccessLogId(prefix = 'pal'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function createAccessLogEntry(opts: {
  petId: string
  professionalId: string
  action: ProfessionalAccessLogAction
  timestamp?: string
  metadata?: Record<string, unknown>
}): ProfessionalAccessLog {
  const entry: ProfessionalAccessLog = {
    id: createAccessLogId(),
    petId: opts.petId,
    professionalId: opts.professionalId,
    action: opts.action,
    timestamp: opts.timestamp ?? new Date().toISOString(),
  }
  if (opts.metadata && Object.keys(opts.metadata).length > 0) {
    // Strip obvious sensitive keys if callers pass them by mistake.
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(opts.metadata)) {
      if (
        /microchip|password|license|documentContent|ownerPhone|ownerEmail|address/i.test(k)
      ) {
        continue
      }
      safe[k] = v
    }
    if (Object.keys(safe).length > 0) entry.metadata = safe
  }
  return entry
}

/** Append-only merge — never mutates health records. */
export function appendAccessLog(
  logs: ProfessionalAccessLog[],
  entry: ProfessionalAccessLog,
): ProfessionalAccessLog[] {
  return [...logs, entry]
}

export function filterLogsForPet(
  logs: ProfessionalAccessLog[],
  petId: string,
): ProfessionalAccessLog[] {
  return logs.filter((l) => l.petId === petId)
}

export function filterLogsForProfessional(
  logs: ProfessionalAccessLog[],
  professionalId: string,
): ProfessionalAccessLog[] {
  return logs.filter((l) => l.professionalId === professionalId)
}

export function logsIncludeAction(
  logs: ProfessionalAccessLog[],
  action: ProfessionalAccessLogAction,
  opts?: { petId?: string; professionalId?: string },
): boolean {
  return logs.some((l) => {
    if (l.action !== action) return false
    if (opts?.petId && l.petId !== opts.petId) return false
    if (opts?.professionalId && l.professionalId !== opts.professionalId) return false
    return true
  })
}
