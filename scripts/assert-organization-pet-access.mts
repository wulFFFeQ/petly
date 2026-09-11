/**
 * Assert OrganizationPetAccess (K44).
 * Run: npx tsx scripts/assert-organization-pet-access.mts
 */
import assert from 'node:assert/strict'
import {
  acceptOrganizationInvitation,
  createOrganization,
  inviteOrganizationMember,
  isMemberPetEligible,
  isOrganizationPetAccessEffective,
  loadOrganizationMemberships,
  loadOrganizationPetAccess,
  loadOrganizations,
  projectPetForOrganization,
  removeOrganizationMember,
  revokeOwnerOrganizationPetAccess,
  grantOwnerOrganizationPetAccess,
  setOrganizationPetAccessAssignments,
  assertOrganizationPetViewSafe,
} from '../src/lib/organization/index.ts'
import {
  buildOrganizationPetAccessNotification,
  isSafeOrganizationPetAccessNotificationPayload,
} from '../src/lib/notifications/fromOrganizationPetAccess.ts'
import { loadPetProfessionalAccess } from '../src/lib/professional/index.ts'
import { loadPetHouseholdAccess } from '../src/lib/household/index.ts'
import type { Pet } from '../src/types/index.ts'

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

const petOwner = 'acct_pet_owner'
const clinicOwner = 'acct_clinic_owner'
const vetA = 'acct_vet_a'
const vetB = 'acct_vet_b'
const receptionist = 'acct_reception'
const outsider = 'acct_outsider'

function makePet(overrides?: Partial<Pet>): Pet {
  return {
    id: 'pet_bella',
    name: 'Bella',
    type: 'dog',
    breed: 'Mix',
    image: '',
    ownerAccountId: petOwner,
    microchip: 'SECRET_CHIP_999',
    ...overrides,
  }
}

memory.clear()

const { organization: clinic } = createOrganization({
  actorAccountId: clinicOwner,
  displayName: 'Klinika X',
  organizationType: 'veterinary_clinic',
})

const inviteVetA = inviteOrganizationMember({
  organizationId: clinic.id,
  actorAccountId: clinicOwner,
  inviteeAccountId: vetA,
  role: 'professional',
})
acceptOrganizationInvitation(inviteVetA.id, vetA)

const inviteVetB = inviteOrganizationMember({
  organizationId: clinic.id,
  actorAccountId: clinicOwner,
  inviteeAccountId: vetB,
  role: 'professional',
})
acceptOrganizationInvitation(inviteVetB.id, vetB)

const inviteReception = inviteOrganizationMember({
  organizationId: clinic.id,
  actorAccountId: clinicOwner,
  inviteeAccountId: receptionist,
  role: 'staff',
})
acceptOrganizationInvitation(inviteReception.id, receptionist)

const bella = makePet()
  const healthRecords = [
  {
    id: 'hr_1',
    petId: bella.id,
    type: 'checkup' as const,
    title: 'Kontrola',
    subtitle: '',
    date: '2026-01-01',
  },
]

check('1. owner can grant organization pet access', () => {
  const { access } = grantOwnerOrganizationPetAccess({
    pet: bella,
    organizationId: clinic.id,
    grantedByAccountId: petOwner,
    permissions: ['viewHealth', 'addNote'],
    visibilityMode: 'assigned_only',
    assignedAccountIds: [vetA],
  })
  assert.ok(access.id.startsWith('opa_'))
  assert.equal(access.status, 'active')
  assert.equal(access.visibilityMode, 'assigned_only')
  assert.ok(isOrganizationPetAccessEffective(access))
  assert.equal(loadOrganizationPetAccess().length, 1)
})

check('2. membership alone does not open pet card', () => {
  const access = loadOrganizationPetAccess()[0]!
  const memberships = loadOrganizationMemberships()
  const vetBMembership = memberships.find(
    (m) => m.accountId === vetB && m.organizationId === clinic.id && m.status === 'active',
  )!
  assert.equal(isMemberPetEligible(access, vetBMembership, vetB), false)

  const view = projectPetForOrganization(bella, {
    access,
    membership: vetBMembership,
    actorAccountId: vetB,
    healthRecords,
  })
  assert.deepEqual(Object.keys(view).sort(), ['petId'])
  assert.equal(view.name, undefined)
  assert.equal(view.healthRecords, undefined)
})

