/**
 * Load pet + grants for server authorize. Uses service_role client.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import type {
  HouseholdGrant,
  OrgPetGrant,
  PetRow,
  ProfessionalGrant,
} from './authorize.ts'

export async function loadPetAuthzBundle(
  db: SupabaseClient,
  petId: string,
  actorAccountId: string,
): Promise<{
  pet: PetRow | null
  householdGrants: HouseholdGrant[]
  professionalGrants: ProfessionalGrant[]
  orgPetGrants: OrgPetGrant[]
}> {
  const { data: pet } = await db
    .from('pets')
    .select('id, owner_account_id')
    .eq('id', petId)
    .maybeSingle()

  const { data: hh } = await db
    .from('pet_household_access')
    .select('id, account_id, permissions, status, expires_at, revoked_at')
    .eq('pet_id', petId)

  const { data: pro } = await db
    .from('pet_professional_access')
    .select(
      'id, professional_id, permissions, status, expires_at, revoked_at, professional_profiles!inner(account_id)',
    )
    .eq('pet_id', petId)

  const professionalGrants: ProfessionalGrant[] = (pro ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.professional_profiles as { account_id: string } | { account_id: string }[]
    const accountId = Array.isArray(profiles)
      ? profiles[0]?.account_id
      : profiles?.account_id
    return {
      id: String(row.id),
      professional_id: String(row.professional_id),
      professional_account_id: String(accountId ?? ''),
      permissions: (row.permissions as string[]) ?? [],
      status: String(row.status),
      expires_at: (row.expires_at as string | null) ?? null,
      revoked_at: (row.revoked_at as string | null) ?? null,
    }
  })

  const { data: opa } = await db
    .from('organization_pet_access')
    .select(
      'id, organization_id, permissions, status, visibility_mode, eligible_roles, assigned_account_ids, expires_at, revoked_at',
    )
    .eq('pet_id', petId)
    .eq('status', 'active')

  const orgPetGrants: OrgPetGrant[] = []
  for (const row of opa ?? []) {
    const { data: membership } = await db
      .from('organization_memberships')
      .select('id, role, status')
      .eq('organization_id', row.organization_id)
      .eq('account_id', actorAccountId)
      .maybeSingle()

    const visibilityOk =
      (row.visibility_mode === 'assigned_only' &&
        Array.isArray(row.assigned_account_ids) &&
        row.assigned_account_ids.includes(actorAccountId)) ||
      (row.visibility_mode === 'role_eligible' &&
        membership?.status === 'active' &&
        (row.eligible_roles ?? ['professional']).includes(membership.role))

    if (!visibilityOk) continue

    orgPetGrants.push({
      id: row.id,
      organization_id: row.organization_id,
      permissions: row.permissions ?? [],
      status: row.status,
      visibility_mode: row.visibility_mode,
      eligible_roles: row.eligible_roles,
      assigned_account_ids: row.assigned_account_ids,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
      membership_role: membership?.role ?? null,
      membership_status: membership?.status ?? null,
      membership_id: membership?.id ?? null,
    })
  }

  return {
    pet: pet as PetRow | null,
    householdGrants: (hh ?? []) as HouseholdGrant[],
    professionalGrants,
    orgPetGrants,
  }
}

export async function recordAuditEvent(
  db: SupabaseClient,
  event: {
    actorAccountId?: string
    resourceType: string
    resourceId: string
    action: string
    result: 'allow' | 'deny'
    reasonCode?: string
    denyCode?: string
    denyClass?: string
    grantId?: string
    permission?: string
    allowPath?: string
    correlationId?: string
    idempotencyRef?: string
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  // Audit failure must not flip authorization — swallow errors.
  try {
    await db.from('audit_events').insert({
      kind: 'authorization_decision',
      actor_account_id: event.actorAccountId ?? null,
      actor_type: event.actorAccountId ? 'account' : 'anonymous',
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      action: event.action,
      result: event.result,
      reason_code: event.reasonCode ?? null,
      deny_code: event.denyCode ?? null,
      deny_class: event.denyClass ?? null,
      grant_id: event.grantId ?? null,
      permission: event.permission ?? null,
      allow_path: event.allowPath ?? null,
      correlation_id: event.correlationId ?? null,
      idempotency_ref: event.idempotencyRef ?? null,
      source: 'edge',
      authority: 'server',
      metadata: event.metadata ?? null,
    })
  } catch {
    /* never allow on audit failure */
  }
}
