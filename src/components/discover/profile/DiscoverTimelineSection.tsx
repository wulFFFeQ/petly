import { Cake, Flag, Gift, Star, Trophy } from 'lucide-react'
import type { DiscoverPublicTimelineEvent } from '../../../types'
import { formatIsoDateToCzech } from '../../../lib/petProfileUtils'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverTimelineSectionProps {
  events: DiscoverPublicTimelineEvent[]
}

const categoryMeta: Record<
  DiscoverPublicTimelineEvent['category'],
  { label: string; icon: typeof Star; color: string }
> = {
  milestone: { label: 'Milník', icon: Flag, color: 'text-[#2C4A3E] bg-[#EBF2EE]' },
  adoption: { label: 'Adopce', icon: Gift, color: 'text-[#B8934A] bg-[#FAF4E6]' },
  birthday: { label: 'Narozeniny', icon: Cake, color: 'text-[#234B54] bg-[#E8F0F2]' },
  memory: { label: 'Vzpomínka', icon: Star, color: 'text-[#5A6660] bg-[#F3F0EA]' },
  show: { label: 'Výstava', icon: Trophy, color: 'text-[#B8934A] bg-[#FAF4E6]' },
  award: { label: 'Ocenění', icon: Trophy, color: 'text-[#2C4A3E] bg-[#EBF2EE]' },
}

export function DiscoverTimelineSection({ events }: DiscoverTimelineSectionProps) {
  if (!events.length) return null

  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <DiscoverProfileSection
      title="Veřejná časová osa"
      icon={<Flag size={14} className="text-[#B8934A]" />}
    >
      <ol className="relative space-y-0 border-l border-[#E8E4DC] ml-2.5">
        {sorted.map((event) => {
          const meta = categoryMeta[event.category]
          const Icon = meta.icon
          return (
            <li key={event.id} className="relative pb-5 last:pb-0 pl-5">
              <span
                className={`absolute -left-[13px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ${meta.color}`}
              >
                <Icon size={12} />
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 className="text-sm font-semibold text-[#191E1B]">{event.title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                  {meta.label}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-[#7D8B82]">
                {formatIsoDateToCzech(event.date)}
              </p>
              {event.description && (
                <p className="mt-1.5 text-xs leading-relaxed text-[#4A564F]">{event.description}</p>
              )}
            </li>
          )
        })}
      </ol>
    </DiscoverProfileSection>
  )
}