check('3. assigned professional sees identity + permission-gated health', () => {
  const access = loadOrganizationPetAccess()[0]!
  const memberships = loadOrganizationMemberships()
  const vetAMembership = memberships.find(
    (m) => m.accountId === vetA && m.organizationId === clinic.id && m.status === 'active',
  )!
  assert.equal(isMemberPetEligible(access, vetAMembership, vetA), true)

  const view = projectPetForOrganization(bella, {
    access,
    membership: vetAMembership,
    actorAccountId: vetA,
    healthRecords,
    ownerContacts: { phone: '123', email: 'x@y.z' },
  })
  assert.equal(view.name, 'Bella')
  assert.ok(view.healthRecords?.length === 1)
  assert.equal(view.documents, undefined)
  assertOrganizationPetViewSafe(view)
  assert.ok(!('microchip' in view))
  assert.ok(!('ownerContacts' in view))
})

check('4. staff/receptionist never eligible by default', () => {
  const access = loadOrganizationPetAccess()[0]!
  const memberships = loadOrganizationMemberships()
  const staffMembership = memberships.find(
    (m) => m.accountId === receptionist && m.organizationId === clinic.id,
  )!
  assert.equal(isMemberPetEligible(access, staffMembership, receptionist), false)

  const view = projectPetForOrganization(bella, {
    access,
    membership: staffMembership,
    actorAccountId: receptionist,
    healthRecords,
  })
  assert.equal(view.name, undefined)
})

check('5. org owner/admin membership ≠ pet health', () => {
  const access = loadOrganizationPetAccess()[0]!
  const memberships = loadOrganizationMemberships()
  const ownerMembership = memberships.find(
    (m) => m.accountId === clinicOwner && m.organizationId === clinic.id,
  )!
  assert.equal(ownerMembership.role, 'owner')
  assert.equal(isMemberPetEligible(access, ownerMembership, clinicOwner), false)
})

check('6. employee departure blocks access; grant remains', () => {
  const before = loadOrganizationPetAccess()[0]!
  assert.equal(before.status, 'active')

  const memberships = loadOrganizationMemberships()
  const vetAMembership = memberships.find(
    (m) => m.accountId === vetA && m.organizationId === clinic.id && m.status === 'active',
  )!
  removeOrganizationMember(clinic.id, clinicOwner, vetAMembership.id)

  const afterMemberships = loadOrganizationMemberships()
  const removed = afterMemberships.find((m) => m.id === vetAMembership.id)!
  assert.equal(removed.status, 'removed')

  const access = loadOrganizationPetAccess()[0]!
  assert.equal(access.status, 'active')
  assert.equal(access.id, before.id)
  assert.equal(isMemberPetEligible(access, removed, vetA), false)

  const view = projectPetForOrganization(bella, {
    access,
    membership: removed,
    actorAccountId: vetA,
    healthRecords,
  })
  assert.equal(view.name, undefined)
  assert.equal(view.healthRecords, undefined)

  assert.ok(loadOrganizations().some((o) => o.id === clinic.id))
})

check('7. owner revoke keeps org + memberships; blocks all members', () => {
  // Re-invite vetB is still active; assign vetB then revoke grant
  setOrganizationPetAccessAssignments(
    loadOrganizationPetAccess()[0]!.id,
    bella,
    petOwner,
    [vetB],
  )
  const accessBefore = loadOrganizationPetAccess()[0]!
  const memberships = loadOrganizationMemberships()
  const vetBMembership = memberships.find(
    (m) => m.accountId === vetB && m.status === 'active',
  )!
  assert.equal(isMemberPetEligible(accessBefore, vetBMembership, vetB), true)

  const { access: revoked } = revokeOwnerOrganizationPetAccess(
    accessBefore.id,
    bella,
    petOwner,
  )
  assert.equal(revoked?.status, 'revoked')
  assert.equal(isOrganizationPetAccessEffective(revoked), false)

  assert.ok(loadOrganizations().some((o) => o.id === clinic.id))
  assert.ok(
    loadOrganizationMemberships().some(
      (m) => m.organizationId === clinic.id && m.accountId === vetB && m.status === 'active',
    ),
  )

  const view = projectPetForOrganization(bella, {
    access: revoked,
    membership: vetBMembership,
    actorAccountId: vetB,
    healthRecords,
  })
  assert.equal(view.name, undefined)
})

