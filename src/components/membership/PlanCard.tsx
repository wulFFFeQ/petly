import { Check, Crown } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  formatMonthlyPrice,
  type PlanPricing,
} from '../../lib/membership'
import type { PlanId } from '../../lib/entitlements'
import { cn } from '../../lib/utils'

export interface PlanCardProps {
  pricing: PlanPricing
  currentPlan: PlanId
  isDemo: boolean
  /** Breeder Pro eligibility; ignored for other plans. */
  breederEligible?: boolean
  breederMessage?: string
  busy?: boolean
  onSelect: (plan: PlanId) => void
}

export function PlanCard({
  pricing,
  currentPlan,
  isDemo,
  breederEligible = true,
  breederMessage,
  busy,
  onSelect,
}: PlanCardProps) {
  const isCurrent = currentPlan === pricing.plan
  const isBreeder = pricing.plan === 'breeder_pro'
  const blocked = isBreeder && !breederEligible

  let ctaLabel = `Zkusit ${pricing.displayName} (DEMO)`
  if (isCurrent) {
    ctaLabel = isDemo ? 'Aktuální (DEMO)' : 'Vaše současné členství'
  } else if (pricing.plan === 'free') {
    ctaLabel = 'Přepnout na Free'
  } else if (blocked) {
    ctaLabel = 'Nedostupné'
  }

  return (
    <div
      data-testid={`plan-card-${pricing.plan}`}
      data-current={isCurrent ? 'true' : 'false'}
      className={cn(
        'rounded-2xl border p-4 sm:p-5 flex flex-col gap-3 h-full',
        isCurrent
          ? 'border-[#B8934A] bg-[#FAF4E6]/70 shadow-sm ring-1 ring-[#B8934A]/30'
          : 'border-[#E8E4DC] bg-[#FAF8F5]',
        pricing.recommended && !isCurrent && 'border-[#D4C4A0]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#191E1B]">{pricing.displayName}</h3>
            {pricing.recommended && (
              <Badge variant="gold" size="sm">
                Doporučeno
              </Badge>
            )}
            {isCurrent && (
              <Badge variant="outline" size="sm">
                Aktuální
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#4A564F] mt-1.5 leading-relaxed">{pricing.description}</p>
        </div>
        {isCurrent && <Crown size={18} className="text-[#B8934A] shrink-0" />}
      </div>

      <p
        className="text-lg font-bold text-[#191E1B]"
        data-testid={`plan-price-${pricing.plan}`}
      >
        {formatMonthlyPrice(pricing)}
      </p>

      <ul className="space-y-1.5 flex-1">
        {pricing.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-[11px] text-[#4A564F] leading-snug"
          >
            <Check size={12} className="mt-0.5 text-[#B8934A] shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {blocked && breederMessage && (
        <p
          className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/60 rounded-lg px-2.5 py-2 leading-relaxed"
          data-testid="breeder-pro-ineligible"
        >
          {breederMessage}
        </p>
      )}

      <Button
        variant={isCurrent ? 'secondary' : 'primary'}
        size="sm"
        className="w-full mt-1"
        disabled={busy || isCurrent || blocked}
        data-testid={`plan-cta-${pricing.plan}`}
        onClick={() => onSelect(pricing.plan)}
      >
        {ctaLabel}
      </Button>
    </div>
  )
}
