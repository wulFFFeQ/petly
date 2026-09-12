/**
 * K48 — Security audit trail runtime asserts (A–W).
 * Run: npx tsx scripts/assert-security-audit.mts
 */
import assert from 'node:assert/strict'
import {
  authorize,
  configureAuthorizationAudit,
  createDemoAuditSink,
  createDemoSecurityContext,
  createSecurityContext,
  createAnonymousPublicContext,
  mapAuthorizationPayloadToAuditEvent,
  scrubAuditMetadata,
  queryDemoAuditEvents,
  assertOrganizationAuditIsolation,
  planRetention,
  DEFAULT_AUTHORIZATION_RETENTION,
  createServerAuditSinkStub,
  withOrganizationContext,
  withProfessionalContext,
  type AuditEvent,
  type AuthorizationAuditPayload,
  type SecurityContext,
} from '../src/lib/security/index.ts'
import {
  grantHouseholdAccess,
  savePetHouseholdAccess,
  suggestedHouseholdPermissionsForRole,
} from '../src/lib/household/index.ts'
import {
  grantPetAccess,
  loadPetProfessionalAccess,
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
  saveSelfAccount,
} from '../src/lib/account/session.ts'
import { SELF_OWNER_ID } from '../src/lib/discover/owner.ts'
import { saveAccounts } from '../src/lib/professional/storage.ts'
import type { Pet } from '../src/types/index.ts'
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
    correlationId: extras.correlationId ?? `corr_${accountId}`,
    ...extras,
  })
}

const owner = account(SELF_OWNER_ID, 'Tereza')
const caregiver = account('acct_caregiver', 'Anna')
const vetAccount = account('acct_vet', 'Dr. Vet', ['veterinarian'])
const vetA = account('acct_vet_a', 'Vet A', ['veterinarian'])
const receptionist = account('acct_reception', 'Reception', ['pet_service'])

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

saveAccounts([owner, caregiver, vetAccount, vetA, receptionist])
saveSelfAccount(owner)
saveProfessionalProfiles([vetProfile])
loginSelfSession()

const bella = makePet()
const store = { pets: [bella] }

{
  const { accessList } = grantHouseholdAccess([], [], {
    pet: bella,
    accountId: caregiver.id,
    role: 'caregiver',
    permissions: suggestedHouseholdPermissionsForRole('caregiver'),
    grantedByAccountId: SELF_OWNER_ID,
    accounts: [owner, caregiver],
    status: 'active',
  })
  savePetHouseholdAccess(accessList)
}

const { organization: clinicX } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic X',
  organizationType: 'veterinary_clinic',
})
const { organization: clinicY } = createOrganization({
  actorAccountId: SELF_OWNER_ID,
  displayName: 'Clinic Y',
  organizationType: 'veterinary_clinic',
})

for (const [invitee, role] of [
  [vetA.id, 'professional'],
  [receptionist.id, 'staff'],
] as const) {
  const inv = inviteOrganizationMember({
    organizationId: clinicX.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: invitee,
    role,
  })
  acceptOrganizationInvitation(inv.id, invitee)
}
{
  const inv = inviteOrganizationMember({
    organizationId: clinicY.id,
    actorAccountId: SELF_OWNER_ID,
    inviteeAccountId: vetA.id,
    role: 'professional',
  })
  acceptOrganizationInvitation(inv.id, vetA.id)
}

const sink = createDemoAuditSink()
configureAuthorizationAudit(sink)

function lastEvent(): AuditEvent {
  const all = sink.listAll()
  assert.ok(all.length > 0, 'expected at least one audit event')
  return all[all.length - 1]!
}

function authorizeAndCapture(
  ctx: SecurityContext,
  request: Parameters<typeof authorize>[1],
  deps?: Parameters<typeof authorize>[2],
): { decision: ReturnType<typeof authorize>; event: AuditEvent } {
  const before = sink.listAll().length
  const decision = authorize(ctx, request, deps ?? { store })
  const after = sink.listAll()
  assert.ok(after.length === before + 1, 'authorize must emit exactly one audit event')
  return { decision, event: after[after.length - 1]! }
}

