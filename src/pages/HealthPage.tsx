import { Plus } from 'lucide-react'
import {
  HealthRecordsList,
  HealthSummary,
  UpcomingHealthEvents,
} from '../components/health/HealthSummary'
import { WeightChart } from '../components/health/WeightChart'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'

export function HealthPage() {
  const { setActiveModal } = useApp()

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Veterinární přehled"
        meta="Zdravotní záznamy a vitální údaje"
        title="Zdraví a pohoda mazlíčků"
        description="Sledujte očkování, léky, vývoj hmotnosti a návštěvy veterináře."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveModal('bookVet')}
            >
              Objednat návštěvu veterináře
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setActiveModal('addHealthRecord')}
              className="gap-1.5"
            >
              <Plus size={16} />
              <span>Přidat zdravotní záznam</span>
            </Button>
          </div>
        }
      />

      <HealthSummary />
      <WeightChart />

      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <UpcomingHealthEvents />
        <HealthRecordsList />
      </div>
    </div>
  )
}
