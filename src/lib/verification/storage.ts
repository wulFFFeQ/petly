import type { Verification } from './types'
import {
  VERIFICATION_SOURCES,
  VERIFICATION_STATUSES,
  VERIFICATION_TYPES,
} from './types'

export const VERIFICATIONS_STORAGE_KEY = 'lovedandknown.verifications'

const SUBJECT_TYPES = new Set(['user', 'pet', 'breeding_profile'])
const TYPE_SET = new Set<string>(VERIFICATION_TYPES)
const STATUS_SET = new Set<string>(VERIFICATION_STATUSES)
const SOURCE_SET = new Set<string>(VERIFICATION_SOURCES)
const PRESENTATION_SET = new Set(['trust', 'demo'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeVerification(raw: unknown): Verification | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const subjectType = raw.subjectType
  const subjectId = typeof raw.subjectId === 'string' ? raw.subjectId.trim() : ''
  const type = raw.type
  const status = raw.status
  const source = raw.source
  const presentation = raw.presentation

  if (!id || !subjectId) return null
  if (typeof subjectType !== 'string' || !SUBJECT_TYPES.has(subjectType)) return null
  if (typeof type !== 'string' || !TYPE_SET.has(type)) return null
  if (typeof status !== 'string' || !STATUS_SET.has(status)) return null
  if (typeof source !== 'string' || !SOURCE_SET.has(source)) return null
  if (typeof presentation !== 'string' || !PRESENTATION_SET.has(presentation)) return null

  const next: Verification = {
    id,
    subjectType: subjectType as Verification['subjectType'],
    subjectId,
    type: type as Verification['type'],
    status: status as Verification['status'],
    source: source as Verification['source'],
    presentation: presentation as Verification['presentation'],
  }

  if (typeof raw.verifiedAt === 'string' && raw.verifiedAt.trim()) {
    next.verifiedAt = raw.verifiedAt.trim()
  }
  if (typeof raw.expiresAt === 'string' && raw.expiresAt.trim()) {
    next.expiresAt = raw.expiresAt.trim()
  }
  if (isRecord(raw.metadata)) {
    next.metadata = { ...raw.metadata }
  }

  // Demo source can never be presented as public trust.
  if (next.source === 'local_demo') {
    next.presentation = 'demo'
  }

  return next
}

export function normalizeVerifications(raw: unknown): Verification[] {
  if (!Array.isArray(raw)) return []
  const out: Verification[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const v = normalizeVerification(item)
    if (!v || seen.has(v.id)) continue
    seen.add(v.id)
    out.push(v)
  }
  return out
}

export function loadVerifications(): Verification[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(VERIFICATIONS_STORAGE_KEY)
    if (!raw) return []
    return normalizeVerifications(JSON.parse(raw))
  } catch {
    return []
  }
}

export function saveVerifications(list: Verification[]): void {
  if (typeof localStorage === 'undefined') return
  const normalized = normalizeVerifications(list)
  localStorage.setItem(VERIFICATIONS_STORAGE_KEY, JSON.stringify(normalized))
}

export function upsertVerification(
  list: Verification[],
  verification: Verification,
): Verification[] {
  const normalized = normalizeVerification(verification)
  if (!normalized) return normalizeVerifications(list)
  const without = list.filter((v) => v.id !== normalized.id)
  return normalizeVerifications([...without, normalized])
}

export function removeVerification(list: Verification[], id: string): Verification[] {
  return list.filter((v) => v.id !== id)
}

export function createVerificationId(prefix = 'ver'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}
