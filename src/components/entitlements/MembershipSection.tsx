import { Crown } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { UpgradePrompt } from './UpgradePrompt'
import {
  FEATURE_CATALOG,
  PLAN_IDS,
  clearDemoPlan,
  demoDisclaimer,
  getPlanMeta,
  hasEntitlement,
  isDemoSubscription,
  loadSubscription,
  setDemoPlan,
  toPublicMembershipSummary,
  type PlanId,
  type SubscriptionRecord,
} from '../../lib/entitlements'

/**
 * Settings → Členství / Tarif.
 * Shows current plan, feature list, future upgrade placeholder, and DEMO switch.
 * Never presents DEMO as a real paid subscription.
 */
export function MembershipSection() {
  const [sub, setSub] = useState<SubscriptionRecord>(() => loadSubscription())

  const reload = useCallback(() => {
    setSub(loadSubscription())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const summary = toPublicMembershipSummary(sub)
  const planMeta = getPlanMeta(summary.plan)
  const isDemo = isDemoSubscription(sub) || summary.isDemo

  const handleDemoChange = (value: string) => {
    if (value === 'clear' || value === 'free_default') {
      setSub(clearDemoPlan())
      return
    }
    if ((PLAN_IDS as readonly string[]).includes(value)) {
      setSub(setDemoPlan(value as PlanId))
    }
  }

  const featureLabels = summary.featureIds
    .map((id) => FEATURE_CATALOG[id]?.label)
    .filter(Boolean)
    .slice(0, 12)

  const showUpgradeSample = !hasEntitlement(sub, 'statistics')

  return (
    <div
      id="membership"
      data-testid="membership-section"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="text-base font-bold text-[#191E1B] flex items-center gap-2">
          <Crown size={18} className="text-[#B8934A]" />
          <span>Členství / Tarif</span>
        </h3>
        {isDemo ? (
          <span data-testid="membership-demo-badge">
            <Badge variant="warning" size="sm">
              DEMO
            </Badge>
          </span>
        ) : (
          <Badge variant="outline" size="sm">
            připraveno
          </Badge>
        )}
      </div>

      <p className="text-xs text-[#4A564F] leading-relaxed">
        Tarif určuje dostupné funkce aplikace. Neovlivňuje, kdo smí vidět vaše data —
        to řeší soukromí a oprávnění. Skutečné platby zatím nejsou napojené.
      </p>

      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#7D8B82] uppercase tracking-wide">
              Aktuální tarif
            </p>
            <p
              className="text-sm font-bold text-[#191E1B] mt-0.5"
              data-testid="membership-current-plan"
            >
              {planMeta.label}
            </p>
          </div>
          {isDemo && (
            <p
              className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded-lg px-2 py-1 max-w-xs"
              data-testid="membership-demo-disclaimer"
            >
              {demoDisclaimer()}
            </p>
          )}
        </div>
        <p className="text-xs text-[#4A564F] leading-relaxed">{planMeta.description}</p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#191E1B] mb-2">Co tarif obsahuje</p>
        <ul className="grid gap-1.5 sm:grid-cols-2 text-[11px] text-[#4A564F]">
          {featureLabels.map((label) => (
            <li
              key={label}
              className="flex items-start gap-1.5 before:content-['•'] before:text-[#B8934A]"
            >
              <span>{label}</span>
            </li>
          ))}
          {summary.featureIds.length > featureLabels.length && (
            <li className="text-[#7D8B82] sm:col-span-2">
              … a dalších {summary.featureIds.length - featureLabels.length} funkcí
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-dashed border-[#E8E4DC] p-3.5 space-y-1">
        <p className="text-xs font-bold text-[#191E1B]">Upgrade</p>
        <p className="text-[11px] text-[#7D8B82] leading-relaxed">
          Skutečné předplatné a platba budou dostupné později. Zde nebude falešný checkout
          ani tvrzení, že jste něco zaplatili.
        </p>
        <Button variant="secondary" size="sm" disabled className="mt-1 opacity-60">
          Upgrade — brzy
        </Button>
      </div>

      {showUpgradeSample && (
        <UpgradePrompt featureId="statistics" />
      )}

      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold text-[#191E1B]">DEMO přepínač tarifu</p>
          <Badge variant="warning" size="sm">
            DEMO
          </Badge>
        </div>
        <p className="text-[11px] text-[#7D8B82] leading-relaxed">
          Pouze pro lokální testování entitlements. Není to platba ani aktivace
          skutečného předplatného.
        </p>
        <label className="block text-[11px] font-bold text-[#4A564F]" htmlFor="demo-plan-select">
          Testovací plán
        </label>
        <select
          id="demo-plan-select"
          data-testid="membership-demo-select"
          className="w-full max-w-xs rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-xs text-[#191E1B]"
          value={isDemo ? sub.plan : 'free_default'}
          onChange={(e) => handleDemoChange(e.target.value)}
        >
          <option value="free_default">Free (výchozí, bez DEMO)</option>
          <option value="free">Free (DEMO)</option>
          <option value="premium">Premium (DEMO)</option>
          <option value="family">Family (DEMO)</option>
          <option value="breeder_pro">Breeder Pro (DEMO)</option>
          <option value="clear">Vymazat DEMO → Free</option>
        </select>
      </div>
    </div>
  )
}
