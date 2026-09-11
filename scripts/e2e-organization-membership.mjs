/**
 * E2E: Organization + Membership (K42)
 * Run: node scripts/e2e-organization-membership.mjs
 * Requires: npm run dev
 *
 * Uses harness-only second account in localStorage (not production seed).
 * Multi-account steps run via in-page domain API when DEMO has a single session.
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = path.join(process.cwd(), 'scripts', 'e2e-artifacts')
const failures = []

function assert(cond, msg) {
  if (!cond) {
    failures.push(msg)
    console.error('FAIL:', msg)
  } else {
    console.log('OK  :', msg)
  }
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({
    path: path.join(OUT, `org-membership-${name}.png`),
    fullPage: false,
  })
}

const SECOND_ACCOUNT = {
  id: 'acct_e2e_org_invitee',
  kind: 'consumer',
  roles: ['owner'],
  displayName: 'E2E Invitee',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })

    // A. DEMO login + professional seed for workspace access
    await page.evaluate((second) => {
      localStorage.setItem('lovedandknown.sessionActive', 'true')
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      const accounts = [
        {
          id: 'owner_self',
          kind: 'professional',
          roles: ['owner', 'veterinarian'],
          displayName: 'Tereza',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        second,
      ]
      localStorage.setItem('lovedandknown.accounts', JSON.stringify(accounts))
      localStorage.setItem(
        'lovedandknown.professionalProfiles',
        JSON.stringify([
          {
            id: 'pro_e2e_org',
            accountId: 'owner_self',
            type: 'veterinarian',
            displayName: 'Dr. Org E2E',
            verificationStatus: 'unverified',
            publicVisibility: 'private',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      )
      localStorage.setItem('lovedandknown.organizations', JSON.stringify([]))
      localStorage.setItem('lovedandknown.organizationMemberships', JSON.stringify([]))
      localStorage.setItem('lovedandknown.uiWorkspace', JSON.stringify('professional'))
    }, SECOND_ACCOUNT)

    await page.goto(`${BASE}/professional/organizations`, { waitUntil: 'networkidle' })
    await shot(page, 'a-list')
    assert(
      (await page.getByTestId('professional-organizations-page').count()) > 0,
      'A. signed-in DEMO account sees organizations page',
    )

    // B–D. create + private + show
    await page.getByTestId('org-create-toggle').click()
    await page.getByTestId('org-create-name').fill('E2E Klinika')
    await page.getByTestId('org-create-type').selectOption('veterinary_clinic')
    await page.getByTestId('org-create-submit').click()
    await page.waitForTimeout(300)

    const orgId = await page.evaluate(() => {
      const orgs = JSON.parse(localStorage.getItem('lovedandknown.organizations') || '[]')
      return orgs.find((o) => o.displayName === 'E2E Klinika' || o.name === 'E2E Klinika')?.id
    })
    assert(Boolean(orgId), 'B. Organization created')

    const visibility = await page.evaluate((id) => {
      const orgs = JSON.parse(localStorage.getItem('lovedandknown.organizations') || '[]')
      return orgs.find((o) => o.id === id)?.publicVisibility
    }, orgId)
    assert(visibility === 'private', 'C. Organization default private')

    await page.goto(`${BASE}/professional/organizations/${orgId}`, {
      waitUntil: 'networkidle',
    })
    await shot(page, 'd-detail')
    assert(
      (await page.getByTestId('professional-organization-detail').count()) > 0,
      'D. Organization detail visible',
    )
    assert(
      (await page.getByTestId('org-detail-visibility').innerText()).includes('private'),
      'D. Detail shows private visibility',
    )

    // E–H. invite + accept via domain (second account)
    const flow = await page.evaluate(async ({ orgId: oid, inviteeId }) => {
      const mod = await import('/src/lib/organization/index.ts')
      const invite = mod.inviteOrganizationMember({
        organizationId: oid,
        actorAccountId: 'owner_self',
        inviteeAccountId: inviteeId,
        role: 'staff',
      })
      const invitedOk = invite.status === 'invited'
      const accepted = mod.acceptOrganizationInvitation(invite.id, inviteeId)
      return {
        invitedOk,
        inviteId: invite.id,
        acceptedStatus: accepted.status,
        membershipId: accepted.id,
      }
    }, { orgId, inviteeId: SECOND_ACCOUNT.id })

    assert(flow.invitedOk, 'E–F. Invitation exists (invited)')
    assert(flow.acceptedStatus === 'active', 'G–H. Second account accepted → active')

    // I. owner changes role
    const roleChanged = await page.evaluate(async ({ orgId: oid, membershipId }) => {
      const mod = await import('/src/lib/organization/index.ts')
      const updated = mod.updateOrganizationMemberRole(
        oid,
        'owner_self',
        membershipId,
        'professional',
      )
      return updated.role
    }, { orgId, membershipId: flow.membershipId })
    assert(roleChanged === 'professional', 'I. Owner changed role')

    // J–K. suspend → mutation denied
    const afterSuspend = await page.evaluate(async ({ orgId: oid, membershipId }) => {
      const mod = await import('/src/lib/organization/index.ts')
      mod.suspendOrganizationMember(oid, 'owner_self', membershipId)
      let denied = false
      try {
        mod.assertCanManageOrganizationMembers(
          mod.loadOrganizationMemberships(),
          mod.getOrganizationById(oid),
          'acct_e2e_org_invitee',
        )
      } catch {
        denied = true
      }
      // also: suspended cannot be treated as effective member for mutations as invitee
      let memberDenied = false
      try {
        mod.assertOrganizationMember(
          mod.loadOrganizationMemberships(),
          oid,
          'acct_e2e_org_invitee',
        )
      } catch {
        memberDenied = true
      }
      return { denied: denied && memberDenied }
    }, { orgId, membershipId: flow.membershipId })
    assert(afterSuspend.denied, 'J–K. Suspended member mutations rejected')

    // L–M. remove → mutation denied
    // re-invite after suspend for remove path
    const removeFlow = await page.evaluate(async ({ orgId: oid, inviteeId }) => {
      const mod = await import('/src/lib/organization/index.ts')
      // suspended row still open? status suspended — not open; can invite again
      const invite = mod.inviteOrganizationMember({
        organizationId: oid,
        actorAccountId: 'owner_self',
        inviteeAccountId: inviteeId,
        role: 'staff',
      })
      const active = mod.acceptOrganizationInvitation(invite.id, inviteeId)
      mod.removeOrganizationMember(oid, 'owner_self', active.id)
      let denied = false
      try {
        mod.assertOrganizationMember(mod.loadOrganizationMemberships(), oid, inviteeId)
      } catch {
        denied = true
      }
      return { denied, membershipId: active.id }
    }, { orgId, inviteeId: SECOND_ACCOUNT.id })
    assert(removeFlow.denied, 'L–M. Removed member mutation rejected')

    // N. owner protected
    const ownerProtected = await page.evaluate(async (oid) => {
      const mod = await import('/src/lib/organization/index.ts')
      const owners = mod.listActiveOwners(mod.loadOrganizationMemberships(), oid)
      if (owners.length !== 1) return { ok: false, reason: 'expected 1 owner' }
      let denied = false
      try {
        mod.removeOrganizationMember(oid, 'owner_self', owners[0].id)
      } catch {
        denied = true
      }
      return { ok: denied }
    }, orgId)
    assert(ownerProtected.ok, 'N. Owner remains protected')

    // O. other Organization isolated
    const isolated = await page.evaluate(async () => {
      const mod = await import('/src/lib/organization/index.ts')
      const { organization: other } = mod.createOrganization({
        actorAccountId: 'owner_self',
        displayName: 'Other Org',
        organizationType: 'shelter',
      })
      let denied = false
      try {
        mod.assertOrganizationMember(
          mod.loadOrganizationMemberships(),
          other.id,
          'acct_e2e_org_invitee',
        )
      } catch {
        denied = true
      }
      // invitee must not manage other via forged id of first org either
      return { denied, otherId: other.id }
    })
    assert(isolated.denied, 'O. Other Organization is isolated')

    await shot(page, 'final')
  } catch (err) {
    failures.push(String(err))
    console.error(err)
    await shot(page, 'error').catch(() => {})
  } finally {
    await browser.close()
  }

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nE2E organization membership: all passed')
}

main()
