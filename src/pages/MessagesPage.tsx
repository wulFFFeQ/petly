import { MessagesPageContent } from '../components/messages/MessagesPageContent'
import { PageHeader } from '../components/ui/PageHeader'

export function MessagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        badge="Zprávy"
        meta="DEMO komunikace v prohlížeči"
        title="Zprávy"
        description="Komunikujte s veterináři, trenéry a komunitou (lokální DEMO)."
        hideOnMobile
        className="pb-0"
      />

      <MessagesPageContent />
    </div>
  )
}
