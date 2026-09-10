import { Search } from 'lucide-react'
import { EmptyState } from '../ui/EmptyState'

interface ProfessionalCatalogEmptyProps {
  /** True when there are no public professionals at all (before filters). */
  nonePublic: boolean
}

export function ProfessionalCatalogEmpty({ nonePublic }: ProfessionalCatalogEmptyProps) {
  if (nonePublic) {
    return (
      <div className="col-span-full" data-testid="professional-catalog-empty-none">
        <EmptyState
          icon={Search}
          title="Zatím zde nejsou žádné veřejné profesionální profily."
          description="Až profesionálové zveřejní svůj profil, najdete je zde."
        />
      </div>
    )
  }

  return (
    <div className="col-span-full" data-testid="professional-catalog-empty-filtered">
      <EmptyState
        icon={Search}
        title="Žádní profesionálové neodpovídají vašemu hledání."
        description="Zkuste změnit kategorii nebo rozšířit lokalitu."
      />
    </div>
  )
}
