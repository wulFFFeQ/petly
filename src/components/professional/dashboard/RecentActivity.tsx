import {
  formatActivityTime,
  type ProfessionalActivityItem,
} from '../../../lib/professional/dashboard'
import { EmptyState } from './EmptyState'
import { Card } from '../../ui/Card'

export function RecentActivity({ items }: { items: ProfessionalActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Zatím zde není žádná aktivita."
        description="Až dojde k propojení nebo zobrazení záznamů, objeví se zde."
        testId="professional-activity-empty"
      />
    )
  }

  return (
    <Card variant="elevated" data-testid="professional-recent-activity">
      <h2 className="text-sm font-bold text-[#191E1B]">Poslední aktivita</h2>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 border-b border-[#F0EDE6] pb-3 last:border-0 last:pb-0"
            data-testid={`activity-item-${item.id}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#191E1B]">{item.petName}</p>
              <p className="text-xs text-[#7D8B82]">{item.label}</p>
            </div>
            <span className="shrink-0 text-[11px] text-[#A3AEA7]">
              {formatActivityTime(item.timestamp)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
