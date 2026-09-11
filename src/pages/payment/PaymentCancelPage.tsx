import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import {
  formatMinorMoney,
  getPayment,
  toPublicPayment,
} from '../../lib/payments'

/**
 * Checkout cancel return page.
 * Does NOT auto-cancel Payment — wait for provider event when live.
 */
export function PaymentCancelPage() {
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId') ?? ''
  const payment = useMemo(
    () => (paymentId ? getPayment(paymentId) : null),
    [paymentId],
  )
  const pub = payment ? toPublicPayment(payment) : null

  return (
    <div className="mx-auto max-w-lg px-4 py-10" data-testid="payment-cancel-page">
      <Card variant="elevated">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Platba
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[#191E1B]">
          Platba nebyla dokončena.
        </h1>
        <p className="mt-2 text-sm text-[#7D8B82]">
          Můžete se vrátit k rezervaci a zkusit platbu později. Interní stav se
          nemění jen kvůli návštěvě této stránky.
        </p>

        {pub ? (
          <div
            className="mt-4 rounded-xl bg-[#FAF8F5] px-3 py-3 text-sm text-[#4A564F]"
            data-testid="payment-cancel-status"
          >
            <p>
              Aktuální stav:{' '}
              <span className="font-semibold">{pub.isDemoPayment ? 'DEMO' : pub.status}</span>
            </p>
            <p className="mt-1 text-xs">
              {formatMinorMoney(pub.amountMinor, pub.currency)}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {pub?.bookingId ? (
            <Link to={`/bookings/${encodeURIComponent(pub.bookingId)}`}>
              <Button variant="primary" size="sm">
                Zpět na rezervaci
              </Button>
            </Link>
          ) : (
            <Link to="/bookings">
              <Button variant="primary" size="sm">
                Moje rezervace
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  )
}
