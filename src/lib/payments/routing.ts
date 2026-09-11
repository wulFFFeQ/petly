/**
 * Payment routing — platform fee + professional amount.
 * Integer minor units only; never floating point money math.
 *
 * Default charge pattern: destination_charge (application_fee = platformFeeMinor).
 * separate_charge_and_transfer is modeled but not implemented against Stripe yet.
 */

import { assertAmountMinor, DEFAULT_CURRENCY, normalizeCurrency } from './money'
import {
  DEFAULT_CHARGE_PATTERN,
  type ChargePattern,
  type PaymentRouting,
  type RefundRoutingPlan,
} from './connectTypes'

/** Default platform fee: 10% = 1000 basis points. */
export const DEFAULT_PLATFORM_FEE_BPS = 1000

export type RoutingFeeInput =
  | { feeBps: number; feeMinor?: never }
  | { feeMinor: number; feeBps?: never }
  | { feeBps?: undefined; feeMinor?: undefined }

export function calculatePlatformFeeMinor(
  amountMinor: number,
  fee: RoutingFeeInput = {},
): number {
  if (!assertAmountMinor(amountMinor)) {
    throw new Error('amountMinor must be a non-negative integer')
  }
  if (fee.feeMinor !== undefined) {
    if (!assertAmountMinor(fee.feeMinor)) {
      throw new Error('feeMinor must be a non-negative integer')
    }
    return Math.min(fee.feeMinor, amountMinor)
  }
  const bps = fee.feeBps ?? DEFAULT_PLATFORM_FEE_BPS
  if (!Number.isInteger(bps) || bps < 0) {
    throw new Error('feeBps must be a non-negative integer')
  }
  // Integer division: floor((amount * bps) / 10000)
  return Math.floor((amountMinor * bps) / 10000)
}

export function calculatePaymentRouting(
  amountMinor: number,
  opts?: RoutingFeeInput & {
    currency?: string
    chargePattern?: ChargePattern
  },
): PaymentRouting {
  if (!assertAmountMinor(amountMinor)) {
    throw new Error('amountMinor must be a non-negative integer')
  }
  const platformFeeMinor = calculatePlatformFeeMinor(amountMinor, opts ?? {})
  const professionalAmountMinor = amountMinor - platformFeeMinor
  if (!assertAmountMinor(professionalAmountMinor)) {
    throw new Error('Invalid professional amount')
  }
  return {
    amountMinor,
    platformFeeMinor,
    professionalAmountMinor,
    chargePattern: opts?.chargePattern ?? DEFAULT_CHARGE_PATTERN,
    currency: normalizeCurrency(opts?.currency ?? DEFAULT_CURRENCY),
  }
}

/**
 * Plan refund reverse amounts (customer / platform fee / professional transfer).
 * Proportional to original routing when partial; no Stripe calls.
 */
export function planRefundRouting(
  original: Pick<PaymentRouting, 'amountMinor' | 'platformFeeMinor' | 'professionalAmountMinor'>,
  refundCustomerMinor: number,
): RefundRoutingPlan {
  if (!assertAmountMinor(refundCustomerMinor) || refundCustomerMinor <= 0) {
    throw new Error('refundCustomerMinor must be a positive integer')
  }
  if (refundCustomerMinor > original.amountMinor) {
    throw new Error('Refund cannot exceed original amount')
  }
  if (refundCustomerMinor === original.amountMinor) {
    return {
      refundCustomerMinor,
      reversePlatformFeeMinor: original.platformFeeMinor,
      reverseProfessionalTransferMinor: original.professionalAmountMinor,
    }
  }
  // Proportional integer split: fee first, remainder to professional.
  const reversePlatformFeeMinor = Math.floor(
    (original.platformFeeMinor * refundCustomerMinor) / original.amountMinor,
  )
  const reverseProfessionalTransferMinor = refundCustomerMinor - reversePlatformFeeMinor
  return {
    refundCustomerMinor,
    reversePlatformFeeMinor,
    reverseProfessionalTransferMinor,
  }
}
