import {
  PROFESSIONAL_PERMISSIONS,
  READ_PERMISSIONS,
  WRITE_PERMISSIONS,
  type ProfessionalPermission,
} from './types'

const PERM_SET = new Set<string>(PROFESSIONAL_PERMISSIONS)
const READ_SET = new Set<string>(READ_PERMISSIONS)
const WRITE_SET = new Set<string>(WRITE_PERMISSIONS)

export function isProfessionalPermission(value: unknown): value is ProfessionalPermission {
  return typeof value === 'string' && PERM_SET.has(value)
}

export function isReadPermission(perm: ProfessionalPermission): boolean {
  return READ_SET.has(perm)
}

export function isWritePermission(perm: ProfessionalPermission): boolean {
  return WRITE_SET.has(perm)
}

export function normalizePermissions(raw: unknown): ProfessionalPermission[] {
  if (!Array.isArray(raw)) return []
  const out: ProfessionalPermission[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!isProfessionalPermission(item) || seen.has(item)) continue
    seen.add(item)
    out.push(item)
  }
  return out
}

/** viewHealth does not imply addHealthRecord (or any write). */
export function readDoesNotImplyWrite(
  permissions: ProfessionalPermission[],
  writePerm: ProfessionalPermission,
): boolean {
  if (!isWritePermission(writePerm)) return true
  return !permissions.includes(writePerm)
}
