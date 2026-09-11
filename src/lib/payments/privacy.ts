import type { Payment, PublicPayment } from './types'
import type {
  ProfessionalPaymentAccount,
  PublicProfessionalPaymentAccount,
} from './connectTypes'

/** Keys that must never appear on a public payment projection. */
export const FORBIDDEN_PAYMENT_PUBLIC_KEYS = [
  'providerPaymentId',
  'providerAccountId',
  'providerPayoutId',
  'providerEventId',
  'ownerAccountId',
  'accountId',
  'paymentMethod',
  'cardNumber',
  'card',
  'cvv',
  'cvc',
  'iban',
  'bankAccount',
  'bankCredentials',
  'billing',
  'billingIdentifier',
  'clientSecret',
  'stripeCustomerId',
  'stripeAccountId',
  'stripeSecretKey',
  'webhookSecret',
  'raw',
  'metadata',
] as const

export function isSafePaymentPayload(payload: unknown): boolean {
  if (payload == null) return true
  if (typeof payload !== 'object') {
    const text = String(payload)
    return !FORBIDDEN_PAYMENT_PUBLIC_KEYS.some((k) =>
      text.toLowerCase().includes(k.toLowerCase()),
    )
  }
  const keys = Object.keys(payload as object)
  for (const forbidden of FORBIDDEN_PAYMENT_PUBLIC_KEYS) {
    if (keys.includes(forbidden)) return false
  }
  return true
}

export function assertPaymentPayloadSafe(payload: unknown): boolean {
  return isSafePaymentPayload(payload)
}

export function toPublicPayment(payment: Payment): PublicPayment {
  const pub: PublicPayment = {
    id: payment.id,
    bookingId: payment.bookingId,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    paymentType: payment.paymentType,
    status: payment.status,
    purpose: payment.purpose,
    isDemoPayment: payment.isDemoPayment,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  }
  if (payment.serviceNameSnapshot) {
    pub.serviceNameSnapshot = payment.serviceNameSnapshot
  }
  return pub
}

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

/** Never store card / CVV / full bank details / Stripe secrets on Payment records. */
export function assertNoSensitivePaymentData(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return true
  const keys = Object.keys(raw as object).map((k) => k.toLowerCase())
  const banned = [
    'cardnumber',
    'cvv',
    'cvc',
    'iban',
    'pan',
    'expirymonth',
    'expiryyear',
    'stripesecret',
    'webhooksecret',
    'sk_live',
    'sk_test',
    'whsec_',
    'bankcredentials',
  ]
  return !banned.some((b) => keys.some((k) => k.includes(b)))
}
