import { TravelPackageSection } from '../components/help/TravelPackageSection'
import { PageHeader } from '../components/ui/PageHeader'

export function TravelPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        badge="Cestování"
        meta="Příprava cesty se zvířetem"
        title="Cestování"
        description="Zkontrolujte požadavky destinace, dokumenty a připravenost mazlíčka před odjezdem."
      />
      <TravelPackageSection hideHeader />
    </div>
  )
}
