/**
 * Assert account type / roles / onboarding architecture (KROK 19).
 * Run: npx tsx scripts/assert-account-roles.mts
 *
 * A – nový účet může být owner
 * B – owner může přidat další roli
 * C – role přežije reload (normalize round-trip)
 * D – breeder != Breeder Pro entitlement
 * E – veterinarian role != verified
 * F – role sama nedává přístup k pet datům
 * G – ProfessionalAccess stále vyžaduje grant
 * H – READ != WRITE
 * I – public profile neobsahuje health/chip/PII
 * J – verification zůstává oddělená
 * K – existující uživatelé dostanou bezpečný default
 * L – organization role je připravena bez rozbití consumer účtu
 * M – neznámá role nesmí automaticky získat oprávnění
 */
import assert from 'node:assert/strict'
import { createDefaultSubscription, hasEntitlement } from '../src/lib/entitlements/index.ts'
import {
  addAccountRole,
  assertPublicProfessionalSafe,
  canProfessionalViewHealth,
  getRoleMeta,
  grantPetAccess,
  hasPermission,
  hasProfessionalVerifiedBadge,
  isOrganizationProfessionalType,
  isProfessionalType,
  normalizeAccount,
  normalizeOrganization,
  normalizeProfessionalProfile,
  readDoesNotImplyWrite,
  roleGrantsPetDataAccess,
  rolesForOnboardingChoice,
  toPublicProfessionalProfile,
  unknownRoleIsSafe,
  type Account,
  type ProfessionalProfile,
} from '../src/lib/professional/index.ts'
import { isActiveTrustVerification } from '../src/lib/verification/status.ts'
import type { Verification } from '../src/lib/verification/types.ts'

/** Minimal localStorage for session helpers in Node. */
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

const {
  completeOnboarding,
  ensureDefaultSelfAccount,
  getSelfAccount,
  isOnboardingCompleted,
  markOnboardingCompleted,
  resetOnboardingDemo,
  addSelfAccountRole,
} = await import('../src/lib/account/session.ts')

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

function baseAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'owner_self',
    kind: 'consumer',
    roles: ['owner'],
    displayName: 'Tereza',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function baseProProfile(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id: 'pro_1',
    accountId: 'owner_self',
    type: 'veterinarian',
    displayName: 'MVDr. Test',
    address: 'Tajná 1',
    phone: '+420111',
    email: 'vet@example.com',
    professionalCredentials: { licenseNumber: 'SECRET' },
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

console.log('KROK 19 – assert-account-roles')

check('A – nový účet může být owner', () => {
  memory.clear()
  const account = ensureDefaultSelfAccount({ preferOnboardingWhenEmpty: true })
  assert.equal(account.kind, 'consumer')
  assert.ok(account.roles.includes('owner'))
  assert.equal(isProfessionalType('owner'), false)
})

check('B – owner může přidat další roli', () => {
  const owner = baseAccount()
  const withBreeder = addAccountRole(owner, 'breeder')
  assert.ok(withBreeder.roles.includes('owner'))
  assert.ok(withBreeder.roles.includes('breeder'))
  assert.equal(withBreeder.kind, 'consumer')

  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { account, profile } = addSelfAccountRole('breeder', {
    displayName: 'Stanice Demo',
  })
  assert.ok(account.roles.includes('breeder'))
  assert.ok(profile)
  assert.equal(profile!.verificationStatus, 'unverified')
})

check('C – role přežije reload (normalize round-trip)', () => {
  const account = addAccountRole(baseAccount(), 'groomer')
  const raw = JSON.parse(JSON.stringify(account))
  const again = normalizeAccount(raw)
  assert.ok(again)
  assert.deepEqual(again!.roles, ['owner', 'groomer'])
  assert.equal(again!.kind, 'consumer')
})

check('D – breeder != Breeder Pro entitlement', () => {
  const free = createDefaultSubscription()
  assert.equal(hasEntitlement(free, 'breeding_pedigree'), false)
  assert.equal(roleGrantsPetDataAccess('breeder'), false)
  // Having breeder role does not change free plan entitlements.
  assert.equal(hasEntitlement(free, 'breeding_litters'), false)
  assert.ok(getRoleMeta('breeder').label.includes('Chovatel'))
})

check('E – veterinarian role != verified', () => {
  const profile = baseProProfile({
    type: 'veterinarian',
    verificationStatus: 'unverified',
  })
  assert.equal(hasProfessionalVerifiedBadge(profile, []), false)
  const pub = toPublicProfessionalProfile(profile)
  assert.ok(pub)
  assert.equal(pub!.verifiedBadge, undefined)
})

check('F – role sama nedává přístup k pet datům', () => {
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
  assert.equal(roleGrantsPetDataAccess('breeder'), false)
  assert.equal(roleGrantsPetDataAccess('shelter'), false)
  assert.equal(canProfessionalViewHealth(null), false)
})

check('G – ProfessionalAccess stále vyžaduje grant', () => {
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_1',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
    status: 'active',
  })
  assert.equal(hasPermission(access, 'viewHealth'), true)
  assert.equal(hasPermission(null, 'viewHealth'), false)
  assert.equal(canProfessionalViewHealth(null), false)
})

