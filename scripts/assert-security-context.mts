/**
 * K47 — SecurityContext + central authorize() asserts.
 * Run: npx tsx scripts/assert-security-context.mts
 *
 * A–T scenarios from K47 plan.
 */
import assert from 'node:assert/strict'
import {
  authorize,
  createDemoSecurityContext,
  createDemoPublicSecurityContext,
  createSecurityContext,
  createSystemActorContext,
  projectAfterAuthorize,
  projectAuthorizedPublicPet,
  setAuthorizationAuditObserver,
  switchToOrganizationMode,
  withOrganizationContext,
  withProfessionalContext,
  type AuthorizationAuditPayload,
  type SecurityContext,
} from '../src/lib/security/index.ts'
import {
  grantHouseholdAccess,
  loadPetHouseholdAccess,
  savePetHouseholdAccess,
  suggestedHouseholdPermissionsForRole,
} from '../src/lib/household/index.ts'
import {
  grantPetAccess,
  loadPetProfessionalAccess,
  revokeAccess,
  savePetProfessionalAccess,
  saveProfessionalProfiles,
} from '../src/lib/professional/index.ts'
import {
  acceptOrganizationInvitation,
  createOrganization,
  grantOrganizationPetAccess,
  inviteOrganizationMember,
  loadOrganizationMemberships,
  loadOrganizationPetAccess,
  revokeOrganizationPetAccess,
  saveOrganizationPetAccess,
} from '../src/lib/organization/index.ts'
import {
  loginSelfSession,
  logoutSelfSession,
  saveSelfAccount,
  SESSION_ACTIVE_KEY,
} from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import type { Pet, Conversation } from '../src/types/index.ts'
import type { Account, ProfessionalProfile } from '../src/types/professional.ts'
import type { Booking } from '../src/lib/booking/types.ts'
import type { Payment } from '../src/lib/payments/types.ts'

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
    writable: true,
  })
  return memory
}

installMemoryStorage()

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

function account(
  id: string,
  displayName: string,
  roles: Account['roles'] = ['owner'],
): Account {
  return {
    id,
    kind: roles.includes('owner') && roles.length === 1 ? 'consumer' : 'professional',
    roles,
    displayName,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makePet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'pet_bella',
    name: 'Bella',
    type: 'dog',
    breed: 'Labrador',
    ownerAccountId: SELF_OWNER_ID,
    microchip: '999999999999999',
    ...overrides,
  } as Pet
}

function ctxForAccount(
  accountId: string,
  extras: Partial<SecurityContext> = {},
): SecurityContext {
  return createSecurityContext({
    authentication: {
      kind: 'session',
      sessionId: `demo_${accountId}`,
      authenticatedAt: '2026-01-01T00:00:00.000Z',
    },
    actor: { kind: 'account', accountId },
    authority: 'demo',
    activeMode: 'personal',
    ...extras,
  })
}

const owner = account(SELF_OWNER_ID, 'Tereza')
const coOwner = account('acct_coowner', 'Petr')
const caregiver = account('acct_caregiver', 'Anna')
const viewer = account('acct_viewer', 'Bara')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const stranger = account('acct_stranger', 'Stranger')

const vetProfile: ProfessionalProfile = {
  id: 'pro_vet_a',
  accountId: vetAccount.id,
  displayName: 'Dr. Vet',
  type: 'veterinarian',
  publicVisibility: 'public',
  verificationStatus: 'unverified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

saveAccounts([owner, coOwner, caregiver, viewer, vetAccount, stranger])
saveSelfAccount(owner)
saveProfessionalProfiles([vetProfile])
loginSelfSession()

const bella = makePet()
const pets = [bella]
const store = { pets }

{
  const { accessList } = grantHouseholdAccess([], [], {
    pet: bella,
    accountId: coOwner.id,
    role: 'co_owner',
    permissions: suggestedHouseholdPermissionsForRole('co_owner'),
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, coOwner, caregiver, viewer],
    status: 'active',
  })
  const g2 = grantHouseholdAccess(accessList, [], {
    pet: bella,
    accountId: caregiver.id,
    role: 'caregiver',
    permissions: suggestedHouseholdPermissionsForRole('caregiver'),
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, coOwner, caregiver, viewer],
    status: 'active',
  })
  const g3 = grantHouseholdAccess(g2.accessList, [], {
    pet: bella,
    accountId: viewer.id,
    role: 'viewer',
    permissions: suggestedHouseholdPermissionsForRole('viewer'),
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, coOwner, caregiver, viewer],
    status: 'active',
  })
  savePetHouseholdAccess(g3.accessList)
}