console.log('\nK48 Security Audit Trail Runtime\n')

check('A. owner health.read ALLOW → audit event', () => {
  sink.clearForTests()
  const { decision, event } = authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  assert.equal(decision.allowed, true)
  assert.equal(event.result, 'allow')
  assert.equal(event.action, 'health.read')
  assert.equal(event.actorAccountId, SELF_OWNER_ID)
  assert.equal(event.actorType, 'human')
  assert.equal(event.kind, 'authorization_decision')
  assert.equal(event.authority, 'demo')
  assert.equal(event.allowPath, 'owner')
})

check('B. caregiver health.write DENY → audit event', () => {
  sink.clearForTests()
  const { decision, event } = authorizeAndCapture(ctxForAccount(caregiver.id), {
    action: 'health.write',
    resource: { type: 'pet', id: bella.id },
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.equal(event.action, 'health.write')
  assert.ok(event.reasonCode)
  assert.equal(event.actorAccountId, caregiver.id)
})

check('C. professional without access → DENY + audit', () => {
  sink.clearForTests()
  savePetProfessionalAccess([])
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const { decision, event } = authorizeAndCapture(ctx, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.equal(event.reasonCode, 'NO_ACCESS')
  assert.equal(event.professionalId, vetProfile.id)
})

check('D. professional with access → ALLOW + audit', () => {
  sink.clearForTests()
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
  const { decision, event } = authorizeAndCapture(ctx, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  assert.equal(decision.allowed, true)
  assert.equal(event.result, 'allow')
  assert.equal(event.allowPath, 'professional')
  assert.equal(event.professionalId, vetProfile.id)
})

check('E. org member without Pet grant → DENY + audit', () => {
  sink.clearForTests()
  saveOrganizationPetAccess([])
  const memberships = loadOrganizationMemberships()
  const m = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicX.id,
  )!
  const ctx = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: m.id,
    role: m.role,
  })
  const { decision, event } = authorizeAndCapture(ctx, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedOrganizationId: clinicX.id,
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.equal(event.organizationId, clinicX.id)
  assert.equal(event.reasonCode, 'NO_ACCESS')
})

check('F. org grant + permission → ALLOW + audit', () => {
  sink.clearForTests()
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
  const ctx = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: mA.id,
    role: mA.role,
  })
  const { decision, event } = authorizeAndCapture(ctx, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedOrganizationId: clinicX.id,
  })
  assert.equal(decision.allowed, true)
  assert.equal(event.result, 'allow')
  assert.equal(event.organizationId, clinicX.id)
  assert.equal(event.allowPath, 'organization')
})

check('G. cross-org attempt → DENY + audit', () => {
  sink.clearForTests()
  const memberships = loadOrganizationMemberships()
  const mY = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicY.id,
  )!
  const ctxY = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicY.id,
    membershipId: mY.id,
    role: mY.role,
  })
  const { decision, event } = authorizeAndCapture(ctxY, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedOrganizationId: clinicX.id,
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.equal(event.reasonCode, 'ORG_SCOPE_MISMATCH')
})

