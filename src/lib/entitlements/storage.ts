import { SELF_OWNER_ID } from '../discover/owner'
import { isPlanId } from './plans'
import {
  PLAN_IDS,
  SUBSCRIPTION_PROVIDERS,
  SUBSCRIPTION_STATUSES,
  type PlanId,
  type SubscriptionProvider,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from './types'

export const SUBSCRIPTION_STORAGE_KEY = 'lovedandknown.subscription'

const PLAN_SET = new Set<string>(PLAN_IDS)
const STATUS_SET = new Set<string>(SUBSCRIPTION_STATUSES)
const PROVIDER_SET = new Set<string>(SUBSCRIPTION_PROVIDERS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function createDefaultSubscription(
  accountId: string = SELF_OWNER_ID,
  now: string = new Date().toISOString(),
): SubscriptionRecord {
  return {
    accountId,
    plan: 'free',
    status: 'none',
    provider: 'none',
    updatedAt: now,
  }
}

export function normalizeSubscription(raw: unknown): SubscriptionRecord {
  if (!isRecord(raw)) return createDefaultSubscription()

  const accountId =
    typeof raw.accountId === 'string' && raw.accountId.trim()
      ? raw.accountId.trim()
      : SELF_OWNER_ID

  const plan: PlanId =
    typeof raw.plan === 'string' && PLAN_SET.has(raw.plan) && isPlanId(raw.plan)
      ? raw.plan
      : 'free'

  const status: SubscriptionStatus =
    typeof raw.status === 'string' && STATUS_SET.has(raw.status)
      ? (raw.status as SubscriptionStatus)
      : 'none'

  const provider: SubscriptionProvider =
    typeof raw.provider === 'string' && PROVIDER_SET.has(raw.provider)
      ? (raw.provider as SubscriptionProvider)
      : 'none'

  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
      ? raw.updatedAt.trim()
      : new Date(0).toISOString()

  const sub: SubscriptionRecord = {
    accountId,
    plan,
    status,
    provider,
    updatedAt,
  }

  if (typeof raw.startedAt === 'string' && raw.startedAt.trim()) {
    sub.startedAt = raw.startedAt.trim()
  }
  if (typeof raw.expiresAt === 'string' && raw.expiresAt.trim()) {
    sub.expiresAt = raw.expiresAt.trim()
  }
  if (typeof raw.providerCustomerId === 'string' && raw.providerCustomerId.trim()) {
    sub.providerCustomerId = raw.providerCustomerId.trim()
  }

  return sub
}

export function loadSubscription(): SubscriptionRecord {
  if (typeof localStorage === 'undefined') return createDefaultSubscription()
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY)
    if (!raw) return createDefaultSubscription()
    return normalizeSubscription(JSON.parse(raw) as unknown)
  } catch {
    return createDefaultSubscription()
  }
}

export function saveSubscription(record: SubscriptionRecord): SubscriptionRecord {
  const normalized = normalizeSubscription({
    ...record,
    updatedAt: new Date().toISOString(),
  })
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(normalized))
    } catch {
      // ignore quota / private mode
    }
  }
  return normalized
}
