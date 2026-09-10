/**
 * Assert professional public visibility (KROK 19.1).
 * Run: npx tsx scripts/assert-professional-visibility.mts
 *
 * A – default je private
 * B – přepnutí na public se uloží
 * C – public přežije reload
 * D – private profil není veřejně dostupný
 * E – public profil neobsahuje health/chip/PII
 * F – public profil bez verification nemá trust badge
 * G – skutečně verified profil může mít trust badge
 * H – změna visibility nemění permissions
 * I – změna visibility nemění entitlements
 */
import assert from 'node:assert/strict'
import {
  createDefaultSubscription,
  hasEntitlement,
  loadSubscription,
  normalizeSubscription,
} from '../src/lib/entitlements/index.ts'
import {
  assertPublicProfessionalSafe,
  canProfessionalViewHealth,
  grantPetAccess,
  hasPermission,
  hasProfessionalVerifiedBadge,
  loadPetProfessionalAccess,
  normalizeProfessionalProfile,
  roleGrantsPetDataAccess,
  savePetProfessionalAccess,
  toPublicProfessionalProfile,
  type ProfessionalProfile,
} from '../src/lib/professional/index.ts'
import { isActiveTrustVerification } from '../src/lib/verification/status.ts'
import type { Verification } from '../src/lib/verification/types.ts'

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
  addSelfAccountRole,
  ensureDefaultSelfAccount,
  findProfessionalProfileById,
  listSelfProfessionalProfiles,
  markOnboardingCompleted,
  setProfessionalPublicVisibility,
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

function basePro(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id: 'pro_vis_1',
    accountId: 'owner_self',
    type: 'veterinarian',
    displayName: 'MVDr. Visibility',
    address: 'Tajná 9',
    phone: '+420100',
    email: 'vis@example.com',
    city: 'Brno',
    professionalCredentials: { licenseNumber: 'SECRET-VIS' },
    verificationStatus: 'unverified',
    publicVisibility: 'private',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

console.log('KROK 19.1 – assert-professional-visibility')

check('A – default je private', () => {
  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { profile } = addSelfAccountRole('breeder', {
    displayName: 'Stanice Private Default',
  })
  assert.ok(profile)
  assert.equal(profile!.publicVisibility ?? 'private', 'private')
  assert.equal(toPublicProfessionalProfile(profile!), null)
})

check('B – přepnutí na public se uloží', () => {
  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { profile } = addSelfAccountRole('groomer', { displayName: 'Salon B' })
  assert.ok(profile)
  const updated = setProfessionalPublicVisibility(profile!.id, 'public')
  assert.ok(updated)
  assert.equal(updated!.publicVisibility, 'public')
  const loaded = findProfessionalProfileById(profile!.id)
  assert.equal(loaded?.publicVisibility, 'public')
})

check('C – public přežije reload', () => {
  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { profile } = addSelfAccountRole('trainer', { displayName: 'Trenér C' })
  assert.ok(profile)
  setProfessionalPublicVisibility(profile!.id, 'public')

  const raw = memory.getItem('lovedandknown.professionalProfiles')
  assert.ok(raw)
  const parsed = JSON.parse(raw!) as unknown[]
  const round = normalizeProfessionalProfile(parsed.find((p) => (p as { id?: string }).id === profile!.id))
  assert.ok(round)
  assert.equal(round!.publicVisibility, 'public')
  assert.ok(toPublicProfessionalProfile(round!))
})

check('D – private profil není veřejně dostupný', () => {
  const privateProfile = basePro({ publicVisibility: 'private' })
  assert.equal(toPublicProfessionalProfile(privateProfile), null)

  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { profile } = addSelfAccountRole('pet_hotel', { displayName: 'Hotel D' })
  assert.ok(profile)
  assert.equal(profile!.publicVisibility ?? 'private', 'private')
  setProfessionalPublicVisibility(profile!.id, 'public')
  setProfessionalPublicVisibility(profile!.id, 'private')
  const again = findProfessionalProfileById(profile!.id)
  assert.equal(again?.publicVisibility, 'private')
  assert.equal(toPublicProfessionalProfile(again!), null)
})

check('E – public profil neobsahuje health/chip/PII', () => {
  const profile = basePro({
    publicVisibility: 'public',
    address: 'Ulice 12',
    professionalCredentials: { licenseNumber: 'HIDE', registrationId: 'RID' },
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

check('F – public profil bez verification nemá trust badge', () => {
  const profile = basePro({
    publicVisibility: 'public',
    verificationStatus: 'unverified',
  })
  assert.equal(hasProfessionalVerifiedBadge(profile, []), false)
  assert.equal(toPublicProfessionalProfile(profile)?.verifiedBadge, undefined)

  const demoVer: Verification = {
    id: 'demo_vis',
    subjectType: 'professional',
    subjectId: profile.id,
    type: 'veterinary',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(isActiveTrustVerification(demoVer), false)
  assert.equal(hasProfessionalVerifiedBadge({ ...profile, verificationStatus: 'verified' }, [demoVer]), false)
})

check('G – skutečně verified profil může mít trust badge', () => {
  const profile = basePro({
    publicVisibility: 'public',
    verificationStatus: 'verified',
  })
  const trustVer: Verification = {
    id: 'trust_vis',
    subjectType: 'professional',
    subjectId: profile.id,
    type: 'veterinary',
    status: 'verified',
    source: 'vet_attestation',
    presentation: 'trust',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
  assert.equal(hasProfessionalVerifiedBadge(profile, [trustVer]), true)
  assert.equal(
    toPublicProfessionalProfile(profile, { verifications: [trustVer] })?.verifiedBadge,
    true,
  )
})

check('H – změna visibility nemění permissions', () => {
  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  savePetProfessionalAccess([])
  const { profile } = addSelfAccountRole('veterinarian', { displayName: 'Vet H' })
  assert.ok(profile)

  const beforeAccess = loadPetProfessionalAccess()
  assert.equal(beforeAccess.length, 0)
  assert.equal(canProfessionalViewHealth(null), false)
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)

  setProfessionalPublicVisibility(profile!.id, 'public')
  assert.equal(loadPetProfessionalAccess().length, 0)
  assert.equal(hasPermission(null, 'viewHealth'), false)

  const { access } = grantPetAccess([], [], {
    petId: 'luna',
    professionalId: profile!.id,
    permissions: ['viewHealth'],
    grantedByAccountId: 'owner_self',
  })
  savePetProfessionalAccess([access])
  setProfessionalPublicVisibility(profile!.id, 'private')
  const after = loadPetProfessionalAccess()
  assert.equal(after.length, 1)
  assert.equal(hasPermission(after[0], 'viewHealth'), true)
})

check('I – změna visibility nemění entitlements', () => {
  memory.clear()
  const free = createDefaultSubscription()
  memory.setItem('lovedandknown.subscription', JSON.stringify(free))
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { profile } = addSelfAccountRole('breeder', { displayName: 'Breeder I' })
  assert.ok(profile)

  assert.equal(hasEntitlement(loadSubscription(), 'breeding_pedigree'), false)
  setProfessionalPublicVisibility(profile!.id, 'public')
  const subAfter = normalizeSubscription(
    JSON.parse(memory.getItem('lovedandknown.subscription')!),
  )
  assert.ok(subAfter)
  assert.equal(subAfter!.plan, 'free')
  assert.equal(hasEntitlement(subAfter!, 'breeding_pedigree'), false)
  assert.equal(listSelfProfessionalProfiles()[0]?.publicVisibility, 'public')
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
