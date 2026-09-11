import type { Account } from '../../types/professional'
import { loadAccounts, saveAccounts } from '../professional/storage'

/** DEMO household member accounts for grant picker — never invent ownership. */
export const DEMO_HOUSEHOLD_ACCOUNTS: Array<Pick<Account, 'id' | 'displayName'> & { kind: 'consumer' }> = [
  { id: 'acct_petr', displayName: 'Petr', kind: 'consumer' },
  { id: 'acct_anna', displayName: 'Anna', kind: 'consumer' },
  { id: 'acct_bara', displayName: 'Bára', kind: 'consumer' },
]

/**
 * Ensure DEMO household accounts exist in lovedandknown.accounts.
 * Does not grant pet access, membership, or professional identity.
 */
export function ensureDemoHouseholdAccounts(): Account[] {
  const existing = loadAccounts()
  const byId = new Map(existing.map((a) => [a.id, a]))
  const now = new Date().toISOString()
  let changed = false

  for (const demo of DEMO_HOUSEHOLD_ACCOUNTS) {
    if (byId.has(demo.id)) continue
    const account: Account = {
      id: demo.id,
      kind: 'consumer',
      roles: ['owner'],
      displayName: demo.displayName,
      createdAt: now,
      updatedAt: now,
    }
    byId.set(account.id, account)
    changed = true
  }

  const next = Array.from(byId.values())
  if (changed) saveAccounts(next)
  return next
}
