/**
 * Assert Organization + OrganizationMembership (K42).
 * Run: npx tsx scripts/assert-organization-membership.mts
 */
import assert from 'node:assert/strict'
import {
  ORGANIZATION_TYPES,
  OrganizationPermissionError,
  acceptOrganizationInvitation,
  assertCanManageOrganizationMembers,
  assertOrganizationMember,
  assertOrganizationProjectionSafe,
  createOrganization,
  findOpenMembership,
  hasOrganizationPermission,
  inviteOrganizationMember,
  isOrganizationMembershipEffective,
  listActiveOwners,
  listMembershipsForAccount,
  listOrganizationsForAccount,
  loadOrganizationMemberships,
  loadOrganizations,
  normalizeOrganization,
  permissionsForOrganizationRole,
  rejectOrganizationInvitation,
  removeOrganizationMember,
  suspendOrganizationMember,
  toPublicOrganization,
  transferOrganizationOwnership,
  updateOrganizationMemberRole,
} from '../src/lib/organization/index.ts'
import {
  buildOrganizationMembershipNotification,
  isSafeOrganizationMembershipNotificationPayload,
} from '../src/lib/notifications/fromOrganizationMembership.ts'
import { loadPetProfessionalAccess } from '../src/lib/professional/index.ts'
import { loadPetHouseholdAccess } from '../src/lib/household/index.ts'
import { loadPayments } from '../src/lib/payments/storage.ts'
import { loadSubscription } from '../src/lib/entitlements/storage.ts'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  })
  return memory
}

const memory = installMemoryStorage()

let passed = 0
let failed = 0

