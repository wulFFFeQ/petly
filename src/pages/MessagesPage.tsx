import { MessagesPageContent } from '../components/messages/MessagesPageContent'
import { PageHeader } from '../components/ui/PageHeader'

export function MessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        badge="Zabezpečené zprávy"
        meta="Veterináři a ověření majitelé"
        title="Zprávy"
        description="Komunikujte s veterináři, trenéry a komunitou."
        hideOnMobile
        className="pb-0"
      />

      <MessagesPageContent />
    </div>
  )
}
