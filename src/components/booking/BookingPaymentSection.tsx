import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deriveBookingPaymentSummary,
  formatMinorMoney,
  getPaymentProviderConfig,
  initiateCheckoutSession,
  isPaymentProviderActive,
  listPaymentsForBooking,
  toPublicCheckoutSession,
  toPublicPayment,
  type BookingPaymentSummary,
  type Payment,
} from '../../lib/payments'

const SUMMARY_LABEL: Record<BookingPaymentSummary, string> = {
  unpaid: 'Platba není vyžadována',
  deposit_pending: 'Čeká na platbu',
  partially_paid: 'Částečně vráceno',
  paid: 'Platba potvrzena',
  refund_pending: 'Čeká na platbu',
  refunded: 'Vráceno',
}

function statusLabel(status: Payment['status'], isDemo: boolean): string {
  if (isDemo && (status === 'pending' || status === 'failed')) return 'Čeká na platbu'
  switch (status) {
    case 'pending':
      return 'Čeká na platbu'
    case 'authorized':
      return 'Platba se zpracovává'
    case 'paid':
      return 'Platba potvrzena'
    case 'failed':
      return 'Platba se nezdařila'
    case 'cancelled':
      return 'Platba zrušena'
    case 'refunded':
      return 'Vráceno'
    case 'partially_refunded':
      return 'Částečně vráceno'
    default:
      return status
  }
}

/**
 * Payment info for a booking.
 * Owner may initiate DEMO preparing checkout — never fake paid / card form.
 */
export function BookingPaymentSection({
  bookingId,
  revision = 0,
  actorAccountId,
  role = 'owner',
}: {
  bookingId: string
  revision?: number
  /** Required for owner checkout CTA. */
  actorAccountId?: string
  role?: 'owner' | 'professional'
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [preparingOpen, setPreparingOpen] = useState(false)
  const [preparingMessage, setPreparingMessage] = useState(
    'Online platby budou dostupné později.',
  )

  const payments = useMemo(
    () => listPaymentsForBooking(bookingId),
    [bookingId, revision],
  )
  const summary = deriveBookingPaymentSummary(payments)
  const publicPayments = payments.map(toPublicPayment)
  const config = getPaymentProviderConfig()
  const providerActive = isPaymentProviderActive()

  const checkoutCandidate = payments.find(
    (p) =>
      p.purpose === 'BOOKING_PAYMENT' &&
      p.paymentType !== 'refund' &&
      (p.status === 'pending' || p.status === 'failed'),
  )

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

  async function onPreparePayment() {
    if (!checkoutCandidate || !actorAccountId || role !== 'owner') return
    setBusy(true)
    try {
      const result = await initiateCheckoutSession({
        paymentId: checkoutCandidate.id,
        actorAccountId,
      })
      if (!result.ok) {
        setPreparingMessage(result.message)
        setPreparingOpen(true)
        return
      }
      const pub = toPublicCheckoutSession(result.value)
      if (pub.checkoutUrl && !pub.isDemo && providerActive) {
        window.location.assign(pub.checkoutUrl)
        return
      }
      // DEMO / inactive: preparing modal — never invent URL or paid state.
      setPreparingMessage(pub.message || 'Online platby budou dostupné později.')
      setPreparingOpen(true)
    } finally {
      setBusy(false)
    }
  }

  const showOwnerCta =
    role === 'owner' && Boolean(actorAccountId) && Boolean(checkoutCandidate)

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
                  {p.serviceNameSnapshot ? ` · ${p.serviceNameSnapshot}` : ''}
                </span>
                <span className="font-semibold uppercase tracking-wide text-[#B8934A]">
                  {p.isDemoPayment ? 'DEMO' : p.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#7D8B82]">
                Stav: {statusLabel(p.status, p.isDemoPayment)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {showOwnerCta ? (
        <div className="mt-3" data-testid="booking-payment-cta-wrap">
          <button
            type="button"
            className="w-full rounded-xl bg-[#191E1B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A322E] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="booking-payment-checkout-cta"
            disabled={busy}
            onClick={() => void onPreparePayment()}
          >
            {providerActive ? 'Pokračovat k platbě' : 'Připravit platbu'}
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] text-[#7D8B82]" data-testid="booking-payment-disclaimer">
        {config.isDemo
          ? 'DEMO / Připravujeme. Toto není potvrzení úhrady.'
          : 'Platby budou dostupné později. Toto není potvrzení úhrady.'}
      </p>

      {preparingOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          data-testid="booking-payment-preparing-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <p className="text-sm font-semibold text-[#191E1B]">Platba se připravuje</p>
            <p className="mt-2 text-xs text-[#7D8B82]" data-testid="booking-payment-preparing-message">
              {preparingMessage}
            </p>
            <p className="mt-2 text-[11px] text-[#A3AEA7]">
              Žádná karta se nevyžaduje. Stav platby se neoznačí jako zaplaceno.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[#E8E4DC] px-3 py-2 text-sm font-semibold text-[#191E1B]"
                data-testid="booking-payment-preparing-close"
                onClick={() => setPreparingOpen(false)}
              >
                Zavřít
              </button>
              {checkoutCandidate ? (
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-[#FAF8F5] px-3 py-2 text-sm font-semibold text-[#4A564F]"
                  data-testid="booking-payment-view-success-route"
                  onClick={() => {
                    setPreparingOpen(false)
                    navigate(
                      `/payment/success?paymentId=${encodeURIComponent(checkoutCandidate.id)}`,
                    )
                  }}
                >
                  Stav zpracování
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
