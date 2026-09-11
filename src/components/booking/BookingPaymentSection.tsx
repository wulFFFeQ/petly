import { useMemo } from 'react'
import {
  deriveBookingPaymentSummary,
  formatMinorMoney,
  getPaymentProviderConfig,
  isPaymentProviderActive,
  listPaymentsForBooking,
  toPublicPayment,
  type BookingPaymentSummary,
} from '../../lib/payments'

const SUMMARY_LABEL: Record<BookingPaymentSummary, string> = {
  unpaid: 'Platba není vyžadována',
  deposit_pending: 'Čeká na platbu',
  partially_paid: 'Částečně vráceno',
  paid: 'Zaplaceno',
  refund_pending: 'Čeká na platbu',
  refunded: 'Vráceno',
}

/**
 * Read-only payment info for a booking.
 * Never shows fake checkout; DEMO never claims real paid.
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
  const config = getPaymentProviderConfig()
  const providerActive = isPaymentProviderActive()

  const displayLabel = (() => {
    if (publicPayments.length === 0) return 'Platba není vyžadována'
    if (summary === 'deposit_pending' || summary === 'unpaid') {
      const hasPending = publicPayments.some((p) => p.status === 'pending')
      if (hasPending) return 'Čeká na platbu'
    }
    if (summary === 'partially_paid') {
      const hasPartialRefund = publicPayments.some(
        (p) => p.paymentType === 'refund' || p.status === 'partially_refunded',
      )
      return hasPartialRefund ? 'Částečně vráceno' : 'Čeká na platbu'
    }
    return SUMMARY_LABEL[summary] ?? summary
  })()

  return (
    <div
      className="rounded-2xl border border-[#E8E4DC] bg-white px-4 py-4"
      data-testid="booking-payment-section"
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
        Platba
      </p>
      <p className="mt-1 text-sm font-semibold text-[#191E1B]" data-testid="booking-payment-summary">
        {displayLabel}
      </p>
      {!providerActive ? (
        <p className="mt-2 text-xs text-[#7D8B82]" data-testid="booking-payment-provider-inactive">
          Online platby budou dostupné později.
        </p>
      ) : null}
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
        {config.isDemo
          ? 'DEMO / Připravujeme. Toto není potvrzení úhrady.'
          : 'Platby budou dostupné později. Toto není potvrzení úhrady.'}
      </p>
    </div>
  )
}
