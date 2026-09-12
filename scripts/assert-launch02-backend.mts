/**
 * LAUNCH 02 — backend/security assert matrix (offline-capable).
 * Does not require live Supabase credentials.
 */

import assert from 'node:assert/strict'
import {
  createServerSecurityContextFromSession,
  createAppSecurityContext,
  authorizePetServer,
  authorizeMessagingParticipants,
  rejectForgedActorClaim,
  assertPublicProjectionSafe,
  PUBLIC_FORBIDDEN_KEYS,
  authorize,
} from '../src/lib/security/index.ts'
import {
  createWiredServerClinicalPersistenceAdapter,
  createServerClinicalPersistenceStub,
  createServerClinicalService,
  ClinicalError,
} from '../src/lib/clinical/index.ts'
import {
  createServerIdempotencyStore,
  executeIdempotent,
  IdempotencyError,
} from '../src/lib/idempotency/index.ts'
import {
  PRODUCTION_CONNECTION_NOT_CONFIGURED,
  getProductionConnectionStatus,
  isProductionBackendConfigured,
} from '../src/lib/backend/index.ts'

const ACCOUNT_A = '11111111-1111-1111-1111-111111111111'
const ACCOUNT_B = '22222222-2222-2222-2222-222222222222'
const PET_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

let passed = 0
function ok(name: string) {
  passed += 1
  console.log(`  ✓ ${name}`)
}

console.log('LAUNCH 02 — backend security asserts')

// --- ENV / feature gate ---
{
  assert.equal(isProductionBackendConfigured(), false)
  assert.equal(getProductionConnectionStatus(), PRODUCTION_CONNECTION_NOT_CONFIGURED)
  ok('PRODUCTION CONNECTION NOT CONFIGURED when env missing')
}

// --- AUTH ---
{
  const unauth = createServerSecurityContextFromSession({
    authenticatedAccountId: '',
  })
  assert.equal(unauth.ok, false)
  ok('unauthenticated → DENY context')

  const owner = createServerSecurityContextFromSession({
    authenticatedAccountId: ACCOUNT_A,
  })
  assert.equal(owner.ok, true)
  if (owner.ok) {
    assert.equal(owner.context.authority, 'server')
    assert.equal(owner.context.actor.accountId, ACCOUNT_A)
  }
  ok('authenticated owner → ALLOW context')

  const forged = rejectForgedActorClaim(ACCOUNT_A, ACCOUNT_B)
  assert.ok(forged && forged.allowed === false)
  ok('forged accountId → DENY')

  const ownerSelf = createServerSecurityContextFromSession({
    authenticatedAccountId: 'owner_self',
  })
  assert.equal(ownerSelf.ok, false)
  ok('owner_self rejected as production authority')
}

// --- PET ---
{
  const ownerAllow = authorizePetServer({
    actorAccountId: ACCOUNT_A,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
  })
  assert.equal(ownerAllow.allowed, true)
  ok('pet owner access → ALLOW')

  const nonOwner = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
  })
  assert.equal(nonOwner.allowed, false)
  ok('non-owner → DENY')

  const cross = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.write',
    ownerAccountId: ACCOUNT_A,
  })
  assert.equal(cross.allowed, false)
  ok('cross-account → DENY')
}

// --- PROFESSIONAL ---
{
  const roleAlone = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
    activeMode: 'professional',
  })
  assert.equal(roleAlone.allowed, false)
  ok('professional role alone → DENY')

  const validGrant = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
    activeMode: 'professional',
    professional: {
      id: 'grant-1',
      professionalAccountId: ACCOUNT_B,
      permissions: ['viewHealth'],
      status: 'active',
    },
  })
  assert.equal(validGrant.allowed, true)
  ok('valid professional grant → ALLOW')

  const revoked = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
    activeMode: 'professional',
    professional: {
      id: 'grant-2',
      professionalAccountId: ACCOUNT_B,
      permissions: ['viewHealth'],
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    },
  })
  assert.equal(revoked.allowed, false)
  ok('revoked grant → DENY')

  const expired = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
    activeMode: 'professional',
    professional: {
      id: 'grant-3',
      professionalAccountId: ACCOUNT_B,
      permissions: ['viewHealth'],
      status: 'active',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    },
  })
  assert.equal(expired.allowed, false)
  ok('expired grant → DENY')
}

// --- ORGANIZATION ---
{
  const membershipAlone = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'health.read',
    ownerAccountId: ACCOUNT_A,
    activeMode: 'organization',
    orgMembershipOnly: true,
  })
  assert.equal(membershipAlone.allowed, false)
  ok('org membership alone → DENY clinical')
}

