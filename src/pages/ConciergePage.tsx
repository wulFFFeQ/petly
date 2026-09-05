import { ConciergeSection } from '../components/help/ConciergeSection'
import { PageHeader } from '../components/ui/PageHeader'
import { BRAND_NAME } from '../lib/brand'

export function ConciergePage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        badge="Asistence"
        meta="Osobní podpora péče"
        title="Concierge"
        description={`${BRAND_NAME} Concierge vám pomůže s veterinární péčí, cestováním, převozem i pet-sittingem.`}
      />
      <ConciergeSection hideHeader />
    </div>
  )
}
