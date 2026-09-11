import type { Organization, PublicOrganization } from './types'

/** Keys forbidden on any public organization payload. */
export const PUBLIC_ORGANIZATION_FORBIDDEN_KEYS = [
  'legalName',
  'memberAccountIds',
  'memberships',
  'members',
  'accountId',
  'accountIds',
  'status',
  'publicVisibility',
  'name',
  'type',
  'payment',
  'payments',
  'stripe',
  'credentials',
  'ownerPii',
  'health',
  'microchip',
  'documents',
  'internalNotes',
] as const

/**
 * Safe public projection. Returns null when not public.
 * K42: no public catalog route uses this yet.
 */
export function toPublicOrganization(org: Organization): PublicOrganization | null {
  if ((org.publicVisibility ?? 'private') !== 'public') return null
  return {
    id: org.id,
    displayName: org.displayName,
    organizationType: org.organizationType,
  }
}

export function assertOrganizationProjectionSafe(
  pub: PublicOrganization | Record<string, unknown>,
): void {
  for (const key of PUBLIC_ORGANIZATION_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(pub, key) && (pub as Record<string, unknown>)[key] != null) {
      throw new Error(`PublicOrganization must not include forbidden key: ${key}`)
    }
  }
  if (!('id' in pub) || !('displayName' in pub) || !('organizationType' in pub)) {
    throw new Error('PublicOrganization missing required fields')
  }
}
