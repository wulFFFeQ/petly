import { MessagesPageContent } from '../../components/messages/MessagesPageContent'
import { PageHeader } from '../../components/ui/PageHeader'
import { getUnreadCountForAccount } from '../../lib/messaging'
import { getSelfAccount } from '../../lib/account'

export function ProfessionalMessagesPage() {
  const self = getSelfAccount()
  const unread = self?.id ? getUnreadCountForAccount(self.id) : 0

  return (
    <div className="space-y-6" data-testid="professional-messages-root">
      <PageHeader
        badge="Zprávy"
        meta={unread > 0 ? `Nepřečtené: ${unread}` : 'Inbox s majiteli'}
        title="Zprávy"
        description="Komunikace s majiteli mazlíčků vázaná na rezervace."
        hideOnMobile
        className="pb-0"
      />
      <MessagesPageContent variant="professional" />
    </div>
  )
}
