import { SELF_OWNER_ID } from '../discover/owner'
import {
  clearDemoPlan,
  createDefaultSubscription,
  isPlanId,
  loadSubscription,
  saveSubscription,
  setDemoPlan,
  type PlanId,
  type SubscriptionRecord,
} from '../entitlements'
import type { SubscriptionProvider } from './provider'
import type {
  BillingError,
  BillingPortalResult,
  BillingResult,
  CancelSubscriptionRequest,
  ChangePlanRequest,
  CheckoutSessionRequest,
  CheckoutSessionResult,
  ResumeSubscriptionRequest,
} from './types'

const DEMO_NO_PAYMENTS =
  'DEMO režim — skutečné platby nejsou napojené. Žádný checkout ani potvrzení platby.'

function demoOnly(message: string = DEMO_NO_PAYMENTS): BillingError {
  return { ok: false, code: 'demo_only', message }
}

function forAccount(accountId: string): SubscriptionRecord {
  const sub = loadSubscription()
  if (sub.accountId && sub.accountId !== accountId && accountId !== SELF_OWNER_ID) {
    return createDefaultSubscription(accountId)
  }
  return sub
}

/**
 * Local DEMO provider — no Stripe, no fake payment confirmation, no card data.
 * changePlan with demo:true switches local DEMO entitlement plan only.
 */
export class DemoSubscriptionProvider implements SubscriptionProvider {
  async getSubscription(
    accountId: string,
  ): Promise<BillingResult<{ subscription: SubscriptionRecord }>> {
    return { ok: true, subscription: forAccount(accountId) }
  }

  async createCheckoutSession(
    _request: CheckoutSessionRequest,
  ): Promise<BillingResult<CheckoutSessionResult>> {
    return demoOnly()
  }

  async changePlan(
    request: ChangePlanRequest,
  ): Promise<BillingResult<{ subscription: SubscriptionRecord }>> {
    if (!isPlanId(request.plan)) {
      return { ok: false, code: 'invalid_plan', message: 'Neznámý plán.' }
    }
    if (!request.demo) {
      return demoOnly(
        'Změna tarifu přes platbu zatím není dostupná. Použijte DEMO přepínač pro testování.',
      )
    }
    const plan = request.plan as PlanId
    if (plan === 'free') {
      return { ok: true, subscription: clearDemoPlan(request.accountId) }
    }
    return { ok: true, subscription: setDemoPlan(plan, request.accountId) }
  }

  async cancelSubscription(
    request: CancelSubscriptionRequest,
  ): Promise<BillingResult<{ subscription: SubscriptionRecord }>> {
    const current = forAccount(request.accountId)
    if (current.status === 'none' && current.plan === 'free') {
      return {
        ok: false,
        code: 'no_subscription',
        message: 'Není co zrušit — účet je na Free.',
      }
    }
    // DEMO never looks paid — cancel clears DEMO switch.
    if (current.status === 'demo' || current.provider === 'demo') {
      return { ok: true, subscription: clearDemoPlan(request.accountId) }
    }
    const now = new Date().toISOString()
    const expiresAt =
      request.atPeriodEnd && current.expiresAt ? current.expiresAt : now
    return {
      ok: true,
      subscription: saveSubscription({
        ...current,
        status: 'canceled',
        expiresAt,
        updatedAt: now,
      }),
    }
  }

  async resumeSubscription(
    _request: ResumeSubscriptionRequest,
  ): Promise<BillingResult<{ subscription: SubscriptionRecord }>> {
    return demoOnly('Obnovení předplatného vyžaduje budoucí platební provider.')
  }

  async getBillingPortal(
    _accountId: string,
  ): Promise<BillingResult<BillingPortalResult>> {
    return demoOnly('Billing portál bude dostupný po napojení platebního provideru.')
  }
}
