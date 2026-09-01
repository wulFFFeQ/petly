import { Plus, Sparkles } from 'lucide-react'
import {
  HealthRecordsList,
  HealthSummary,
  UpcomingHealthEvents,
} from '../components/health/HealthSummary'
import { WeightChart } from '../components/health/WeightChart'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'

export function HealthPage() {
  const { setActiveModal } = useApp()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Veterinární přehled
            </Badge>
            <span className="text-xs text-[#7D8B82] font-medium">
              Zdravotní záznamy a vitální údaje
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
            Zdraví a pohoda mazlíčků
          </h1>
          <p className="mt-1 text-sm text-[#4A564F]">
            Sledujte očkování, léky, vývoj hmotnosti a návštěvy veterináře.
          </p>
        </div>

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
      </div>

      <HealthSummary />
      <WeightChart />

      <div className="grid gap-8 lg:grid-cols-2">
        <UpcomingHealthEvents />
        <HealthRecordsList />
      </div>
    </div>
  )
}
