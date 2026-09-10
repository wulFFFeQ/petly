import { CalendarPlus } from 'lucide-react'
import { CalendarGrid } from '../components/calendar/CalendarGrid'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { useApp } from '../context/AppContext'

export function CalendarPage() {
  const { openNewCalendarEvent } = useApp()

  return (
    <div className="space-y-8">
      <PageHeader
        badge="Plán a rutiny"
        meta="Preventivní péče a denní připomínky"
        title="Kalendář"
        description="Termíny, očkování, dávkování a rutiny synchronizované pro všechny mazlíčky."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => openNewCalendarEvent()}
            className="gap-2 shadow-sm"
          >
            <CalendarPlus size={16} />
            <span>Nová událost</span>
          </Button>
        }
      />

      <CalendarGrid />
    </div>
  )
}
