import { SafeContactChat } from './SafeContactChat'

/** @deprecated Prefer SafeContactChat — kept as thin alias for existing imports. */
export function LostPetAnonymousChat(props: {
  announcementId: string
  petName: string
  conversationId?: string
}) {
  return (
    <SafeContactChat
      role="finder"
      announcementId={props.announcementId}
      conversationId={props.conversationId}
      className="mt-6"
    />
  )
}
