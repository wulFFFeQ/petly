import { EmptyState } from '../../components/professional/dashboard/EmptyState'
import { Card } from '../../components/ui/Card'

/** Extension point — no booking / clinic software integration yet. */
export function ProfessionalRecordsPage() {
  return (
    <div className="space-y-5 pb-8" data-testid="professional-records-page">
      <div>
        <h1 className="text-lg font-bold text-[#191E1B]">Záznamy</h1>
        <p className="text-xs text-[#7D8B82]">
          Centrální přehled zápisů napříč propojeními — připraveno jako extension point.
        </p>
      </div>
      <Card variant="elevated">
        <EmptyState
          title="Záznamy budou zde"
          description="Zápisy vznikají u konkrétního mazlíčka podle WRITE permissions. Tato stránka je připravena pro pozdější agregaci."
          ctaLabel="Moji propojení mazlíčci"
          ctaTo="/professional/pets"
          testId="professional-records-empty"
        />
      </Card>
    </div>
  )
}
