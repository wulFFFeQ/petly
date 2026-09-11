import { useMemo } from 'react'
import {
  deriveBookingPaymentSummary,
  formatMinorMoney,
  listPaymentsForBooking,
  toPublicPayment,
} from '../../lib/payments'

const SUMMARY_LABEL: Record<string, string> = {
  unpaid: 'Nezaplaceno / platba na místě',
  deposit_pending: 'Záloha připravena (DEMO)',
  partially_paid: 'Částečně zaplaceno',
  paid: 'Zaplaceno',
  refund_pending: 'Refundace připravena',
  refunded: 'Refundováno',
}

/**
 * Read-only payment info for a booking.
 * Never shows "Platba proběhla" for DEMO; never offers a Pay button.
 */
export function BookingPaymentSection({
  bookingId,
  revision = 0,
}: {
  bookingId: string
  revision?: number
}) {
  const payments = useMemo(
    () => listPaymentsForBooking(bookingId),
    [bookingId, revision],
  )
  const summary = deriveBookingPaymentSummary(payments)
  const publicPayments = payments.map(toPublicPayment)

  return (
    <div
      className="rounded-2xl border border-[#E8E4DC] bg-white px-4 py-4"
      data-testid="booking-payment-section"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
        Platba
      </p>
      <p className="mt-1 text-sm font-semibold text-[#191E1B]" data-testid="booking-payment-summary">
        {SUMMARY_LABEL[summary] ?? summary}
      </p>
      {publicPayments.length === 0 ? (
        <p className="mt-2 text-xs text-[#7D8B82]" data-testid="booking-payment-none">
          Platební systém připravujeme. Platba probíhá dle dohody (např. na místě).
        </p>
      ) : (
        <ul className="mt-3 space-y-2" data-testid="booking-payment-list">
          {publicPayments.map((p) => (
            <li
              key={p.id}
              className="rounded-xl bg-[#FAF8F5] px-3 py-2 text-xs text-[#4A564F]"
              data-testid={`booking-payment-row-${p.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>
                  {p.paymentType === 'deposit'
                    ? 'Záloha'
                    : p.paymentType === 'refund'
                      ? 'Refundace'
                      : p.paymentType === 'cancellation_fee'
                        ? 'Storno poplatek'
                        : 'Platba'}{' '}
                  · {formatMinorMoney(p.amountMinor, p.currency)}
                </span>
                <span className="font-semibold uppercase tracking-wide text-[#B8934A]">
                  {p.isDemoPayment ? 'DEMO' : p.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#7D8B82]">
                Stav: {p.status === 'pending' ? 'připraveno (neuhrazeno)' : p.status}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-[#7D8B82]" data-testid="booking-payment-disclaimer">
        Platby budou dostupné později. Toto není potvrzení úhrady.
      </p>
    </div>
  )
}