check('H. revoked access → DENY + audit', () => {
  sink.clearForTests()
  const list = loadOrganizationPetAccess()
  const grant = list.find((a) => a.organizationId === clinicX.id && a.petId === bella.id)!
  const { accessList } = revokeOrganizationPetAccess(list, grant.id, bella, SELF_OWNER_ID)
  saveOrganizationPetAccess(accessList)
  const memberships = loadOrganizationMemberships()
  const mA = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicX.id,
  )!
  const ctx = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: mA.id,
    role: mA.role,
  })
  const { decision, event } = authorizeAndCapture(ctx, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedOrganizationId: clinicX.id,
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.ok(
    event.reasonCode === 'REVOKED_ACCESS' || event.reasonCode === 'NO_ACCESS',
    `expected REVOKED_ACCESS or NO_ACCESS, got ${event.reasonCode}`,
  )
  // restore for later
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

check('I. expired access → DENY + audit', () => {
  sink.clearForTests()
  const past = '2020-01-01T00:00:00.000Z'
  let list = loadPetProfessionalAccess()
  const existing = list.find(
    (a) => a.professionalId === vetProfile.id && a.petId === bella.id && a.status === 'active',
  )
  if (existing) {
    list = list.map((a) => (a.id === existing.id ? { ...a, expiresAt: past } : a))
    savePetProfessionalAccess(list)
  } else {
    const { accessList } = grantPetAccess(list, [], {
      petId: bella.id,
      professionalId: vetProfile.id,
      permissions: ['viewHealth'],
      grantedByAccountId: SELF_OWNER_ID,
      status: 'active',
      expiresAt: past,
    })
    savePetProfessionalAccess(accessList)
  }
  const ctx = withProfessionalContext(ctxForAccount(vetAccount.id), {
    professionalProfileId: vetProfile.id,
  })
  const { decision, event } = authorizeAndCapture(
    ctx,
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store, now: Date.parse('2026-06-01T00:00:00.000Z') },
  )
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.ok(
    event.reasonCode === 'EXPIRED_ACCESS' || event.reasonCode === 'NO_ACCESS',
    `expected EXPIRED_ACCESS or NO_ACCESS, got ${event.reasonCode}`,
  )
})

check('J. forged actor → DENY + audit', () => {
  sink.clearForTests()
  const demo = createDemoSecurityContext()
  assert.equal(demo.ok, true)
  if (!demo.ok) return
  const { decision, event } = authorizeAndCapture(demo.context, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedActorAccountId: 'acct_hacker',
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.equal(event.reasonCode, 'INVALID_CONTEXT')
  assert.equal(event.actorAccountId, SELF_OWNER_ID)
})

check('K. unknown permission/action → DENY + audit', () => {
  sink.clearForTests()
  const { decision, event } = authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'totally.unknown.action',
    resource: { type: 'pet', id: bella.id },
  })
  assert.equal(decision.allowed, false)
  assert.equal(event.result, 'deny')
  assert.equal(event.reasonCode, 'UNKNOWN_ACTION')
})

check('L. audit contains no health payload', () => {
  sink.clearForTests()
  const { event } = authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  const raw = JSON.stringify(event)
  assert.equal(raw.includes('diagnosis'), false)
  assert.equal(raw.includes('vaccination'), false)
  assert.equal(raw.includes('lab result'), false)
  assert.equal('healthRecords' in (event.metadata ?? {}), false)
  // scrubber drops clinical keys
  const scrubbed = scrubAuditMetadata({
    diagnosis: 'fracture',
    medication: 'antibiotics',
    healthRecord: { note: 'secret' },
    grantId: 'safe',
  })
  assert.equal(scrubbed?.diagnosis, undefined)
  assert.equal(scrubbed?.medication, undefined)
  assert.equal(scrubbed?.healthRecord, undefined)
  assert.equal(scrubbed?.grantId, 'safe')
})

check('M. audit contains no microchip value', () => {
  sink.clearForTests()
  const { event } = authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'microchip.read',
    resource: { type: 'pet', id: bella.id },
  })
  const raw = JSON.stringify(event)
  assert.equal(raw.includes('999999999999999'), false)
  assert.equal(event.action, 'microchip.read')
  const scrubbed = scrubAuditMetadata({ microchip: '999999999999999', action: 'microchip.read' })
  assert.equal(scrubbed?.microchip, undefined)
})

check('N. audit contains no owner PII', () => {
  const scrubbed = scrubAuditMetadata({
    ownerPhone: '+420111222333',
    ownerEmail: 'secret@example.com',
    address: 'Main St 1',
    path: 'owner',
  })
  assert.equal(scrubbed?.ownerPhone, undefined)
  assert.equal(scrubbed?.ownerEmail, undefined)
  assert.equal(scrubbed?.address, undefined)
  assert.equal(scrubbed?.path, 'owner')
})

