/**
 * Assert account UX + onboarding 2.0 (KROK 36).
 * Run: npx tsx scripts/assert-account-onboarding.mts
 */
import assert from 'node:assert/strict'
import { createDefaultSubscription, hasEntitlement } from '../src/lib/entitlements/index.ts'
import {
  isProfessionalAccount,
  roleGrantsPetDataAccess,
} from '../src/lib/professional/index.ts'

function installMemoryStorage() {
  function makeStore() {
    const store = new Map<string, string>()
    return {
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
  }
  const local = makeStore()
  const session = makeStore()
  Object.defineProperty(globalThis, 'localStorage', {
    value: local,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: session,
    configurable: true,
  })
  return local
}

const memory = installMemoryStorage()

const {
  ONBOARDING_COMPLETED_KEY,
  SESSION_ACTIVE_KEY,
  accountNeedsOnboarding,
  completeOnboarding,
  ensureDefaultSelfAccount,
  getMyProfilePath,
  getSelfAccount,
  isOnboardingCompleted,
  isSessionActive,
  loginSelfSession,
  logoutSelfSession,
  markOnboardingCompleted,
  resetOnboardingDemo,
  UI_WORKSPACE_STORAGE_KEY,
  setUiWorkspace,
  getUiWorkspace,
} = await import('../src/lib/account/index.ts')

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

console.log('\n=== assert-account-onboarding (KROK 36) ===\n')

check('1 – missing session flag defaults to active (legacy DEMO)', () => {
  memory.clear()
  assert.equal(isSessionActive(), true)
})

check('2 – logout deactivates session without wiping pets key', () => {
  memory.clear()
  loginSelfSession()
  markOnboardingCompleted()
  memory.setItem('lovedandknown.pets', JSON.stringify([{ id: 'p1', name: 'Rex' }]))
  setUiWorkspace('professional')
  assert.equal(getUiWorkspace(), 'professional')

  logoutSelfSession()
  assert.equal(isSessionActive(), false)
  assert.equal(memory.getItem(SESSION_ACTIVE_KEY), 'false')
  assert.ok(memory.getItem('lovedandknown.pets'), 'pets data preserved')
  assert.equal(isOnboardingCompleted(), true)
  assert.equal(getUiWorkspace(), 'consumer')
})

check('3 – login reactivates same owner_self', () => {
  const account = loginSelfSession()
  assert.equal(isSessionActive(), true)
  assert.equal(account.id, 'owner_self')
  assert.equal(getSelfAccount()?.id, 'owner_self')
})

check('4 – getMyProfilePath consumer → /settings', () => {
  memory.clear()
  const account = ensureDefaultSelfAccount()
  assert.equal(isProfessionalAccount(account), false)
  assert.equal(getMyProfilePath(account), '/settings')
})

check('5 – getMyProfilePath professional → /professional/profile', () => {
  memory.clear()
  ensureDefaultSelfAccount()
  markOnboardingCompleted()
  const { account } = completeOnboarding({
    choiceId: 'veterinarian',
    profileDraft: { displayName: 'MVDr. Test', publicVisibility: 'private' },
  })
  assert.equal(isProfessionalAccount(account), true)
  assert.equal(getMyProfilePath(account), '/professional/profile')
})

check('6 – incomplete account needs onboarding', () => {
  memory.clear()
  loginSelfSession()
  resetOnboardingDemo()
  assert.equal(accountNeedsOnboarding(), true)
  assert.equal(isOnboardingCompleted(), false)
})

check('7 – completed account bypasses onboarding', () => {
  markOnboardingCompleted()
  assert.equal(accountNeedsOnboarding(), false)
  assert.equal(isOnboardingCompleted(), true)
})

check('8 – onboarding completion uses existing key only', () => {
  memory.clear()
  loginSelfSession()
  completeOnboarding({ choiceId: 'owner' })
  assert.equal(memory.getItem(ONBOARDING_COMPLETED_KEY), 'true')
  assert.equal(isOnboardingCompleted(), true)
})

check('9 – resetOnboardingDemo does not delete pets', () => {
  memory.setItem('lovedandknown.pets', JSON.stringify([{ id: 'keep', name: 'Coco' }]))
  resetOnboardingDemo()
  assert.equal(isOnboardingCompleted(), false)
  assert.ok(memory.getItem('lovedandknown.pets'))
  assert.ok(getSelfAccount(), 'account preserved')
})

check('10 – owner onboarding does not create verification', () => {
  memory.clear()
  const { account, profiles } = completeOnboarding({ choiceId: 'owner' })
  assert.deepEqual(account.roles, ['owner'])
  assert.equal(profiles.length, 0)
  assert.equal(memory.getItem('lovedandknown.verifications'), null)
})

check('11 – professional role does not grant pet access', () => {
  memory.clear()
  const { account, profiles } = completeOnboarding({
    choiceId: 'veterinarian',
    profileDraft: { displayName: 'Vet', publicVisibility: 'private' },
  })
  assert.ok(account.roles.includes('veterinarian'))
  assert.equal(roleGrantsPetDataAccess('veterinarian'), false)
  assert.equal(profiles[0]?.verificationStatus, 'unverified')
  assert.equal(profiles[0]?.publicVisibility, 'private')
})

check('12 – role does not activate payment / membership entitlements', () => {
  const sub = createDefaultSubscription()
  assert.equal(hasEntitlement(sub, 'family_multi_pets'), false)
  // Completing pro onboarding must not invent a parallel entitlement store
  assert.equal(memory.getItem('lovedandknown.subscription'), null)
})

check('13 – family_multi_pets remains entitlement matrix authority', () => {
  assert.equal(hasEntitlement('free', 'family_multi_pets'), false)
  assert.equal(hasEntitlement('family', 'family_multi_pets'), true)
})

check('14 – session keys live in account session layer', () => {
  assert.equal(SESSION_ACTIVE_KEY, 'lovedandknown.sessionActive')
  assert.equal(ONBOARDING_COMPLETED_KEY, 'lovedandknown.onboardingCompleted')
  assert.equal(UI_WORKSPACE_STORAGE_KEY, 'lovedandknown.uiWorkspace')
})

check('15 – no second onboarding completion mechanism', () => {
  memory.clear()
  loginSelfSession()
  assert.equal(isOnboardingCompleted(), false)
  markOnboardingCompleted()
  assert.equal(memory.getItem(ONBOARDING_COMPLETED_KEY), 'true')
})

console.log(
  `\nassert-account-onboarding: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed} ok, ${failed} fail)\n`,
)
if (failed > 0) process.exit(1)
