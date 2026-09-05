import { ImportantContactsSection } from '../components/help/ImportantContactsSection'
import { PageHeader } from '../components/ui/PageHeader'

export function ContactsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        badge="Rychlý přístup"
        meta="Nouzové a klíčové kontakty"
        title="Důležité kontakty"
        description="Veterinární pohotovost, hlavní veterinář, pojišťovna, registr a nouzový kontakt na jedno klepnutí."
      />
      <ImportantContactsSection hideHeader />
    </div>
  )
}
