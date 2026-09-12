import { prisma } from '../prisma.js'
import type {
  HouseholdGrant,
  OrgPetGrant,
  PetRow,
  ProfessionalGrant,
} from './petAuthorize.js'

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null
}

export async function loadPetAuthzBundle(
  petId: string,
  actorAccountId: string,
): Promise<{
  pet: PetRow | null
  householdGrants: HouseholdGrant[]
  professionalGrants: ProfessionalGrant[]
  orgPetGrants: OrgPetGrant[]
}> {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { id: true, ownerAccountId: true },
  })

  const hh = await prisma.petHouseholdAccess.findMany({
    where: { petId },
    select: {
      id: true,
      accountId: true,
      permissions: true,
      status: true,
      expiresAt: true,
      revokedAt: true,
    },
  })

  const pro = await prisma.petProfessionalAccess.findMany({
    where: { petId },
    include: { professional: { select: { accountId: true } } },
  })

  const opa = await prisma.organizationPetAccess.findMany({
    where: { petId, status: 'active' },
  })

  const orgPetGrants: OrgPetGrant[] = []
  for (const row of opa) {
    const membership = await prisma.organizationMembership.findUnique({
      where: {
        organizationId_accountId: {
          organizationId: row.organizationId,
          accountId: actorAccountId,
        },
      },
      select: { id: true, role: true, status: true },
    })

    const assigned = row.assignedAccountIds ?? []
    const eligible = row.eligibleRoles?.length ? row.eligibleRoles : ['professional']
    const visibilityOk =
      (row.visibilityMode === 'assigned_only' && assigned.includes(actorAccountId)) ||
      (row.visibilityMode === 'role_eligible' &&
        membership?.status === 'active' &&
        eligible.includes(membership.role))

    if (!visibilityOk) continue

    orgPetGrants.push({
      id: row.id,
      organization_id: row.organizationId,
      permissions: row.permissions,
      status: row.status,
      visibility_mode: row.visibilityMode,
      eligible_roles: row.eligibleRoles,
      assigned_account_ids: row.assignedAccountIds,
      expires_at: iso(row.expiresAt),
      revoked_at: iso(row.revokedAt),
      membership_role: membership?.role ?? null,
      membership_status: membership?.status ?? null,
      membership_id: membership?.id ?? null,
    })
  }

  return {
    pet: pet
      ? { id: pet.id, owner_account_id: pet.ownerAccountId }
      : null,
    householdGrants: hh.map((g) => ({
      id: g.id,
      account_id: g.accountId,
      permissions: g.permissions,
      status: g.status,
      expires_at: iso(g.expiresAt),
      revoked_at: iso(g.revokedAt),
    })),
    professionalGrants: pro.map((g) => ({
      id: g.id,
      professional_id: g.professionalId,
      professional_account_id: g.professional.accountId,
      permissions: g.permissions,
      status: g.status,
      expires_at: iso(g.expiresAt),
      revoked_at: iso(g.revokedAt),
    })),
    orgPetGrants,
  }
}