check('8. does not create professional or household access', () => {
  assert.equal(loadPetProfessionalAccess().length, 0)
  assert.equal(loadPetHouseholdAccess().length, 0)
})

check('9. role_eligible only for listed roles (professional), not staff', () => {
  memory.clear()
  const { organization: clinic2 } = createOrganization({
    actorAccountId: clinicOwner,
    displayName: 'Klinika Y',
    organizationType: 'veterinary_clinic',
  })
  const inv = inviteOrganizationMember({
    organizationId: clinic2.id,
    actorAccountId: clinicOwner,
    inviteeAccountId: vetA,
    role: 'professional',
  })
  acceptOrganizationInvitation(inv.id, vetA)
  const invStaff = inviteOrganizationMember({
    organizationId: clinic2.id,
    actorAccountId: clinicOwner,
    inviteeAccountId: receptionist,
    role: 'staff',
  })
  acceptOrganizationInvitation(invStaff.id, receptionist)

  const { access } = grantOwnerOrganizationPetAccess({
    pet: bella,
    organizationId: clinic2.id,
    grantedByAccountId: petOwner,
    permissions: ['viewHealth'],
    visibilityMode: 'role_eligible',
    eligibleRoles: ['professional'],
  })

  const memberships = loadOrganizationMemberships()
  const proM = memberships.find((m) => m.accountId === vetA && m.organizationId === clinic2.id)!
  const staffM = memberships.find(
    (m) => m.accountId === receptionist && m.organizationId === clinic2.id,
  )!
  assert.equal(isMemberPetEligible(access, proM, vetA), true)
  assert.equal(isMemberPetEligible(access, staffM, receptionist), false)
  assert.equal(isMemberPetEligible(access, proM, outsider), false)
})

check('10. notifications are privacy-safe', () => {
  const access = loadOrganizationPetAccess()[0]!
  const org = loadOrganizations().find((o) => o.id === access.organizationId)!
  const draft = buildOrganizationPetAccessNotification({
    access,
    event: 'granted',
    organization: org,
    petName: bella.name,
    recipientAccountId: clinicOwner,
  })
  assert.ok(draft)
  assert.equal(draft!.type, 'organization_access_granted')
  assert.ok(isSafeOrganizationPetAccessNotificationPayload(draft!))
  assert.ok(!/microchip|healthRecord|SECRET/i.test(JSON.stringify(draft)))
})

check('11. cross-org: grant on clinic does not apply to unrelated org membership', () => {
  memory.clear()
  const { organization: orgX } = createOrganization({
    actorAccountId: clinicOwner,
    displayName: 'Org X',
    organizationType: 'veterinary_clinic',
  })
  const { organization: orgY } = createOrganization({
    actorAccountId: clinicOwner,
    displayName: 'Org Y',
    organizationType: 'shelter',
  })
  const invX = inviteOrganizationMember({
    organizationId: orgX.id,
    actorAccountId: clinicOwner,
    inviteeAccountId: vetA,
    role: 'professional',
  })
  acceptOrganizationInvitation(invX.id, vetA)
  const invY = inviteOrganizationMember({
    organizationId: orgY.id,
    actorAccountId: clinicOwner,
    inviteeAccountId: vetA,
    role: 'professional',
  })
  acceptOrganizationInvitation(invY.id, vetA)

  const { access } = grantOwnerOrganizationPetAccess({
    pet: bella,
    organizationId: orgX.id,
    grantedByAccountId: petOwner,
    permissions: ['viewHealth'],
    visibilityMode: 'role_eligible',
  })

  const memberships = loadOrganizationMemberships()
  const memY = memberships.find((m) => m.accountId === vetA && m.organizationId === orgY.id)!
  assert.equal(isMemberPetEligible(access, memY, vetA), false)

  const view = projectPetForOrganization(bella, {
    access,
    membership: memY,
    actorAccountId: vetA,
    healthRecords,
  })
  assert.equal(view.name, undefined)
})

console.log(`\nPassed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
