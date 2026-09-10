import { TravelPackageSection } from '../components/help/TravelPackageSection'
import { PageHeader } from '../components/ui/PageHeader'

export function TravelPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Služby"
        description="Praktická pomoc, důležité kontakty a péče pro vás i vaše mazlíčky."
      />
      <TravelPackageSection hideHeader />
    </div>
  )
}
