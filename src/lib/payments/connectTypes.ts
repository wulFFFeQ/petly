/**
 * Stripe Connect / ProfessionalPaymentAccount types.
 * ProfessionalProfile ≠ PaymentAccount — stripeAccountId must never live on the profile.
 */

export type ProfessionalPaymentAccountStatus =
  | 'not_started'
  | 'onboarding'
  | 'restricted'
  | 'active'
  | 'disabled'

export const PROFESSIONAL_PAYMENT_ACCOUNT_STATUSES: ProfessionalPaymentAccountStatus[] = [
  'not_started',
  'onboarding',
  'restricted',
  'active',
  'disabled',
]

/** DEMO may use `demo`; production Connect uses `stripe`. Never pretend demo is verified Stripe. */
export type ProfessionalPaymentAccountProvider = 'stripe' | 'demo'

export interface ProfessionalPaymentAccount {
  id: string
  professionalId: string
  provider: ProfessionalPaymentAccountProvider
  /** Stripe acct_… in production only. DEMO: omit or demo_* without claiming verification. */
  providerAccountId?: string
  status: ProfessionalPaymentAccountStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  createdAt: string
  updatedAt: string
}

/** Public-safe projection — no provider account IDs. */
export interface PublicProfessionalPaymentAccount {
  id: string
  professionalId: string
  provider: ProfessionalPaymentAccountProvider
  status: ProfessionalPaymentAccountStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  createdAt: string
  updatedAt: string
}

export type ChargePattern = 'destination_charge' | 'separate_charge_and_transfer'

export const DEFAULT_CHARGE_PATTERN: ChargePattern = 'destination_charge'

export type CheckoutSessionMode = 'demo_preparing' | 'live'

export interface CheckoutSessionResult {
  paymentId: string
  mode: CheckoutSessionMode
  /** Never a fake Stripe URL in DEMO. */
  url?: string
  message: string
}

export type OnboardingLinkMode = 'demo_preparing' | 'live'

export interface OnboardingLinkResult {
  mode: OnboardingLinkMode
  /** Never a fake Stripe URL in DEMO. */
  url?: string
  expiresAt?: string
  message: string
}

export interface LoginLinkResult {
  mode: OnboardingLinkMode
  url?: string
  message: string
}

export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled'

export const PAYOUT_STATUSES: PayoutStatus[] = [
  'pending',
  'in_transit',
  'paid',
  'failed',
  'cancelled',
]

/**
 * Professional payout — separate from customer Payment.
 * Payment.status = paid does NOT imply PayoutStatus = paid.
 */
export interface PaymentPayout {
  id: string
  paymentId: string
  professionalId: string
  /** Usually equals Payment.professionalAmountMinor. */
  amountMinor: number
  currency: string
  status: PayoutStatus
  provider?: 'demo' | 'stripe' | 'none'
  providerPayoutId?: string
  isDemoPayout: boolean
  createdAt: string
  updatedAt: string
}

export interface PaymentRouting {
  amountMinor: number
  platformFeeMinor: number
  professionalAmountMinor: number
  chargePattern: ChargePattern
  currency: string
}

/** Future refund reverse plan — no Stripe calls yet. */
export interface RefundRoutingPlan {
  refundCustomerMinor: number
  reversePlatformFeeMinor: number
  reverseProfessionalTransferMinor: number
}
