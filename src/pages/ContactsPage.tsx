import { ImportantContactsSection } from '../components/help/ImportantContactsSection'
import { PageHeader } from '../components/ui/PageHeader'

export function ContactsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Služby"
        description="Praktická pomoc, důležité kontakty a péče pro vás i vaše mazlíčky."
      />
      <ImportantContactsSection hideHeader />
    </div>
  )
}
