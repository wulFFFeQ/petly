import { SELF_OWNER_ID } from '../discover/owner'
import { isPlanId } from './plans'
import {
  createDefaultSubscription,
  loadSubscription,
  saveSubscription,
} from './storage'
import type { PlanId, SubscriptionRecord } from './types'

/**
 * DEMO plan switch — clearly marked, never a real payment.
 * Sets provider:'demo' and status:'demo'.
 */
export function setDemoPlan(
  plan: PlanId,
  accountId: string = SELF_OWNER_ID,
): SubscriptionRecord {
  if (!isPlanId(plan)) {
    return clearDemoPlan(accountId)
  }
  const now = new Date().toISOString()
  if (plan === 'free') {
    return saveSubscription({
      accountId,
      plan: 'free',
      status: 'demo',
      provider: 'demo',
      startedAt: now,
      updatedAt: now,
    })
  }
  return saveSubscription({
    accountId,
    plan,
    status: 'demo',
    provider: 'demo',
    startedAt: now,
    updatedAt: now,
  })
}

/** Reset to default Free — no DEMO, no paid claims. */
export function clearDemoPlan(
  accountId: string = SELF_OWNER_ID,
): SubscriptionRecord {
  return saveSubscription(createDefaultSubscription(accountId))
}

export function isDemoSubscription(sub: SubscriptionRecord): boolean {
  return sub.status === 'demo' || sub.provider === 'demo'
}

/** Current subscription from storage (convenience for DEMO UI). */
export function loadOrInitSubscription(): SubscriptionRecord {
  return loadSubscription()
}