check('O. audit contains no payment secret', () => {
  const scrubbed = scrubAuditMetadata({
    cvv: '123',
    cardNumber: '4111111111111111',
    providerAccountId: 'acct_stripe_secret',
    providerToken: 'tok_live_xxx',
    paymentId: 'pay_1',
  })
  assert.equal(scrubbed?.cvv, undefined)
  assert.equal(scrubbed?.cardNumber, undefined)
  assert.equal(scrubbed?.providerAccountId, undefined)
  assert.equal(scrubbed?.providerToken, undefined)
  assert.equal(scrubbed?.paymentId, 'pay_1')
})

check('P. audit result cannot be client-controlled', () => {
  const forged: AuthorizationAuditPayload = {
    actorAccountId: SELF_OWNER_ID,
    actorKind: 'account',
    resourceType: 'pet',
    resourceId: bella.id,
    action: 'health.read',
    authorizationResult: 'deny',
    correlationId: 'corr_test',
    channel: 'web',
    authority: 'demo',
    denyClass: 'forbidden',
    denyCode: 'unauthorized',
  }
  // Mapper trusts payload from authorize() only — client cannot inject via authorize API.
  // Prove authorize ignores client "result" — there is no such request field.
  sink.clearForTests()
  const { decision, event } = authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  assert.equal(decision.allowed, true)
  assert.equal(event.result, 'allow')
  // Even if someone maps a forged payload offline, production path only emits from finish()
  const mapped = mapAuthorizationPayloadToAuditEvent(forged)
  assert.equal(mapped.result, 'deny') // map is pure; authority of emit is authorize finish only
  assert.equal(event.result, 'allow') // live path not client-controlled
})

check('Q. audit actor cannot be client-controlled', () => {
  sink.clearForTests()
  const { event } = authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedActorAccountId: 'acct_forged_actor',
  })
  // Forgery DENY — actor on event is still trusted context actor, not claim
  assert.equal(event.result, 'deny')
  assert.equal(event.actorAccountId, SELF_OWNER_ID)
  assert.notEqual(event.actorAccountId, 'acct_forged_actor')
})

check('R. correlationId propagated', () => {
  sink.clearForTests()
  const corr = 'corr_explicit_k48_trace'
  const { event } = authorizeAndCapture(
    ctxForAccount(SELF_OWNER_ID, { correlationId: corr }),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
  )
  assert.equal(event.correlationId, corr)
})

check('S. authorization result does not depend on audit sink success', () => {
  configureAuthorizationAudit({
    record() {
      throw new Error('sink boom')
    },
  })
  const decision = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'health.read', resource: { type: 'pet', id: bella.id } },
    { store },
  )
  assert.equal(decision.allowed, true)
  // restore working sink
  configureAuthorizationAudit(sink)
})

check('T. organization audit isolation contract', () => {
  sink.clearForTests()
  // emit org X allow
  const memberships = loadOrganizationMemberships()
  const mA = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicX.id,
  )!
  const ctxX = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicX.id,
    membershipId: mA.id,
    role: mA.role,
  })
  authorizeAndCapture(ctxX, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedOrganizationId: clinicX.id,
  })
  // emit org Y deny (cross)
  const mY = memberships.find(
    (x) => x.accountId === vetA.id && x.organizationId === clinicY.id,
  )!
  const ctxY = withOrganizationContext(ctxForAccount(vetA.id), {
    organizationId: clinicY.id,
    membershipId: mY.id,
    role: mY.role,
  })
  authorizeAndCapture(ctxY, {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
    claimedOrganizationId: clinicX.id,
  })

  const all = sink.listAll()
  const onlyX = assertOrganizationAuditIsolation(all, clinicX.id)
  assert.ok(onlyX.every((e) => e.organizationId === clinicX.id))
  const onlyY = assertOrganizationAuditIsolation(all, clinicY.id)
  assert.ok(onlyY.every((e) => e.organizationId === clinicY.id))
  assert.throws(() =>
    queryDemoAuditEvents(sink, {}, { requireOrganizationScope: true }),
  )
})