check('H – READ != WRITE', () => {
  assert.equal(readDoesNotImplyWrite('viewHealth', 'addHealthRecord'), true)
  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: 'pro_1',
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  assert.equal(hasPermission(access, 'viewHealth'), true)
  assert.equal(hasPermission(access, 'addHealthRecord'), false)
})

check('I – public profile neobsahuje health/chip/PII', () => {
  const profile = baseProProfile({
    address: 'Ulice 1, Praha',
    city: 'Praha',
    professionalCredentials: { licenseNumber: 'HIDE-ME', registrationId: 'RID' },
  })
  const pub = toPublicProfessionalProfile(profile)
  assert.ok(pub)
  assertPublicProfessionalSafe(pub!)
  const record = pub as Record<string, unknown>
  assert.equal(record.address, undefined)
  assert.equal(record.professionalCredentials, undefined)
  assert.equal(record.licenseNumber, undefined)
  assert.equal(record.accountId, undefined)
  assert.equal(record.microchip, undefined)
  assert.equal(record.health, undefined)
  assert.equal(record.ownerContacts, undefined)
})

check('J – verification zůstává oddělená', () => {
  const demoVer: Verification = {
    id: 'v1',
    subjectType: 'professional',
    subjectId: 'pro_1',
    type: 'veterinary',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(isActiveTrustVerification(demoVer), false)
  const profile = baseProProfile({ verificationStatus: 'verified' })
  assert.equal(hasProfessionalVerifiedBadge(profile, [demoVer]), false)

  memory.clear()
  completeOnboarding({
    choiceId: 'veterinarian',
    profileDraft: { displayName: 'Vet Demo' },
  })
  const self = getSelfAccount()
  assert.ok(self?.roles.includes('veterinarian'))
  // Completing onboarding must not invent trust verification records.
  assert.equal(memory.getItem('lovedandknown.verifications'), null)
})

check('K – existující uživatelé dostanou bezpečný default', () => {
  memory.clear()
  memory.setItem('lovedandknown.pets', JSON.stringify([{ id: 'luna' }]))
  const account = ensureDefaultSelfAccount({ preferOnboardingWhenEmpty: true })
  assert.equal(account.kind, 'consumer')
  assert.deepEqual(account.roles, ['owner'])
  assert.equal(isOnboardingCompleted(), true)
})

check('L – organization role je připravena bez rozbití consumer účtu', () => {
  assert.equal(isOrganizationProfessionalType('veterinary_clinic'), true)
  assert.equal(isOrganizationProfessionalType('shelter'), true)
  assert.equal(isOrganizationProfessionalType('veterinarian'), false)

  memory.clear()
  markOnboardingCompleted()
  const consumer = ensureDefaultSelfAccount()
  assert.ok(consumer.roles.includes('owner'))

  const { account, organization, profile } = addSelfAccountRole('veterinary_clinic', {
    displayName: 'Klinika Demo',
    organizationName: 'PetCare Central',
  })
  assert.ok(account.roles.includes('owner'))
  assert.ok(account.roles.includes('veterinary_clinic'))
  assert.ok(organization)
  assert.equal(organization!.type, 'veterinary_clinic')
  assert.ok(organization!.memberAccountIds.includes(account.id))
  assert.ok(profile?.organizationId)

  const orgRound = normalizeOrganization(JSON.parse(JSON.stringify(organization)))
  assert.ok(orgRound)
  assert.equal(orgRound!.name, 'PetCare Central')

  // Pure org onboarding (no owner) still works for org-only path.
  const orgRoles = rolesForOnboardingChoice('veterinary_clinic')
  assert.deepEqual(orgRoles, ['veterinary_clinic'])
})

check('M – neznámá role nesmí automaticky získat oprávnění', () => {
  assert.equal(unknownRoleIsSafe('custom_physio'), true)
  assert.equal(isProfessionalType('custom_physio'), true)
  assert.equal(roleGrantsPetDataAccess('custom_physio' as never), false)
  assert.equal(hasPermission(null, 'viewHealth'), false)
  assert.equal(canProfessionalViewHealth(null), false)

  const profile = normalizeProfessionalProfile({
    id: 'pro_x',
    accountId: 'a1',
    type: 'custom_physio',
    displayName: 'Physio',
    verificationStatus: 'unverified',
    publicVisibility: 'private',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })
  assert.ok(profile)
  assert.equal(toPublicProfessionalProfile(profile!), null)
})

check('private profile is not publicly projectable', () => {
  const pub = toPublicProfessionalProfile(
    baseProProfile({ publicVisibility: 'private' }),
  )
  assert.equal(pub, null)
})

check('pet_service is a known professional type', () => {
  assert.equal(isProfessionalType('pet_service'), true)
  assert.ok(getRoleMeta('pet_service').label.length > 0)
  assert.deepEqual(rolesForOnboardingChoice('pet_services', 'groomer'), [
    'owner',
    'groomer',
  ])
})

check('DEMO onboarding reset clears completion flag', () => {
  memory.clear()
  markOnboardingCompleted()
  assert.equal(isOnboardingCompleted(), true)
  resetOnboardingDemo()
  assert.equal(isOnboardingCompleted(), false)
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
