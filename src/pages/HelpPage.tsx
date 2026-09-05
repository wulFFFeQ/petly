import { ConciergeSection } from '../components/help/ConciergeSection'
import { HelpGuidesSection } from '../components/help/HelpGuidesSection'
import { ImportantContactsSection } from '../components/help/ImportantContactsSection'
import { TravelPackageSection } from '../components/help/TravelPackageSection'
import { PageHeader } from '../components/ui/PageHeader'
import { BRAND_NAME } from '../lib/brand'

export function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        badge="Podpora péče"
        meta="Znalostní báze a concierge"
        title="Nápověda a concierge péče o mazlíčky"
        description={`Návody, důležité kontakty, cestovní balíčky a nonstop ${BRAND_NAME} Concierge.`}
      />

      <ConciergeSection />
      <ImportantContactsSection />
      <TravelPackageSection />
      <HelpGuidesSection />
    </div>
  )
}
