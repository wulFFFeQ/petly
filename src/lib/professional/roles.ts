import {
  CONSUMER_ROLES,
  KNOWN_PROFESSIONAL_TYPES,
  type Account,
  type AccountRole,
  type ProfessionalType,
} from './types'

const KNOWN_PRO_SET = new Set<string>(KNOWN_PROFESSIONAL_TYPES)
const CONSUMER_SET = new Set<string>(CONSUMER_ROLES)

/**
 * Whether a role string is a professional type.
 * Unknown future types (not in KNOWN list) still count as professional
 * when they are not the consumer `owner` role.
 */
export function isProfessionalType(role: string): role is ProfessionalType {
  if (CONSUMER_SET.has(role)) return false
  if (KNOWN_PRO_SET.has(role)) return true
  // Extensible: any non-owner role string is treated as a professional type.
  return typeof role === 'string' && role.trim().length > 0
}

export function isConsumerRole(role: string): role is 'owner' {
  return role === 'owner'
}

export function accountHasRole(account: Account | null | undefined, role: AccountRole): boolean {
  if (!account?.roles?.length) return false
  return account.roles.includes(role)
}

export function isConsumerAccount(account: Account | null | undefined): boolean {
  if (!account) return false
  return account.kind === 'consumer' || accountHasRole(account, 'owner')
}

export function isProfessionalAccount(account: Account | null | undefined): boolean {
  if (!account) return false
  if (account.kind === 'professional') return true
  return account.roles.some((r) => isProfessionalType(r))
}

/**
 * Roles never imply data access — keep this helper for documentation / guards.
 */
export function roleGrantsPetDataAccess(_role: AccountRole): false {
  return false
}

/**
 * Idempotently add a role. Does not touch verification, entitlements, or pet access.
 * Hybrid consumers keep kind `consumer`; org-only accounts stay `professional`.
 */
export function addAccountRole(account: Account, role: AccountRole): Account {
  const roles = [...account.roles]
  if (!roles.includes(role)) roles.push(role)

  let kind = account.kind
  if (role === 'owner') {
    // Adding owner to a pro org account makes it a hybrid consumer-capable account.
    kind = 'consumer'
  } else if (isProfessionalType(role) && kind === 'consumer') {
    // Stay consumer when already has owner (hybrid); kind stays consumer.
    kind = 'consumer'
  } else if (isProfessionalType(role) && !roles.includes('owner')) {
    kind = 'professional'
  }

  return {
    ...account,
    kind,
    roles,
    updatedAt: new Date().toISOString(),
  }
}