function check(label: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK  ${label}`)
    passed += 1
  } catch (err) {
    failed += 1
    console.error(`  FAIL  ${label}`)
    console.error(err)
  }
}

const ownerA = 'acct_owner_a'
const memberB = 'acct_member_b'
const outsider = 'acct_outsider'

memory.clear()

let orgXId = ''
let orgYId = ''
let memberBMembershipX = ''

check('1. organization creation', () => {
  const { organization, membership } = createOrganization({
    actorAccountId: ownerA,
    displayName: 'Klinika Alfa',
    organizationType: 'veterinary_clinic',
  })
  orgXId = organization.id
  assert.ok(organization.id.startsWith('org_'))
  assert.equal(organization.displayName, 'Klinika Alfa')
  assert.equal(organization.status, 'active')
  assert.equal(membership.role, 'owner')
  assert.equal(membership.status, 'active')
})

check('2. default private visibility', () => {
  const org = loadOrganizations().find((o) => o.id === orgXId)!
  assert.equal(org.publicVisibility, 'private')
  assert.equal(toPublicOrganization(org), null)
})

check('3. valid organization types', () => {
  for (const t of ORGANIZATION_TYPES) {
    const { organization } = createOrganization({
      actorAccountId: `acct_type_${t}`,
      displayName: `Org ${t}`,
      organizationType: t,
    })
    assert.equal(organization.organizationType, t)
    assert.equal(organization.type, t)
    assert.equal(organization.name, organization.displayName)
  }
})

check('4. owner membership', () => {
  const memberships = listMembershipsForAccount(loadOrganizationMemberships(), ownerA).filter(
    (m) => m.organizationId === orgXId,
  )
  assert.equal(memberships[0]?.role, 'owner')
  assert.equal(memberships[0]?.status, 'active')
  assert.ok(listOrganizationsForAccount(ownerA).some((o) => o.id === orgXId))
})

check('5. owner invariant — multi-owner + last-owner protection', () => {
  const invite = inviteOrganizationMember({
    organizationId: orgXId,
    actorAccountId: ownerA,
    inviteeAccountId: 'acct_co_owner',
    role: 'owner',
  })
  acceptOrganizationInvitation(invite.id, 'acct_co_owner')
  assert.equal(listActiveOwners(loadOrganizationMemberships(), orgXId).length, 2)

  const ownerMembership = listMembershipsForAccount(loadOrganizationMemberships(), ownerA).find(
    (m) => m.organizationId === orgXId && m.status === 'active',
  )!
  updateOrganizationMemberRole(orgXId, ownerA, ownerMembership.id, 'admin')
  assert.equal(listActiveOwners(loadOrganizationMemberships(), orgXId).length, 1)

  const lastOwner = listActiveOwners(loadOrganizationMemberships(), orgXId)[0]!
  assert.throws(
    () => removeOrganizationMember(orgXId, 'acct_co_owner', lastOwner.id),
    OrganizationPermissionError,
  )
  assert.throws(
    () => suspendOrganizationMember(orgXId, 'acct_co_owner', lastOwner.id),
    OrganizationPermissionError,
  )

  const adminRow = listMembershipsForAccount(loadOrganizationMemberships(), ownerA).find(
    (m) => m.organizationId === orgXId && m.status === 'active',
  )!
  updateOrganizationMemberRole(orgXId, 'acct_co_owner', adminRow.id, 'owner')
})

check('6. invite', () => {
  const invite = inviteOrganizationMember({
    organizationId: orgXId,
    actorAccountId: ownerA,
    inviteeAccountId: memberB,
    role: 'professional',
  })
  assert.equal(invite.status, 'invited')
})

check('7. accept', () => {
  const invite = findOpenMembership(loadOrganizationMemberships(), orgXId, memberB)!
  const accepted = acceptOrganizationInvitation(invite.id, memberB)
  assert.equal(accepted.status, 'active')
  assert.ok(accepted.joinedAt)
  memberBMembershipX = accepted.id
})

check('8. reject', () => {
  const invite2 = inviteOrganizationMember({
    organizationId: orgXId,
    actorAccountId: ownerA,
    inviteeAccountId: 'acct_reject',
    role: 'viewer',
  })
  const rejected = rejectOrganizationInvitation(invite2.id, 'acct_reject')
  assert.equal(rejected.status, 'removed')
  assert.ok(rejected.leftAt)
})

check('9. duplicate membership guard', () => {
  assert.throws(
    () =>
      inviteOrganizationMember({
        organizationId: orgXId,
        actorAccountId: ownerA,
        inviteeAccountId: memberB,
        role: 'staff',
      }),
    OrganizationPermissionError,
  )
})

check('10. multiple organizations per account', () => {
  const { organization: orgY } = createOrganization({
    actorAccountId: ownerA,
    displayName: 'Shelter Y',
    organizationType: 'shelter',
  })
  orgYId = orgY.id
  const invY = inviteOrganizationMember({
    organizationId: orgY.id,
    actorAccountId: ownerA,
    inviteeAccountId: memberB,
    role: 'viewer',
  })
  acceptOrganizationInvitation(invY.id, memberB)
  assert.equal(listOrganizationsForAccount(memberB).length, 2)
})

check('11. different roles per organization', () => {
  const mx = listMembershipsForAccount(loadOrganizationMemberships(), memberB).find(
    (m) => m.organizationId === orgXId && m.status === 'active',
  )!
  const my = listMembershipsForAccount(loadOrganizationMemberships(), memberB).find(
    (m) => m.organizationId === orgYId && m.status === 'active',
  )!
  assert.equal(mx.role, 'professional')
  assert.equal(my.role, 'viewer')
})

check('12. role change', () => {
  const updated = updateOrganizationMemberRole(orgXId, ownerA, memberBMembershipX, 'staff')
  assert.equal(updated.role, 'staff')
})

check('13. suspend', () => {
  const suspended = suspendOrganizationMember(orgXId, ownerA, memberBMembershipX)
  assert.equal(suspended.status, 'suspended')
  assert.equal(isOrganizationMembershipEffective(suspended), false)
})

check('14. remove', () => {
  const inv = inviteOrganizationMember({
    organizationId: orgXId,
    actorAccountId: ownerA,
    inviteeAccountId: memberB,
    role: 'staff',
  })
  const active = acceptOrganizationInvitation(inv.id, memberB)
  memberBMembershipX = active.id
  const removed = removeOrganizationMember(orgXId, ownerA, active.id)
  assert.equal(removed.status, 'removed')
  assert.ok(removed.leftAt)
})

check('15. owner protection', () => {
  // Ensure only one active owner remains
  const owners = listActiveOwners(loadOrganizationMemberships(), orgXId)
  for (const o of owners.slice(1)) {
    updateOrganizationMemberRole(orgXId, owners[0]!.accountId, o.id, 'admin')
  }
  const last = listActiveOwners(loadOrganizationMemberships(), orgXId)
  assert.equal(last.length, 1)
  assert.throws(
    () => removeOrganizationMember(orgXId, last[0]!.accountId, last[0]!.id),
    OrganizationPermissionError,
  )
  assert.throws(
    () => suspendOrganizationMember(orgXId, last[0]!.accountId, last[0]!.id),
    OrganizationPermissionError,
  )
})

check('16. authorization boundary', () => {
  const org = loadOrganizations().find((o) => o.id === orgXId)!
  const memberships = loadOrganizationMemberships()
  assert.throws(
    () => assertOrganizationMember(memberships, orgXId, outsider),
    OrganizationPermissionError,
  )
  assert.throws(
    () => assertCanManageOrganizationMembers(memberships, org, memberB),
    OrganizationPermissionError,
  )

  const inv = inviteOrganizationMember({
    organizationId: orgXId,
    actorAccountId: ownerA,
    inviteeAccountId: 'acct_viewer',
    role: 'viewer',
  })
  acceptOrganizationInvitation(inv.id, 'acct_viewer')
  const viewerM = listMembershipsForAccount(loadOrganizationMemberships(), 'acct_viewer').find(
    (m) => m.organizationId === orgXId,
  )
  assert.equal(
    hasOrganizationPermission(viewerM, 'organization_members_manage', org),
    false,
  )
  assert.deepEqual(permissionsForOrganizationRole('viewer'), [])
  assert.deepEqual(permissionsForOrganizationRole('professional'), [])
  assert.deepEqual(permissionsForOrganizationRole('receptionist' as never), [])
  assert.ok(permissionsForOrganizationRole('admin').includes('organization_members_manage'))
})

check('17. cross-organization access denial', () => {
  const orgY = loadOrganizations().find((o) => o.id === orgYId)!
  const memberships = loadOrganizationMemberships()
  assert.throws(
    () => assertCanManageOrganizationMembers(memberships, orgY, 'acct_viewer'),
    OrganizationPermissionError,
  )
})

check('18. professional ≠ automatic Pet access', () => {
  assert.equal(loadPetProfessionalAccess().length, 0)
})

check('19. organization ≠ household access', () => {
  assert.equal(loadPetHouseholdAccess().length, 0)
})

check('20. organization ≠ payment/membership', () => {
  assert.equal(loadPayments().length, 0)
  // Calling billing load must not be required for org ops; org records stay payment-free
  void loadSubscription()
  for (const org of loadOrganizations()) {
    assert.ok(!('stripeAccountId' in org))
    assert.ok(!('paymentAccountId' in org))
    assert.ok(!('planId' in org))
  }
  for (const m of loadOrganizationMemberships()) {
    assert.ok(!('planId' in m))
    assert.ok(!('stripeCustomerId' in m))
  }
})

check('21. privacy projection', () => {
  const org = loadOrganizations().find((o) => o.id === orgXId)!
  assert.equal(toPublicOrganization(org), null)
  const publicish = { ...org, publicVisibility: 'public' as const }
  const pub = toPublicOrganization(publicish)
  assert.ok(pub)
  assertOrganizationProjectionSafe(pub!)
  assert.ok(!('memberAccountIds' in pub!))
  assert.ok(!('legalName' in pub!))

  const viewerM = listMembershipsForAccount(loadOrganizationMemberships(), 'acct_viewer').find(
    (m) => m.organizationId === orgXId,
  )!
  const draft = buildOrganizationMembershipNotification({
    event: 'invited',
    membership: viewerM,
    organization: org,
  })
  assert.ok(draft)
  assert.ok(isSafeOrganizationMembershipNotificationPayload(draft!))
})

check('legacy stub normalize', () => {
  const legacy = normalizeOrganization({
    id: 'org_legacy',
    name: 'Legacy Clinic',
    type: 'veterinary_clinic',
    memberAccountIds: ['acct_1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
  assert.ok(legacy)
  assert.equal(legacy!.displayName, 'Legacy Clinic')
  assert.equal(legacy!.organizationType, 'veterinary_clinic')
  assert.equal(legacy!.publicVisibility, 'private')
  assert.equal(legacy!.status, 'active')
})

check('transfer extension point', () => {
  assert.throws(
    () => transferOrganizationOwnership(orgXId, ownerA, memberB),
    /not implemented/,
  )
})

check('invalid role rejected', () => {
  assert.throws(
    () =>
      inviteOrganizationMember({
        organizationId: orgXId,
        actorAccountId: ownerA,
        inviteeAccountId: 'acct_mgr',
        role: 'manager' as never,
      }),
    OrganizationPermissionError,
  )
})

console.log(`\nPassed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
