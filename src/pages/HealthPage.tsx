import { Plus } from 'lucide-react'
import { useState } from 'react'
import { HealthCategoryPanel } from '../components/health/HealthCategoryPanel'
import {
  HealthRecordsList,
  HealthSummary,
  UpcomingHealthEvents,
} from '../components/health/HealthSummary'
import { WeightChart } from '../components/health/WeightChart'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'
import type {
  HealthDashboardDetail,
  HealthPetFilter,
} from '../lib/healthDashboard'
import { cn } from '../lib/utils'

export function HealthPage() {
  const { setActiveModal, pets } = useApp()
  const [petFilter, setPetFilter] = useState<HealthPetFilter>('all')
  const [activeDetail, setActiveDetail] = useState<HealthDashboardDetail | null>(null)

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Veterinární přehled"
        meta="Zdravotní záznamy a vitální údaje"
        title="Zdraví a pohoda mazlíčků"
        description="Sledujte očkování, léky, vývoj hmotnosti a návštěvy veterináře."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
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

      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-1">
        <button
          type="button"
          onClick={() => setPetFilter('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
            petFilter === 'all'
              ? 'bg-white text-[#234B54] shadow-xs'
              : 'text-[#7D8B82] hover:text-[#191E1B]',
          )}
        >
          Všichni mazlíčci
        </button>
        {pets.map((pet) => (
          <button
            key={pet.id}
            type="button"
            onClick={() => setPetFilter(pet.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
              petFilter === pet.id
                ? 'bg-white text-[#234B54] shadow-xs'
                : 'text-[#7D8B82] hover:text-[#191E1B]',
            )}
          >
            {pet.name}
          </button>
        ))}
      </div>

      {activeDetail ? (
        <HealthCategoryPanel
          detail={activeDetail}
          petFilter={petFilter}
          onBack={() => setActiveDetail(null)}
          onPetFilterChange={setPetFilter}
        />
      ) : (
        <>
          <HealthSummary petFilter={petFilter} onOpenDetail={setActiveDetail} />
          <WeightChart
            lockedPetId={petFilter === 'all' ? undefined : petFilter}
            onSelectPet={(id) => setPetFilter(id)}
          />

          <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
            <UpcomingHealthEvents petFilter={petFilter} />
            <HealthRecordsList
              petFilter={petFilter}
              onViewFullHistory={() => setActiveDetail('records')}
            />
          </div>
        </>
      )}
    </div>
  )
}
