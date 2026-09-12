import type { Conversation, DiscoverPet } from '../../types'
import { cn } from '../../lib/utils'
import { BookingContextBanner } from './BookingContextBanner'
import { BookingMessageComposer } from './BookingMessageComposer'
import { ChatEmptyState } from './ChatEmptyState'
import { ChatThreadHeader } from './ChatThreadHeader'
import { MessageComposer } from './MessageComposer'
import { MessageThread } from './MessageThread'

interface ChatThreadProps {
  conversation?: Conversation
  contactPet?: DiscoverPet
  mobileShowChat: boolean
  chatEndRef: React.RefObject<HTMLDivElement | null>
  message: string
  onMessageChange: (value: string) => void
  onSubmitMessage: (e: React.FormEvent) => void
  onBack: () => void
  onOpenProfile: () => void
  onArchive: () => void
  onRestore: () => void
  onCall: () => void
  onVideoCall: () => void
  shareMenuOpen: boolean
  onShareMenuToggle: () => void
  shareMenuRef: React.RefObject<HTMLDivElement | null>
  onAttachFile: () => void
}

function isAccountThread(c: Conversation): boolean {
  return Boolean(c.participantAccountIds?.length) || c.contactType === 'professional'
}

export function ChatThread({
  conversation: active,
  contactPet,
  mobileShowChat,
  chatEndRef,
  message,
  onMessageChange,
  onSubmitMessage,
  onBack,
  onOpenProfile,
  onArchive,
  onRestore,
  onCall,
  onVideoCall,
  shareMenuOpen,
  onShareMenuToggle,
  shareMenuRef,
  onAttachFile,
}: ChatThreadProps) {
  const accountThread = active ? isAccountThread(active) : false

  return (
    <div
      className={cn(
        'flex flex-1 flex-col bg-[#FAF8F5]',
        !mobileShowChat ? 'hidden md:flex' : 'flex',
      )}
      data-testid="chat-thread"
    >
      {active ? (
        <>
          <ChatThreadHeader
            conversation={active}
            contactPet={contactPet}
            onBack={onBack}
            onOpenProfile={onOpenProfile}
            onArchive={onArchive}
            onRestore={onRestore}
            onCall={onCall}
            onVideoCall={onVideoCall}
          />
          {accountThread ? <BookingContextBanner conversation={active} /> : null}
          <MessageThread conversation={active} chatEndRef={chatEndRef} />
          {accountThread ? (
            <BookingMessageComposer
              message={message}
              onMessageChange={onMessageChange}
              onSubmit={onSubmitMessage}
            />
          ) : (
            <MessageComposer
              conversation={active}
              message={message}
              onMessageChange={onMessageChange}
              onSubmit={onSubmitMessage}
              shareMenuOpen={shareMenuOpen}
              onShareMenuToggle={onShareMenuToggle}
              shareMenuRef={shareMenuRef}
              onAttachFile={onAttachFile}
            />
          )}
        </>
      ) : (
        <ChatEmptyState />
      )}
    </div>
  )
}
