/**
 * Access grants: household / professional / organization pet access.
 * Server validates actor; never trusts client permission booleans.
 */

import { rejectForgedActorClaim } from '../_shared/authorize.ts'
import { recordAuditEvent } from '../_shared/db.ts'
import {
  corsHeaders,
  errorResponse,
  getServiceClient,
  jsonResponse,
  readJsonBody,
  requireActorAccountId,
} from '../_shared/http.ts'

type Body = {
  op: 'grantHousehold' | 'revokeHousehold' | 'grantProfessional' | 'revokeProfessional' | 'grantOrgPet' | 'revokeOrgPet'
  claimedActorAccountId?: string
  petId: string
  accountId?: string
  professionalId?: string
  organizationId?: string
  role?: string
  permissions?: string[]
  expiresAt?: string
  visibilityMode?: string
  assignedAccountIds?: string[]
  eligibleRoles?: string[]
  correlationId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const actor = await requireActorAccountId(req)
  if (!actor.ok) return actor.response

  const body = await readJsonBody<Body>(req)
  if (!body?.op || !body.petId) return errorResponse('invalid', 'op and petId required')

  const forged = rejectForgedActorClaim(actor.accountId, body.claimedActorAccountId)
  if (forged) return errorResponse(forged.code, forged.reason, 403)

  let db
  try {
    db = getServiceClient()
  } catch {
    return errorResponse('not_configured', 'PRODUCTION CONNECTION NOT CONFIGURED', 503)
  }

  const { data: pet } = await db
    .from('pets')
    .select('id, owner_account_id')
    .eq('id', body.petId)
    .maybeSingle()
  if (!pet) return errorResponse('not_found', 'Pet not found', 404)
  if (pet.owner_account_id !== actor.accountId) {
    await recordAuditEvent(db, {
      actorAccountId: actor.accountId,
      resourceType: 'pet',
      resourceId: body.petId,
      action: 'organization.pet.access',
      result: 'deny',
      denyCode: 'not_owner',
      correlationId: body.correlationId,
    })
    return errorResponse('not_owner', 'Only pet owner may manage grants', 403)
  }

  const now = new Date().toISOString()

  try {
    switch (body.op) {
      case 'grantHousehold': {
        if (!body.accountId || !body.role || !body.permissions) {
          return errorResponse('invalid', 'accountId, role, permissions required')
        }
        const { data, error } = await db
          .from('pet_household_access')
          .upsert(
            {
              pet_id: body.petId,
              account_id: body.accountId,
              role: body.role,
              permissions: body.permissions,
              status: 'active',
              granted_by_account_id: actor.accountId,
              granted_at: now,
              expires_at: body.expiresAt ?? null,
              revoked_at: null,
              updated_at: now,
            },
            { onConflict: 'pet_id,account_id' },
          )
          .select('*')
          .single()
        if (error) return errorResponse('db_error', error.message, 500)
        return jsonResponse({ ok: true, grant: data })
      }
      case 'revokeHousehold': {
        if (!body.accountId) return errorResponse('invalid', 'accountId required')
        const { data, error } = await db
          .from('pet_household_access')
          .update({ status: 'revoked', revoked_at: now, updated_at: now })
          .eq('pet_id', body.petId)
          .eq('account_id', body.accountId)
          .select('*')
          .single()
        if (error) return errorResponse('db_error', error.message, 500)
        return jsonResponse({ ok: true, grant: data })
      }
      case 'grantProfessional': {
        if (!body.professionalId || !body.permissions) {
          return errorResponse('invalid', 'professionalId and permissions required')
        }
        if (
          body.permissions.includes('emergencyWrite') &&
          !body.expiresAt
        ) {
          return errorResponse('invalid', 'emergencyWrite requires expiresAt', 400)
        }
        const { data, error } = await db
          .from('pet_professional_access')
          .upsert(
            {
              pet_id: body.petId,
              professional_id: body.professionalId,
              permissions: body.permissions,
              status: 'active',
              granted_by_account_id: actor.accountId,
              granted_at: now,
              expires_at: body.expiresAt ?? null,
              revoked_at: null,
              updated_at: now,
            },
            { onConflict: 'pet_id,professional_id' },
          )
          .select('*')
          .single()
        if (error) return errorResponse('db_error', error.message, 500)
        return jsonResponse({ ok: true, grant: data })
      }
      case 'revokeProfessional': {
        if (!body.professionalId) return errorResponse('invalid', 'professionalId required')
        const { data, error } = await db
          .from('pet_professional_access')
          .update({ status: 'revoked', revoked_at: now, updated_at: now })
          .eq('pet_id', body.petId)
          .eq('professional_id', body.professionalId)
          .select('*')
          .single()
        if (error) return errorResponse('db_error', error.message, 500)
        return jsonResponse({ ok: true, grant: data })
      }
      case 'grantOrgPet': {
        if (!body.organizationId || !body.permissions) {
          return errorResponse('invalid', 'organizationId and permissions required')
        }
        const { data, error } = await db
          .from('organization_pet_access')
          .upsert(
            {
              pet_id: body.petId,
              organization_id: body.organizationId,
              permissions: body.permissions,
              status: 'active',
              visibility_mode: body.visibilityMode ?? 'assigned_only',
              assigned_account_ids: body.assignedAccountIds ?? [],
              eligible_roles: body.eligibleRoles ?? null,
              granted_by_account_id: actor.accountId,
              granted_at: now,
              expires_at: body.expiresAt ?? null,
              revoked_at: null,
              updated_at: now,
            },
            { onConflict: 'pet_id,organization_id' },
          )
          .select('*')
          .single()
        if (error) return errorResponse('db_error', error.message, 500)
        return jsonResponse({ ok: true, grant: data })
      }
      case 'revokeOrgPet': {
        if (!body.organizationId) return errorResponse('invalid', 'organizationId required')
        const { data, error } = await db
          .from('organization_pet_access')
          .update({ status: 'revoked', revoked_at: now, updated_at: now })
          .eq('pet_id', body.petId)
          .eq('organization_id', body.organizationId)
          .select('*')
          .single()
        if (error) return errorResponse('db_error', error.message, 500)
        return jsonResponse({ ok: true, grant: data })
      }
      default:
        return errorResponse('invalid', 'Unknown op')
    }
  } catch (err) {
    return errorResponse('access_error', err instanceof Error ? err.message : 'error', 500)
  }
})
