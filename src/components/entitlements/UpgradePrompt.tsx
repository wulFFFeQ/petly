import { Crown, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import {
  FEATURE_CATALOG,
  getPlanMeta,
  isFeatureId,
  suggestedPlanForFeature,
  type FeatureId,
} from '../../lib/entitlements'

export interface UpgradePromptProps {
  featureId: FeatureId | string
  title?: string
  benefit?: string
  className?: string
}

/**
 * Soft upgrade nudge — never a full-page paywall, never blocks safety features.
 * Not wired across the app yet; ready for future gated Premium surfaces.
 */
export function UpgradePrompt({
  featureId,
  title,
  benefit,
  className,
}: UpgradePromptProps) {
  const meta = isFeatureId(featureId) ? FEATURE_CATALOG[featureId] : null
  const suggested = suggestedPlanForFeature(featureId)
  const planMeta = suggested && suggested !== 'free' ? getPlanMeta(suggested) : getPlanMeta('premium')
  const heading =
    title ??
    `Tato funkce je součástí ${planMeta.label}.`
  const body = benefit ?? meta?.benefit ?? planMeta.description

  return (
    <div
      data-testid="upgrade-prompt"
      data-feature={featureId}
      className={
        className ??
        'rounded-xl border border-[#E8D8B5] bg-[#FAF4E6]/60 p-4 space-y-2'
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles size={16} className="text-[#B8934A]" />
        <p className="text-sm font-bold text-[#191E1B]">{heading}</p>
        <Badge variant="gold" size="sm">
          {planMeta.label}
        </Badge>
      </div>
      <p className="text-xs text-[#4A564F] leading-relaxed">{body}</p>
      <Link to="/settings#membership">
        <Button variant="secondary" size="sm" className="mt-1">
          <Crown size={14} className="mr-1.5" />
          Zobrazit tarif
        </Button>
      </Link>
    </div>
  )
}