// --- MESSAGING ---
{
  const participant = authorizeMessagingParticipants({
    actorAccountId: ACCOUNT_A,
    participantAccountIds: [ACCOUNT_A, ACCOUNT_B],
  })
  assert.equal(participant.allowed, true)
  ok('messaging participant → ALLOW')

  const nonParticipant = authorizeMessagingParticipants({
    actorAccountId: ACCOUNT_A,
    participantAccountIds: [ACCOUNT_B, '33333333-3333-3333-3333-333333333333'],
  })
  assert.equal(nonParticipant.allowed, false)
  ok('messaging nonparticipant → DENY')

  const missing = authorizeMessagingParticipants({
    actorAccountId: ACCOUNT_A,
    participantAccountIds: null,
  })
  assert.equal(missing.allowed, false)
  ok('messaging missing participants → DENY')
}

// --- CLINICAL wired adapter ---
{
  const unwired = createServerClinicalPersistenceStub()
  assert.equal(unwired.wired, false)
  assert.throws(() => unwired.getHealthRecords(), (err: unknown) => {
    return err instanceof ClinicalError && err.code === 'SERVER_REQUIRED'
  })
  ok('unwired server clinical → SERVER_REQUIRED')

  const wired = createWiredServerClinicalPersistenceAdapter()
  assert.equal(wired.wired, true)
  wired.setHealthRecords([])
  assert.deepEqual(wired.getHealthRecords(), [])
  ok('wired server clinical CRUD memory → ALLOW')
}

// --- DOCUMENTS (authorize matrix) ---
{
  const denyDoc = authorizePetServer({
    actorAccountId: ACCOUNT_B,
    action: 'documents.write',
    ownerAccountId: ACCOUNT_A,
  })
  assert.equal(denyDoc.allowed, false)
  ok('unauthorized document upload → DENY')

  const allowDoc = authorizePetServer({
    actorAccountId: ACCOUNT_A,
    action: 'documents.read',
    ownerAccountId: ACCOUNT_A,
  })
  assert.equal(allowDoc.allowed, true)
  ok('authorized document download → ALLOW')
}

// --- IDEMPOTENCY ---
{
  const store = createServerIdempotencyStore({ forceWired: true })
  const scope = {
    actorAccountId: ACCOUNT_A,
    operation: 'clinical.createRecord',
    resourceRef: `pet:${PET_A}`,
  }
  const first = executeIdempotent({
    store,
    scope,
    clientKey: 'k1',
    fingerprintPayload: { a: 1 },
    run: () => ({ id: 'rec-1' }),
  })
  assert.equal(first.replayed, false)
  assert.deepEqual(first.value, { id: 'rec-1' })

  const replay = executeIdempotent({
    store,
    scope,
    clientKey: 'k1',
    fingerprintPayload: { a: 1 },
    run: () => ({ id: 'rec-SHOULD-NOT' }),
  })
  assert.equal(replay.replayed, true)
  assert.deepEqual(replay.value, { id: 'rec-1' })
  ok('idempotency replay → same result')

  assert.throws(
    () =>
      executeIdempotent({
        store,
        scope,
        clientKey: 'k1',
        fingerprintPayload: { a: 2 },
        run: () => ({ id: 'x' }),
      }),
    (err: unknown) => err instanceof IdempotencyError && err.code === 'IDEMPOTENCY_CONFLICT',
  )
  ok('idempotency conflicting fingerprint → conflict')
}

// --- PUBLIC ---
{
  assertPublicProjectionSafe({ name: 'Rex', type: 'dog' })
  assert.throws(() => assertPublicProjectionSafe({ name: 'Rex', microchip: '123' }))
  assert.ok(PUBLIC_FORBIDDEN_KEYS.includes('storageKey'))
  ok('public forbidden keys absent / enforced')
}

// --- authorize() with server context + forged claim ---
{
  const session = createServerSecurityContextFromSession({
    authenticatedAccountId: ACCOUNT_A,
    claimedActorAccountId: ACCOUNT_B,
  })
  assert.equal(session.ok, true)
  if (session.ok) {
    const decision = authorize(session.context, {
      action: 'health.read',
      resource: { type: 'pet', id: PET_A },
      claimedActorAccountId: ACCOUNT_B,
    }, {
      store: {
        getPet: () => ({
          id: PET_A,
          name: 'A',
          type: 'dog',
          ownerAccountId: ACCOUNT_A,
        }) as never,
      },
    })
    assert.equal(decision.allowed, false)
    ok('authorize() forged claim → DENY')
  }
}

// --- createAppSecurityContext without env uses DEMO path ---
{
  // Without vite env, production gate is false → DEMO adapter
  const demo = createAppSecurityContext({ claimedActorAccountId: 'forged' })
  // May be unauthenticated if no demo session in node — still must not use server owner_self
  assert.ok(demo.context.authority === 'demo' || demo.ok === false)
  ok('app security context respects DEMO when not configured')
}

// --- server clinical service factory ---
{
  const adapter = createWiredServerClinicalPersistenceAdapter()
  const service = createServerClinicalService(adapter)
  assert.equal(service.authority, 'server')
  ok('createServerClinicalService with wired adapter')
}

console.log(`\nLAUNCH 02 asserts passed: ${passed}`)
