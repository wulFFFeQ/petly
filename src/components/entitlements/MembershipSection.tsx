import { Crown } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { UpgradePrompt } from './UpgradePrompt'
import {
  FEATURE_CATALOG,
  demoDisclaimer,
  effectivePlan,
  getPlanMeta,
  hasEntitlement,
  isDemoSubscription,
  loadSubscription,
  toPublicMembershipSummary,
  type SubscriptionRecord,
} from '../../lib/entitlements'

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return new Date(t).toLocaleDateString('cs-CZ')
}

function statusLabel(sub: SubscriptionRecord, isDemo: boolean): string {
  if (isDemo) return 'DEMO režim'
  switch (sub.status) {
    case 'active':
      return 'Aktivní'
    case 'canceled':
      return 'Zrušeno'
    case 'expired':
      return 'Vypršelo'
    case 'none':
      return 'Bez placeného předplatného'
    default:
      return sub.status
  }
}

/**
 * Settings → Členství — summary only.
 * Full plan picker lives on /membership.
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
  const plan = effectivePlan(sub)
  const planMeta = getPlanMeta(plan)
  const isDemo = isDemoSubscription(sub) || summary.isDemo

  const featureLabels = summary.featureIds
    .map((id) => FEATURE_CATALOG[id]?.label)
    .filter(Boolean)
    .slice(0, 12)

  const started = formatDate(sub.startedAt)
  const expires = formatDate(sub.expiresAt)
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
          <span>Členství</span>
        </h3>
        {isDemo ? (
          <span data-testid="membership-demo-badge">
            <Badge variant="warning" size="sm">
              DEMO režim
            </Badge>
          </span>
        ) : null}
      </div>

      <p className="text-xs text-[#4A564F] leading-relaxed">
        Tarif určuje dostupné funkce aplikace. Neovlivňuje, kdo smí vidět vaše data —
        to řeší soukromí a oprávnění. Skutečné platby zatím nejsou napojené.
      </p>

      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-[#7D8B82] uppercase tracking-wide">
              Aktuální plán
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
        <p className="text-xs text-[#4A564F]" data-testid="membership-status">
          Stav: {statusLabel(sub, isDemo)}
        </p>
        {started && (
          <p className="text-xs text-[#4A564F]" data-testid="membership-started">
            Aktivace: {started}
          </p>
        )}
        {expires && (
          <p className="text-xs text-[#4A564F]" data-testid="membership-expires">
            Expirace: {expires}
          </p>
        )}
        <p className="text-xs text-[#4A564F] leading-relaxed">{planMeta.description}</p>
      </div>

      <div>
        <p className="text-xs font-bold text-[#191E1B] mb-2">Dostupné funkce</p>
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

      <Link to="/membership">
        <Button variant="secondary" size="sm" data-testid="manage-membership-cta">
          <Crown size={14} className="mr-1.5" />
          Spravovat členství
        </Button>
      </Link>

      {showUpgradeSample && <UpgradePrompt featureId="statistics" />}
    </div>
  )
}
