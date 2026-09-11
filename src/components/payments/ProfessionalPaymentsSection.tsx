import {
  ensureDemoProfessionalPaymentAccount,
  getPaymentProviderConfig,
  isStripeConnectReady,
  toPublicProfessionalPaymentAccount,
} from '../../lib/payments'

/**
 * Professional Stripe Connect settings — DEMO / preparing only.
 * Never shows "Stripe připojeno" for demo accounts.
 */
export function ProfessionalPaymentsSection({
  professionalId,
}: {
  professionalId: string
}) {
  const config = getPaymentProviderConfig()
  const account = ensureDemoProfessionalPaymentAccount(professionalId)
  const pub = toPublicProfessionalPaymentAccount(account)
  const ready = isStripeConnectReady(account)

  return (
    <div
      className="space-y-4"
      data-testid="professional-payments-section"
    >
      <div className="rounded-2xl border border-[#E8E4DC] bg-white px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Platby
            </p>
            <p
              className="mt-1 text-sm font-semibold text-[#191E1B]"
              data-testid="professional-payments-status"
            >
              {ready ? 'Stripe účet aktivní' : 'Stripe účet nepřipojen'}
            </p>
          </div>
          <span
            className="rounded-full bg-[#F5F0E8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#B8934A]"
            data-testid="professional-payments-demo-badge"
          >
            DEMO · Připravujeme
          </span>
        </div>

        <p
          className="mt-3 text-xs text-[#7D8B82]"
          data-testid="professional-payments-copy"
        >
          Stripe propojení bude dostupné v ostré verzi.
        </p>

        <button
          type="button"
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-xl bg-[#E8E4DC] px-4 py-2.5 text-sm font-semibold text-[#7D8B82]"
          data-testid="professional-payments-connect-cta"
        >
          Připojit Stripe
        </button>

        <p className="mt-2 text-[11px] text-[#A3AEA7]" data-testid="professional-payments-config">
          {config.statusLabel}
        </p>
      </div>

      <div
        className="rounded-2xl border border-[#E8E4DC] bg-white px-4 py-4"
        data-testid="professional-payments-details"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
          Budoucí informace
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[#4A564F]">
          <li className="flex justify-between gap-2">
            <span>Stav účtu</span>
            <span className="text-[#7D8B82]" data-testid="ppa-status">
              {pub.status === 'not_started' ? 'Nepřipojen' : pub.status}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Přijímání plateb</span>
            <span className="text-[#7D8B82]" data-testid="ppa-charges">
              {pub.chargesEnabled ? 'Ano' : 'Nedostupné'}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Výplaty</span>
            <span className="text-[#7D8B82]" data-testid="ppa-payouts">
              {pub.payoutsEnabled ? 'Ano' : 'Nedostupné'}
            </span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Bankovní účet</span>
            <span className="text-[#7D8B82]">—</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Payout schedule</span>
            <span className="text-[#7D8B82]">—</span>
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-[#7D8B82]">
          Provider: {pub.provider === 'demo' ? 'DEMO (ne Stripe)' : pub.provider}. Žádná falešná
          verifikace.
        </p>
      </div>
    </div>
  )
}
