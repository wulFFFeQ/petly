/**
 * CRUD + lifecycle for ProfessionalPaymentAccount.
 * DEMO never claims real Stripe verification.
 */

import type {
  ProfessionalPaymentAccount,
  PublicProfessionalPaymentAccount,
} from './connectTypes'
import {
  createProfessionalPaymentAccountId,
  loadProfessionalPaymentAccounts,
  upsertProfessionalPaymentAccount,
} from './connectStorage'
import type { PaymentResult } from './types'

export function toPublicProfessionalPaymentAccount(
  account: ProfessionalPaymentAccount,
): PublicProfessionalPaymentAccount {
  return {
    id: account.id,
    professionalId: account.professionalId,
    provider: account.provider,
    status: account.status,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    detailsSubmitted: account.detailsSubmitted,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

export function getProfessionalPaymentAccount(
  accountId: string,
): ProfessionalPaymentAccount | null {
  return loadProfessionalPaymentAccounts().find((a) => a.id === accountId) ?? null
}

export function getProfessionalPaymentAccountByProfessional(
  professionalId: string,
): ProfessionalPaymentAccount | null {
  return (
    loadProfessionalPaymentAccounts().find((a) => a.professionalId === professionalId) ??
    null
  )
}

export function listProfessionalPaymentAccounts(
  professionalId?: string,
): ProfessionalPaymentAccount[] {
  const all = loadProfessionalPaymentAccounts()
  if (!professionalId) return all
  return all.filter((a) => a.professionalId === professionalId)
}

/**
 * Ensure a DEMO shell account exists for a professional.
 * Always not_started / charges+payouts disabled — never "Stripe connected".
 */
export function ensureDemoProfessionalPaymentAccount(
  professionalId: string,
): ProfessionalPaymentAccount {
  const existing = getProfessionalPaymentAccountByProfessional(professionalId)
  if (existing) return existing

  const now = new Date().toISOString()
  return upsertProfessionalPaymentAccount({
    id: createProfessionalPaymentAccountId('ppa'),
    professionalId,
    provider: 'demo',
    status: 'not_started',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Domain helper — creates local DEMO account record only.
 * Does not call Stripe; does not set chargesEnabled.
 */
export function createLocalConnectedAccountRecord(
  professionalId: string,
  opts?: { provider?: 'demo' | 'stripe' },
): PaymentResult<ProfessionalPaymentAccount> {
  if (!professionalId.trim()) {
    return { ok: false, error: 'invalid_input', message: 'Chybí professionalId.' }
  }
  const existing = getProfessionalPaymentAccountByProfessional(professionalId)
  if (existing) {
    return { ok: true, value: existing }
  }
  const now = new Date().toISOString()
  const provider = opts?.provider ?? 'demo'
  const account = upsertProfessionalPaymentAccount({
    id: createProfessionalPaymentAccountId('ppa'),
    professionalId,
    provider,
    status: 'not_started',
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    createdAt: now,
    updatedAt: now,
  })
  return { ok: true, value: account }
}

export function isStripeConnectReady(account: ProfessionalPaymentAccount | null): boolean {
  if (!account) return false
  if (account.provider === 'demo') return false
  return (
    account.status === 'active' &&
    account.chargesEnabled &&
    account.payoutsEnabled &&
    account.detailsSubmitted
  )
}