check('U. booking/payment remain separate', () => {
  sink.clearForTests()
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
  const isoStore = {
    pets: [bella],
    getBooking: (id: string) => (id === booking.id ? booking : null),
    getPayment: (id: string) => (id === payment.id ? payment : null),
  }

  const bookOk = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'booking.read', resource: { type: 'booking', id: booking.id } },
    { store: isoStore },
  )
  assert.equal(bookOk.allowed, true)

  const bookIso = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'health.read', resource: { type: 'booking', id: booking.id } },
    { store: isoStore },
  )
  assert.equal(bookIso.allowed, false)
  if (!bookIso.allowed) assert.equal(bookIso.denyClass, 'isolation')

  const payOk = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'payment.read', resource: { type: 'payment', id: payment.id } },
    { store: isoStore },
  )
  assert.equal(payOk.allowed, true)

  const payIso = authorize(
    ctxForAccount(SELF_OWNER_ID),
    { action: 'health.read', resource: { type: 'payment', id: payment.id } },
    { store: isoStore },
  )
  assert.equal(payIso.allowed, false)
  if (!payIso.allowed) assert.equal(payIso.denyClass, 'isolation')

  const events = sink.listAll()
  assert.ok(events.some((e) => e.action === 'booking.read' && e.result === 'allow'))
  assert.ok(events.some((e) => e.action === 'payment.read' && e.result === 'allow'))
  assert.ok(events.some((e) => e.reasonCode === 'INVALID_CONTEXT'))
  for (const e of events) {
    const raw = JSON.stringify(e)
    assert.equal(raw.includes('cvv'), false)
  }
})

check('V. membership remains separate', () => {
  sink.clearForTests()
  const memberships = loadOrganizationMemberships()
  const mR = memberships.find(
    (x) => x.accountId === receptionist.id && x.organizationId === clinicX.id,
  )!
  const ctx = withOrganizationContext(ctxForAccount(receptionist.id), {
    organizationId: clinicX.id,
    membershipId: mR.id,
    role: mR.role,
  })
  // membership-only ops ALLOW without pet grant
  const ops = authorize(
    ctx,
    { action: 'organization.ops', resource: { type: 'organization', id: clinicX.id } },
    { store },
  )
  assert.equal(ops.allowed, true)
  // pet health still DENY without eligible grant+permission
  const health = authorize(
    ctx,
    {
      action: 'health.read',
      resource: { type: 'pet', id: bella.id },
      claimedOrganizationId: clinicX.id,
    },
    { store },
  )
  assert.equal(health.allowed, false)
  const last = lastEvent()
  assert.equal(last.action, 'health.read')
  assert.equal(last.result, 'deny')
})

check('W. audit event is append-only contract', () => {
  sink.clearForTests()
  authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  authorizeAndCapture(ctxForAccount(SELF_OWNER_ID), {
    action: 'health.read',
    resource: { type: 'pet', id: bella.id },
  })
  const all = sink.listAll()
  assert.equal(all.length, 2)
  // No edit/delete APIs on AuditSink / DemoAuditSink
  assert.equal(typeof (sink as { editAuditEvent?: unknown }).editAuditEvent, 'undefined')
  assert.equal(typeof (sink as { deleteAuditEvent?: unknown }).deleteAuditEvent, 'undefined')
  // Server stub has no fake persistence
  const server = createServerAuditSinkStub()
  assert.equal(server.wired, false)
  server.record(all[0]!)
  // retention is plan-only
  const planned = planRetention(DEFAULT_AUTHORIZATION_RETENTION)
  assert.equal(planned.stream, 'authorization_decision')
})

check('public access: anonymous actor has no fake accountId', () => {
  sink.clearForTests()
  const pub = createAnonymousPublicContext({ correlationId: 'corr_public' })
  const publicPet = { ...bella, publicDiscover: true } as Pet
  const { decision, event } = authorizeAndCapture(
    pub,
    { action: 'public.pet.project', resource: { type: 'public_pet', id: publicPet.id } },
    { store: { pets: [publicPet] } },
  )
  assert.equal(decision.allowed, true)
  assert.equal(event.actorType, 'anonymous')
  assert.equal(event.actorAccountId, undefined)
  assert.equal(event.result, 'allow')
})

check('timestamp is ISO 8601 UTC contract', () => {
  const e = lastEvent()
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(e.timestamp))
})

configureAuthorizationAudit(null)

console.log(`\nK48 audit asserts: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
