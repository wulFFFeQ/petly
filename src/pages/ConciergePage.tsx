import { ConciergeSection } from '../components/help/ConciergeSection'
import { PageHeader } from '../components/ui/PageHeader'

export function ConciergePage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Služby"
        description="Praktická pomoc, důležité kontakty a péče pro vás i vaše mazlíčky."
      />
      <ConciergeSection hideHeader />
    </div>
  )
}