console.log('\nK47 SecurityContext + authorize()\n')

check('A. authenticated owner → ALLOW health.read', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  assert.equal(demo.context.authority, 'demo')
  const d = authorize(
    demo.context,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, true)
  if (d.allowed) assert.equal(d.reason, 'owner')
})

check('B. unauthenticated → DENY', () => {
  logoutSelfSession()
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, false)
  const d = authorize(
    demo.context,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.code, 'unauthenticated')
  loginSelfSession()
})

check('C. forged actorAccountId → DENY', () => {
  const demo = createDemoSecurityContext({ claimedActorAccountId: 'acct_hacker' })
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  assert.equal(demo.context.actor.accountId, SELF_OWNER_ID)
  const d = authorize(
    demo.context,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedActorAccountId: 'acct_hacker',
    },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.denyClass, 'forged_identity')
})

check('D. co-owner health.read → ALLOW', () => {
  const d = authorize(
    ctxForAccount(coOwner.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, true)
  if (d.allowed) assert.equal(d.path, 'household')
})

check('E. caregiver without health.write → DENY health.write', () => {
  const d = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.write', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.code, 'unauthorized')
})

check('E2. caregiver health.read → ALLOW (explicit stored)', () => {
  const d = authorize(
    ctxForAccount(caregiver.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, true)
})

check('E3. viewer health.read → DENY', () => {
  const d = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('F. professional without PetProfessionalAccess → DENY', () => {
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    ctx,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.denyClass, 'missing_grant')
})

check('G. professional with access + permission → ALLOW', () => {
  const { accessList } = grantPetAccess([], [], {
    petId: bella.id,
    professionalId: vetProfile.id,
    permissions: ['viewHealth', 'addHealthRecord'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
  })
  savePetProfessionalAccess(accessList)
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    ctx,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, true)
  if (d.allowed) assert.equal(d.path, 'professional')
})

const clinicOwnerId = SELF_OWNER_ID
const vetA = account('acct_vet_a', 'Vet A', ['veterinarian'])
const vetB = account('acct_vet_b', 'Vet B', ['veterinarian'])
const receptionist = account('acct_reception', 'Reception', ['pet_service'])
saveAccounts([
  owner,
  coOwner,
  caregiver,
  viewer,
  vetAccount,
  stranger,
  vetA,
  vetB,
  receptionist,
])

const { organization: clinicX } = createOrganization({
  actorAccountId: clinicOwnerId,
  displayName: 'Clinic X',
  organizationType: 'veterinary_clinic',
})
const { organization: clinicY } = createOrganization({
  actorAccountId: clinicOwnerId,
  displayName: 'Clinic Y',
  organizationType: 'veterinary_clinic',
})

for (const [invitee, role] of [
  [vetA.id, 'professional'],
  [vetB.id, 'professional'],
  [receptionist.id, 'staff'],
] as const) {
  const inv = inviteOrganizationMember({
    organizationId: clinicX.id,
    actorAccountId: clinicOwnerId,
    inviteeAccountId: invitee,
    role,
  })
  acceptOrganizationInvitation(inv.id, invitee)
}

{
  const inv = inviteOrganizationMember({
    organizationId: clinicY.id,
    actorAccountId: clinicOwnerId,
    inviteeAccountId: vetA.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(inv.id, vetA.id)
}

check('H. organization member without OrganizationPetAccess → DENY', () => {
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicX.id,
  )!
  const ctx = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: m.id,
    role: m.role,
  })
  const d = authorize(
    ctx,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.denyClass, 'missing_grant')
})

check('I. organization member + Pet grant → ALLOW per permission', () => {
  const { accessList } = grantOrganizationPetAccess([], {
    pet: bella,
    organizationId: clinicX.id,
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(accessList)

  const memberships = loadOrganizationMemberships()
  const mA = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicX.id,
  )!
  const ctxA = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: mA.id,
    role: mA.role,
  })
  const allow = authorize(
    ctxA,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(allow.allowed, true)

  const mR = memberships.find(
    (x) => x.accountId === receptionist.id && x.organizationId === clinicX.id,
  )!
  const ctxR = withOrganizationContext(ctxForAccount(receptionist.id), {
    organizationId: clinicX.id,
    membershipId: mR.id,
    role: mR.role,
  })
  const denyR = authorize(
    ctxR,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(denyR.allowed, false)
})

check('J. cross-organization tampering → DENY', () => {
  const memberships = loadOrganizationMemberships()
  const mY = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicY.id,
  )!
  const ctxY = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicY.id,
    membershipId: mY.id,
    role: mY.role,
  })
  const d = authorize(
    ctxY,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicY.id,
    },
    { store },
  )
  assert.equal(d.allowed, false)

  const d2 = authorize(
    ctxY,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(d2.allowed, false)
  if (!d2.allowed) assert.equal(d2.denyClass, 'cross_organization')
})

