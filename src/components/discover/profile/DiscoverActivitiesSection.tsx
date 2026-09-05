import { Activity } from 'lucide-react'
import type { DiscoverActivityPreference } from '../../../types'
import { cn } from '../../../lib/utils'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverActivitiesSectionProps {
  activities: DiscoverActivityPreference[]
}

export function DiscoverActivitiesSection({ activities }: DiscoverActivitiesSectionProps) {
  if (!activities.length) return null

  const sorted = [...activities].sort((a, b) => b.level - a.level)

  return (
    <DiscoverProfileSection
      title="Aktivity a kompatibilita"
      icon={<Activity size={14} className="text-[#B8934A]" />}
    >
      <p className="mb-4 text-xs text-[#7D8B82] leading-relaxed">
        Preference pomáhají najít vhodné parťáky na procházky, hraní i výlety.
      </p>
      <ul className="space-y-3">
        {sorted.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <span className="w-36 shrink-0 text-xs font-medium text-[#4A564F] sm:w-40">
              {item.label}
            </span>
            <div className="flex flex-1 items-center gap-1.5">
              {Array.from({ length: 5 }, (_, i) => {
                const filled = i < item.level
                return (
                  <span
                    key={i}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-colors',
                      filled ? 'bg-[#2C4A3E]' : 'bg-[#E8E4DC]',
                    )}
                    aria-hidden
                  />
                )
              })}
            </div>
            <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-[#7D8B82]">
              {item.level}/5
            </span>
          </li>
        ))}
      </ul>
    </DiscoverProfileSection>
  )
}
