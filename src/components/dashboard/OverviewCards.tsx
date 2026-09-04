import {
  Calendar,
  Clock,
  Pill,
  Stethoscope,
  Syringe,
  UtensilsCrossed,
} from 'lucide-react'
import { overviewItems } from '../../data/mockData'
import type { EventType } from '../../types'
import { getEventVisualStyle } from '../../lib/calendarEventTypes'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const iconByType: Partial<Record<EventType, typeof Syringe>> = {
  vaccination: Syringe,
  medication: Pill,
  vet: Stethoscope,
  grooming: Calendar,
  feeding: UtensilsCrossed,
}

export function OverviewCards() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#191E1B]">Přehled na dnešek</h2>
          <p className="text-xs text-[#7D8B82] mt-0.5">Důležité lékařské připomínky a denní péče</p>
        </div>
        <Badge variant="default" size="sm">
          <Clock size={11} className="mr-0.5 text-[#7D8B82]" />
          4 naplánované připomínky
        </Badge>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {overviewItems.map((item) => {
          const Icon = iconByType[item.type] ?? Calendar
          const colors = getEventVisualStyle(item.type)

          return (
            <Card
              key={item.id}
              variant="elevated"
              hoverable
              padding="sm"
              className="group"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${colors.bg} ${colors.text} ${colors.border} transition-transform duration-300 group-hover:scale-105`}
                >
                  <Icon size={19} strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                      {item.label}
                    </p>
                    {item.timeBadge && (
                      <span className="text-[10px] font-semibold text-[#B8934A] bg-[#FAF4E6] px-1.5 py-0.5 rounded-md border border-[#E8D8B5]">
                        {item.timeBadge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-bold text-[#191E1B] truncate">
                    {item.petName}
                  </p>
                  <p className="text-xs text-[#4A564F] mt-0.5 font-medium">
                    {item.detail}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