check('K. revoked OrganizationPetAccess → DENY', () => {
  const list = loadOrganizationPetAccess()
  const grant = list.find((a) => a.organizationId === clinicX.id && a.petId === bella.id)!
  const { accessList } = revokeOrganizationPetAccess(list, grant.id, bella, SELF_OWNER_ID)
  saveOrganizationPetAccess(accessList)

  const memberships = loadOrganizationMemberships()
  const mA = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicX.id,
  )!
  const ctxA = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: mA.id,
    role: mA.role,
  })
  const d = authorize(
    ctxA,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.ok(d.denyClass === 'revoked' || d.denyClass === 'missing_grant')

  const restored = grantOrganizationPetAccess([], {
    pet: bella,
    organizationId: clinicX.id,
    permissions: ['viewHealth'],
    grantedByAccountId: SELF_OWNER_ID,
    status: 'active',
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })
  saveOrganizationPetAccess(restored.accessList)
})

check('L. expired access → DENY', () => {
  const past = '2020-01-01T00:00:00.000Z'
  let list = loadPetProfessionalAccess()
  const existing = list.find(
    (a) => a.professionalId === vetProfile.id && a.petId === bella.id && a.status === 'active',
  )
  if (existing) {
    list = list.map((a) =>
      a.id === existing.id ? { ...a, expiresAt: past } : a,
    )
    savePetProfessionalAccess(list)
  } else {
    const { accessList } = grantPetAccess(list, [], {
      petId: bella.id,
      professionalId: vetProfile.id,
      permissions: ['viewHealth'],
      grantedByAccountId: SELF_OWNER_ID,
      status: 'active',
      expiresAt: past,
      id: 'ppa_expired',
    })
    savePetProfessionalAccess(accessList)
  }
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    ctx,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store, now: Date.parse('2026-06-01T00:00:00.000Z') },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.ok(d.denyClass === 'expired' || d.denyClass === 'missing_grant')
})

check('M. unknown permission/action → DENY', () => {
  const d = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'totally.unknown.action', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.denyClass, 'unknown_action')
})

check('N. public projection has no sensitive data', () => {
  const publicPet = {
    ...bella,
    publicDiscover: true,
    image: 'https://example.com/bella.jpg',
    ownerContacts: { phone: '+420111222333', email: 'secret@example.com' },
  } as Pet
  const pubCtx = createDemoPublicSecurityContext()
  const d = authorize(
    pubCtx,
    { action: 'public.pet.project', resource: { type: 'public_pet', id: publicPet.id } },
    { store: { pets: [publicPet] } },
  )
  assert.equal(d.allowed, true)
  const view = projectAuthorizedPublicPet(publicPet) as Record<string, unknown> | null
  // Even if privacy settings block projection (null), authorize stayed separate from data.
  if (view) {
    const raw = JSON.stringify(view)
    assert.equal(raw.includes('999999999999999'), false)
    assert.equal(raw.includes('+420111222333'), false)
    assert.equal(raw.includes('secret@example.com'), false)
    assert.equal('microchip' in view, false)
    assert.equal('ownerContacts' in view, false)
    assert.equal('healthRecords' in view, false)
  }
  // Deny-by-default: public action never returns raw pet via authorize decision
  assert.equal(d.allowed, true)
  if (d.allowed) assert.equal(d.path, 'public')
})

