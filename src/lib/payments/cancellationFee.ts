import type { Booking, ProfessionalBookingPolicy } from '../booking/types'
import { DEFAULT_CURRENCY, normalizeCurrency } from './money'
import type { CancellationFeeResult } from './types'

/**
 * Extension point for future cancellation fees based on BookingPolicy.
 * Until a real payment provider is active, always returns 0.
 *
 * Future examples:
 * - cancel > 24h → 0
 * - cancel < 24h → policy-based fee
 */
export function calculateCancellationFee(
  booking: Booking,
  _policy: ProfessionalBookingPolicy | null | undefined,
): CancellationFeeResult {
  const currency = normalizeCurrency(
    booking.currencySnapshot ?? booking.currency ?? DEFAULT_CURRENCY,
  )
  // Provider inactive — no real charge path.
  void booking
  return {
    amountMinor: 0,
    currency,
    reason: 'provider_inactive',
  }
}
