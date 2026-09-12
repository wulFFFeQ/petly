/**
 * Organization context — client organizationId is UNTRUSTED.
 * Server must verify actor → active membership → organization.
 */

import {
  findMembership,
  isOrganizationMembershipEffective,
  loadOrganizationMemberships,
  loadOrganizations,
} from '../organization'
import { actorAccountId } from './context'
import type { SecurityContext, ValidatedOrganizationContext } from './types'

export type ResolveOrganizationContextDeps = {
  loadMemberships?: typeof loadOrganizationMemberships
  loadOrganizations?: typeof loadOrganizations
}

export type ResolveOrganizationContextResult =
  | { ok: true; organization: ValidatedOrganizationContext }
  | { ok: false; message: string }

export function resolveOrganizationContext(
  ctx: SecurityContext,
  claimedOrganizationId: string | undefined,
  deps: ResolveOrganizationContextDeps = {},
): ResolveOrganizationContextResult {
  const accountId = actorAccountId(ctx)
  if (!accountId) {
    return { ok: false, message: 'No authenticated account for organization context' }
  }

  const orgId = typeof claimedOrganizationId === 'string' ? claimedOrganizationId.trim() : ''
  if (!orgId) {
    return { ok: false, message: 'organizationId is required for organization context' }
  }

  const loadMemberships = deps.loadMemberships ?? loadOrganizationMemberships
  const loadOrgs = deps.loadOrganizations ?? loadOrganizations

  const orgs = loadOrgs()
  if (!orgs.some((o) => o.id === orgId)) {
    return { ok: false, message: `Organization not found: ${orgId}` }
  }

  const memberships = loadMemberships()
  const membership = findMembership(memberships, orgId, accountId)
  if (!isOrganizationMembershipEffective(membership)) {
    return {
      ok: false,
      message: 'Actor is not an active member of the claimed organization',
    }
  }

  return {
    ok: true,
    organization: {
      organizationId: orgId,
      membershipId: membership!.id,
      role: membership!.role,
    },
  }
}