check('O. payment access ≠ health access', () => {
  const booking: Booking = {
    id: 'bk_1',
    ownerAccountId: SELF_OWNER_ID,
    professionalId: vetProfile.id,
    serviceId: 'svc_1',
    petId: bella.id,
    startAt: '2026-06-01T10:00:00.000Z',
    endAt: '2026-06-01T11:00:00.000Z',
    status: 'confirmed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const payment: Payment = {
    id: 'pay_1',
    bookingId: booking.id,
    ownerAccountId: SELF_OWNER_ID,
    professionalId: vetProfile.id,
    amountMinor: 10000,
    currency: 'CZK',
    paymentType: 'full',
    status: 'pending',
    purpose: 'BOOKING_PAYMENT',
    isDemoPayment: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const payStore = {
    pets,
    getBooking: (id: string) => (id === booking.id ? booking : null),
    getPayment: (id: string) => (id === payment.id ? payment : null),
  }
  const payOk = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'payment.read', resource: { type: 'payment', id: payment.id } },
    { store: payStore },
  )
  assert.equal(payOk.allowed, true)

  const healthDeny = authorize(
    ctxForAccount(stranger.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store: payStore },
  )
  assert.equal(healthDeny.allowed, false)

  const iso = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'health.read', resource: { type: 'payment', id: payment.id } },
    { store: payStore },
  )
  assert.equal(iso.allowed, false)
  if (!iso.allowed) assert.equal(iso.denyClass, 'isolation')
})

check('P. booking access ≠ health access', () => {
  const booking: Booking = {
    id: 'bk_2',
    ownerAccountId: SELF_OWNER_ID,
    professionalId: vetProfile.id,
    serviceId: 'svc_1',
    petId: bella.id,
    startAt: '2026-06-01T10:00:00.000Z',
    endAt: '2026-06-01T11:00:00.000Z',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
  const bkStore = {
    pets,
    getBooking: (id: string) => (id === booking.id ? booking : null),
  }
  const bookOk = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'booking.read', resource: { type: 'booking', id: booking.id } },
    { store: bkStore },
  )
  assert.equal(bookOk.allowed, true)

  const iso = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'health.read', resource: { type: 'booking', id: booking.id } },
    { store: bkStore },
  )
  assert.equal(iso.allowed, false)
  if (!iso.allowed) assert.equal(iso.denyClass, 'isolation')
})

