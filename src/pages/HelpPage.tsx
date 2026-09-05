import { HelpGuidesSection } from '../components/help/HelpGuidesSection'
import { PageHeader } from '../components/ui/PageHeader'
import { BRAND_NAME } from '../lib/brand'

export function HelpPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        badge="Podpora"
        meta="Nápověda a podpora"
        title="Nápověda a podpora"
        description={`Jednoduché návody a odpovědi, jak používat ${BRAND_NAME}.`}
      />
      <HelpGuidesSection />
    </div>
  )
}
