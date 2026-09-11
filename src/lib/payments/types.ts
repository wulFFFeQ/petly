/**
 * Booking payment layer — separate from Booking lifecycle and Membership billing.
 * Payment records are the source of truth for financial state.
 */

export type PaymentType = 'full' | 'deposit' | 'cancellation_fee' | 'refund'

export const PAYMENT_TYPES: PaymentType[] = [
  'full',
  'deposit',
  'cancellation_fee',
  'refund',
]

/**
 * Never use "completed" here — that belongs to Booking.
 */
export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'authorized',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
]

/** BOOKING_PAYMENT now; MEMBERSHIP_PAYMENT reserved — do not wire. */
export type PaymentPurpose = 'BOOKING_PAYMENT' | 'MEMBERSHIP_PAYMENT'

export type PaymentProviderId = 'demo' | 'stripe' | 'none'

/**
 * How the professional expects payment for a service.
 * Default: pay_on_site (no online payment intent).
 */
export type ServicePaymentCollection = 'pay_on_site' | 'deposit' | 'full_prepay'

export const SERVICE_PAYMENT_COLLECTIONS: ServicePaymentCollection[] = [
  'pay_on_site',
  'deposit',
  'full_prepay',
]

export type DepositType = 'fixed' | 'percentage'

export const DEPOSIT_TYPES: DepositType[] = ['fixed', 'percentage']

/**
 * Derived from Payment records — never stored as an independent Booking field.
 * DEMO without a real provider must not report `paid`.
 */
export type BookingPaymentSummary =
  | 'unpaid'
  | 'deposit_pending'
  | 'partially_paid'
  | 'paid'
  | 'refund_pending'
  | 'refunded'

export interface Payment {
  id: string
  bookingId: string
  ownerAccountId: string
  professionalId: string
  /** Integer in smallest currency unit (e.g. haléře for CZK). */
  amountMinor: number
  currency: string
  paymentType: PaymentType
  status: PaymentStatus
  purpose: PaymentPurpose
  provider?: PaymentProviderId
  providerPaymentId?: string
  /** Explicit DEMO marker — never present as a trust badge. */
  isDemoPayment: boolean
  /** Snapshot at intent time — reuse booking snapshots; never live service price. */
  serviceNameSnapshot?: string
  /** Major units (koruny) copied from booking.priceSnapshot at intent time. */
  priceSnapshotMajor?: number
  currencySnapshot?: string
  /** Audit link: refund Payment points at original Payment. */
  refundOfPaymentId?: string
  createdAt: string
  updatedAt: string
}

/** Public-safe projection — no provider IDs, account internals, or payment methods. */
export interface PublicPayment {
  id: string
  bookingId: string
  amountMinor: number
  currency: string
  paymentType: PaymentType
  status: PaymentStatus
  purpose: PaymentPurpose
  isDemoPayment: boolean
  serviceNameSnapshot?: string
  createdAt: string
  updatedAt: string
}

export type PaymentErrorCode =
  | 'not_found'
  | 'forbidden'
  | 'invalid_input'
  | 'demo_only'
  | 'not_implemented'
  | 'provider_inactive'
  | 'booking_not_found'

export type PaymentResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PaymentErrorCode; message: string }

export type CreatePaymentIntentInput = {
  bookingId: string
  ownerAccountId: string
  professionalId: string
  amountMinor: number
  currency?: string
  paymentType: PaymentType
  serviceNameSnapshot?: string
  priceSnapshotMajor?: number
  currencySnapshot?: string
  isDemoPayment?: boolean
}

export type CancellationFeeResult = {
  amountMinor: number
  currency: string
  reason: 'provider_inactive' | 'policy' | 'none'
}
