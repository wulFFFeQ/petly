import { Crown } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeatureComparison } from '../components/membership/FeatureComparison'
import { PlanCard } from '../components/membership/PlanCard'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'
import { getSelfAccount } from '../lib/account/session'
import { getSubscriptionProvider } from '../lib/billing'
import { BRAND_NAME } from '../lib/brand'
import {
  PLAN_IDS,
  clearDemoPlan,
  demoDisclaimer,
  effectivePlan,
  getPlanMeta,
  isDemoSubscription,
  loadSubscription,
  toPublicMembershipSummary,
  type PlanId,
  type SubscriptionRecord,
} from '../lib/entitlements'
import {
  BREEDER_PRO_INELIGIBLE_MESSAGE,
  canSelectBreederPro,
  listPlanPricing,
} from '../lib/membership'

function statusLabel(sub: SubscriptionRecord, isDemo: boolean): string {
  if (isDemo) return 'DEMO režim'
  switch (sub.status) {
    case 'active':
      return 'Aktivní'
    case 'canceled':
      return 'Zrušeno (do expirace dle data)'
    case 'expired':
      return 'Vypršelo'
    case 'none':
      return 'Bez placeného předplatného'
    default:
      return sub.status
  }
}

export function MembershipPage() {
  const { pets } = useApp()
  const [sub, setSub] = useState<SubscriptionRecord>(() => loadSubscription())
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(() => {
    setSub(loadSubscription())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const summary = toPublicMembershipSummary(sub)
  const plan = effectivePlan(sub)
  const planMeta = getPlanMeta(plan)
  const isDemo = isDemoSubscription(sub) || summary.isDemo
  const account = getSelfAccount()
  const breederEligible = canSelectBreederPro(account, pets)
  const pricing = listPlanPricing()

  const applyDemoPlan = async (next: PlanId) => {
    if (next === 'breeder_pro' && !breederEligible) {
      setNotice(BREEDER_PRO_INELIGIBLE_MESSAGE)
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const provider = getSubscriptionProvider()
      const result = await provider.changePlan({
        accountId: sub.accountId,
        plan: next,
        demo: true,
      })
      if (!result.ok) {
        setNotice(result.message)
        return
      }
      setSub(result.subscription)
      if (next === 'free') {
        setNotice('Přepnuto na Free. DEMO tarif zrušen.')
      } else {
        setNotice(`DEMO členství: ${getPlanMeta(next).label}. Nejde o platbu.`)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDemoSelect = (value: string) => {
    if (value === 'clear' || value === 'free_default') {
      setSub(clearDemoPlan())
      setNotice(null)
      return
    }
    if ((PLAN_IDS as readonly string[]).includes(value)) {
      void applyDemoPlan(value as PlanId)
    }
  }

  return (
    <div className="space-y-8 pb-8" data-testid="membership-page">
      <PageHeader
        title={`Členství ${BRAND_NAME}`}
        description="Vyberte si úroveň, která odpovídá tomu, jak chcete LOVED & KNOWN používat."
      />

      <section
        className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 sm:p-5 space-y-2"
        data-testid="membership-current"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Crown size={18} className="text-[#B8934A]" />
          <p className="text-xs font-bold text-[#7D8B82] uppercase tracking-wide">
            Vaše současné členství
          </p>
          {isDemo && (
            <span data-testid="membership-demo-badge">
              <Badge variant="warning" size="sm">
                DEMO členství
              </Badge>
            </span>
          )}
        </div>
        <p
          className="text-lg font-bold text-[#191E1B]"
          data-testid="membership-current-plan"
        >
          {planMeta.label}
        </p>
        <p className="text-xs text-[#4A564F]" data-testid="membership-current-status">
          Stav: {statusLabel(sub, isDemo)}
        </p>
        {isDemo && (
          <p
            className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded-lg px-2.5 py-1.5 max-w-xl"
            data-testid="membership-demo-disclaimer"
          >
            {demoDisclaimer()}
          </p>
        )}
        <p className="text-xs text-[#4A564F] leading-relaxed">{planMeta.description}</p>
        {plan === 'family' && (
          <p className="text-xs text-[#4A564F] leading-relaxed">
            Family umožňuje sdílet péči s členy domácnosti.
          </p>
        )}
      </section>

      {notice && (
        <p
          className="text-xs text-[#4A564F] bg-white border border-[#E8E4DC] rounded-xl px-3 py-2"
          data-testid="membership-notice"
        >
          {notice}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pricing.map((item) => (
          <PlanCard
            key={item.plan}
            pricing={item}
            currentPlan={plan}
            isDemo={isDemo}
            breederEligible={breederEligible}
            breederMessage={BREEDER_PRO_INELIGIBLE_MESSAGE}
            busy={busy}
            onSelect={(p) => void applyDemoPlan(p)}
          />
        ))}
      </section>

      <FeatureComparison />

      <section className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold text-[#191E1B]">DEMO přepínač tarifu</p>
          <Badge variant="warning" size="sm">
            DEMO
          </Badge>
        </div>
        <p className="text-[11px] text-[#7D8B82] leading-relaxed">
          Pouze pro lokální testování. Není to platba ani aktivace skutečného předplatného.
        </p>
        <label className="block text-[11px] font-bold text-[#4A564F]" htmlFor="membership-demo-select">
          Testovací plán
        </label>
        <select
          id="membership-demo-select"
          data-testid="membership-demo-select"
          className="w-full max-w-xs rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-xs text-[#191E1B]"
          value={isDemo ? sub.plan : 'free_default'}
          onChange={(e) => handleDemoSelect(e.target.value)}
          disabled={busy}
        >
          <option value="free_default">Free (výchozí, bez DEMO)</option>
          <option value="free">Free (DEMO)</option>
          <option value="premium">Premium (DEMO)</option>
          <option value="family">Family (DEMO)</option>
          <option value="breeder_pro">Breeder Pro (DEMO)</option>
          <option value="clear">Vymazat DEMO → Free</option>
        </select>
        <p className="text-[11px] text-[#7D8B82]">
          Skutečné platby budou dostupné později. Návrh:{' '}
          <Link to="/terms" className="text-[#B8934A] underline-offset-2 hover:underline">
            Obchodní podmínky
          </Link>
          {' · '}
          <Link to="/privacy" className="text-[#B8934A] underline-offset-2 hover:underline">
            Ochrana údajů
          </Link>
          . Zpět do{' '}
          <Link to="/settings#membership" className="text-[#B8934A] underline-offset-2 hover:underline">
            Nastavení → Členství
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
