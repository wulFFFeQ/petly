import { CalendarPlus, Sparkles } from 'lucide-react'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'

export function CalendarPage() {
  const { setActiveModal } = useApp()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Plán a rutiny
            </Badge>
            <span className="text-xs text-[#7D8B82] font-medium">
              Preventivní péče a denní připomínky
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
            Kalendář
          </h1>
          <p className="mt-1 text-sm text-[#4A564F]">
            Termíny, očkování, dávkování a rutiny synchronizované pro všechny mazlíčky.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setActiveModal('bookVet')}
          className="gap-2 shadow-sm"
        >
          <CalendarPlus size={16} />
          <span>Nový termín</span>
        </Button>
      </div>

      <CalendarGrid />
    </div>
  )
}
