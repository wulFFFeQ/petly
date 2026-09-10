import { Link } from 'react-router-dom'
import type { ProfessionalQuickAction } from '../../../lib/professional/dashboard'
import { Card } from '../../ui/Card'
import { EmptyState } from './EmptyState'

export function QuickActions({ actions }: { actions: ProfessionalQuickAction[] }) {
  if (actions.length === 0) {
    return (
      <EmptyState
        title="Žádné rychlé akce"
        description="WRITE akce se zobrazí až po aktivním přístupu s příslušným oprávněním."
        testId="professional-quick-actions-empty"
      />
    )
  }

  return (
    <Card variant="elevated" data-testid="professional-quick-actions">
      <h2 className="mb-3 text-sm font-bold text-[#191E1B]">Rychlé akce</h2>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={action.permission}
            to={action.petId ? `/professional/pets/${action.petId}` : '/professional/pets'}
            data-testid={`quick-action-${action.permission}`}
            className="inline-flex items-center rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-semibold text-[#191E1B] hover:bg-[#EBF2EE]"
          >
            + {action.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}
