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
 * Stripe / checkout return page.
 * NEVER sets Payment.status = paid — only shows processing copy + current internal state.
 */
export function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const paymentId = params.get('paymentId') ?? ''
  const payment = useMemo(
    () => (paymentId ? getPayment(paymentId) : null),
    [paymentId],
  )
  const pub = payment ? toPublicPayment(payment) : null

  return (
    <div className="mx-auto max-w-lg px-4 py-10" data-testid="payment-success-page">
      <Card variant="elevated">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Platba
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[#191E1B]">
          Platba byla odeslána ke zpracování.
        </h1>
        <p className="mt-2 text-sm text-[#7D8B82]">
          Potvrzení úhrady přijde až po ověření platebním poskytovatelem. Tato stránka
          sama o sobě neznamená, že je platba zaplacená.
        </p>

        {pub ? (
          <div
            className="mt-4 rounded-xl bg-[#FAF8F5] px-3 py-3 text-sm text-[#4A564F]"
            data-testid="payment-success-status"
          >
            <p>
              Stav: <span className="font-semibold">{pub.isDemoPayment ? 'DEMO' : pub.status}</span>
            </p>
            <p className="mt-1 text-xs">
              {formatMinorMoney(pub.amountMinor, pub.currency)}
              {pub.serviceNameSnapshot ? ` · ${pub.serviceNameSnapshot}` : ''}
            </p>
            {pub.isDemoPayment ? (
              <p className="mt-2 text-[11px] text-[#B8934A]" data-testid="payment-success-demo-note">
                DEMO — platba není označena jako uhrazená.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-[#7D8B82]" data-testid="payment-success-missing">
            Platbu se nepodařilo načíst. Zkontrolujte rezervaci.
          </p>
        )}

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
