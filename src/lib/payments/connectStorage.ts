/**
 * localStorage for ProfessionalPaymentAccount — never on ProfessionalProfile.
 */

import {
  PROFESSIONAL_PAYMENT_ACCOUNT_STATUSES,
  type ProfessionalPaymentAccount,
  type ProfessionalPaymentAccountProvider,
  type ProfessionalPaymentAccountStatus,
} from './connectTypes'

export const PROFESSIONAL_PAYMENT_ACCOUNTS_STORAGE_KEY =
  'lovedandknown.professional_payment_accounts'

const STATUS_SET = new Set<string>(PROFESSIONAL_PAYMENT_ACCOUNT_STATUSES)
const PROVIDER_SET = new Set<string>(['stripe', 'demo'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function createProfessionalPaymentAccountId(prefix = 'ppa'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function normalizeProfessionalPaymentAccount(
  raw: unknown,
): ProfessionalPaymentAccount | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const professionalId = asString(raw.professionalId)
  const provider = asString(raw.provider)
  const status = asString(raw.status)
  if (
    !id ||
    !professionalId ||
    !provider ||
    !PROVIDER_SET.has(provider) ||
    !status ||
    !STATUS_SET.has(status)
  ) {
    return null
  }

  const createdAt = asString(raw.createdAt) ?? new Date(0).toISOString()
  const updatedAt = asString(raw.updatedAt) ?? createdAt

  const account: ProfessionalPaymentAccount = {
    id,
    professionalId,
    provider: provider as ProfessionalPaymentAccountProvider,
    status: status as ProfessionalPaymentAccountStatus,
    chargesEnabled: asBool(raw.chargesEnabled, false),
    payoutsEnabled: asBool(raw.payoutsEnabled, false),
    detailsSubmitted: asBool(raw.detailsSubmitted, false),
    createdAt,
    updatedAt,
  }

  const providerAccountId = asString(raw.providerAccountId)
  if (providerAccountId) {
    account.providerAccountId = providerAccountId
  }

  return account
}

export function loadProfessionalPaymentAccounts(): ProfessionalPaymentAccount[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(PROFESSIONAL_PAYMENT_ACCOUNTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeProfessionalPaymentAccount)
      .filter((a): a is ProfessionalPaymentAccount => Boolean(a))
  } catch {
    return []
  }
}

export function saveProfessionalPaymentAccounts(
  accounts: ProfessionalPaymentAccount[],
): void {
  if (typeof localStorage === 'undefined') return
  const cleaned = accounts
    .map((a) => normalizeProfessionalPaymentAccount(a))
    .filter((a): a is ProfessionalPaymentAccount => Boolean(a))
  localStorage.setItem(
    PROFESSIONAL_PAYMENT_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(cleaned),
  )
}

export function upsertProfessionalPaymentAccount(
  account: ProfessionalPaymentAccount,
): ProfessionalPaymentAccount {
  const all = loadProfessionalPaymentAccounts()
  const normalized = normalizeProfessionalPaymentAccount(account)
  if (!normalized) {
    throw new Error('Invalid ProfessionalPaymentAccount')
  }
  const idx = all.findIndex((a) => a.id === normalized.id)
  if (idx >= 0) {
    all[idx] = normalized
  } else {
    all.push(normalized)
  }
  saveProfessionalPaymentAccounts(all)
  return normalized
}

export function clearProfessionalPaymentAccounts(): void {
  saveProfessionalPaymentAccounts([])
}
