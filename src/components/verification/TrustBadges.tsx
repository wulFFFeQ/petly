import { useState } from 'react'
import type { PublicTrustBadge } from '../../types/verification'
import { TrustBadgeDetail } from './TrustBadgeDetail'
import { cn } from '../../lib/utils'

const TYPE_EMOJI: Record<PublicTrustBadge['type'], string> = {
  email: '✓',
  phone: '✓',
  pet: '🐾',
  breeding: '🏅',
}

interface TrustBadgesProps {
  badges: PublicTrustBadge[]
  className?: string
  /** Compact for cards — icon only with title tooltip; click still opens detail. */
  compact?: boolean
  size?: 'sm' | 'md'
}

export function TrustBadges({
  badges,
  className,
  compact = false,
  size = 'md',
}: TrustBadgesProps) {
  const [selected, setSelected] = useState<PublicTrustBadge | null>(null)

  if (!badges.length) return null

  return (
    <>
      <ul
        className={cn(
          'flex flex-wrap items-center gap-1.5',
          className,
        )}
        aria-label="Ověření důvěryhodnosti"
      >
        {badges.map((badge) => (
          <li key={badge.type}>
            <button
              type="button"
              onClick={() => setSelected(badge)}
              title={badge.label}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border border-[#D4C4A8] bg-[#FAF6EE] text-[#2C4A3E] font-semibold transition-colors hover:bg-[#F3EBDD] cursor-pointer',
                size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
                compact && 'h-7 w-7 justify-center px-0',
              )}
            >
              <span aria-hidden>{TYPE_EMOJI[badge.type]}</span>
              {!compact ? <span>{badge.label}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <TrustBadgeDetail badge={selected} onClose={() => setSelected(null)} />
    </>
  )
}