check('Q. organization membership ≠ pet access', () => {
  const memberships = loadOrganizationMemberships()
  const mR = memberships.find(
    (x) => x.accountId === receptionist.id && x.organizationId === clinicX.id,
  )!
  const opsR = authorize(
    ctxForAccount(receptionist.id),
    { action: 'organization.ops', resource: { type: 'organization', id: clinicX.id } },
    { store },
  )
  assert.equal(opsR.allowed, true)

  const ctxR = withOrganizationContext(ctxForAccount(receptionist.id), {
    organizationId: clinicX.id,
    membershipId: mR.id,
    role: mR.role,
  })
  const petDeny = authorize(
    ctxR,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(petDeny.allowed, false)

  const iso = authorize(
    ctxForAccount(receptionist.id),
    { action: 'organization.ops', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(iso.allowed, false)
  if (!iso.allowed) assert.equal(iso.denyClass, 'isolation')
})

check('R. actor identity cannot be taken from payload', () => {
  const fake = createSecurityContext({
    authentication: { kind: 'session', sessionId: 'x' },
    actor: { kind: 'account', accountId: stranger.id },
    authority: 'demo',
  })
  const demo = createDemoSecurityContext({ claimedActorAccountId: stranger.id })
  assert.equal(demo.ok, true)
  if (demo.ok) {
    assert.equal(demo.context.actor.accountId, SELF_OWNER_ID)
    assert.notEqual(demo.context.actor.accountId, stranger.id)
  }
  const d = authorize(
    fake,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedActorAccountId: SELF_OWNER_ID,
    },
    { store },
  )
  assert.equal(d.allowed, false)
  if (!d.allowed) assert.equal(d.denyClass, 'forged_identity')
})

check('S. multi-organization context isolation', () => {
  const switched = switchToOrganizationMode(ctxForAccount(vetA.id), clinicY.id)
  assert.equal(switched.ok, true)
  if (!switched.ok) return
  assert.equal(switched.context.organization?.organizationId, clinicY.id)
  const d = authorize(
    switched.context,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicY.id,
    },
    { store },
  )
  assert.equal(d.allowed, false)

  const switchedX = switchToOrganizationMode(ctxForAccount(vetA.id), clinicX.id)
  assert.equal(switchedX.ok, true)
  if (!switchedX.ok) return
  const dX = authorize(
    switchedX.context,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(dX.allowed, true)
})

check('T. projection is not authorization bypass', () => {
  const deny = authorize(
    ctxForAccount(viewer.id),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(deny.allowed, false)
  const projected = projectAfterAuthorize(deny, bella, {
    path: 'household',
    actorAccountId: viewer.id,
    householdAccess: loadPetHouseholdAccess().find(
      (a) => a.accountId === viewer.id && a.petId === bella.id,
    ),
  })
  assert.equal(projected, null)

  const micro = authorize(
    ctxForAccount(coOwner.id),
    { action: 'microchip.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(micro.allowed, false)

  const pii = authorize(
    ctxForAccount(coOwner.id),
    { action: 'ownerContacts.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(pii.allowed, false)
})

check('messaging: non-participant DENY; org membership does not open chat', () => {
  const conversation = {
    id: 'conv_1',
    name: 'Vet chat',
    avatar: '',
    petContext: bella.id,
    contactType: 'professional',
    lastMessage: '',
    time: '',
    unread: 0,
    messages: [],
    participantAccountIds: [SELF_OWNER_ID, vetAccount.id],
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as Conversation
  const msgStore = {
    pets,
    getConversation: (id: string) => (id === conversation.id ? conversation : null),
  }
  const ok = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'messaging.read', resource: { type: 'conversation', id: conversation.id } },
    { store: msgStore },
  )
  assert.equal(ok.allowed, true)
  const deny = authorize(
    ctxForAccount(receptionist.id),
    { action: 'messaging.read', resource: { type: 'conversation', id: conversation.id } },
    { store: msgStore },
  )
  assert.equal(deny.allowed, false)
})

check('system actor cannot be forged via DEMO; typed system denied for health', () => {
  const sys = createSystemActorContext({ systemJob: 'expire_grants' })
  assert.equal(sys.actor.kind, 'system')
  const d = authorize(
    sys,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

check('audit extension point receives decisions (no storage)', () => {
  const seen: AuthorizationAuditPayload[] = []
  setAuthorizationAuditObserver((p) => seen.push(p))
  authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.ok(seen.length >= 1)
  assert.equal(seen[0]!.authorizationResult, 'allow')
  assert.equal(seen[0]!.actorAccountId, SELF_OWNER_ID)
  setAuthorizationAuditObserver(null)
})

check('DEMO authority flag is never production', () => {
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (demo.ok) assert.equal(demo.context.authority, 'demo')
  assert.notEqual(localStorage.getItem(SESSION_ACTIVE_KEY), null)
})

check('revoked professional access → DENY', () => {
  let list = loadPetProfessionalAccess()
  const active = list.find(
    (a) => a.professionalId === vetProfile.id && a.petId === bella.id && a.status === 'active',
  )
  if (active) {
    const rev = revokeAccess(list, [], active.id)
    savePetProfessionalAccess(rev.accessList)
  }
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const d = authorize(
    ctx,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(d.allowed, false)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
