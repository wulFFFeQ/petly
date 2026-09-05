import type { Conversation, DiscoverPet, HealthRecord } from '../../types'
import { cn } from '../../lib/utils'
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
  shareableRecords: HealthRecord[]
  selectedShareIds: string[]
  onToggleShareSelection: (recordId: string) => void
  onToggleSelectAllShareRecords: () => void
  onShareSelectedRecords: () => void
  onAttachFile: () => void
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
  shareableRecords,
  selectedShareIds,
  onToggleShareSelection,
  onToggleSelectAllShareRecords,
  onShareSelectedRecords,
  onAttachFile,
}: ChatThreadProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col bg-[#FAF8F5]',
        !mobileShowChat ? 'hidden md:flex' : 'flex',
      )}
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
          <MessageThread conversation={active} chatEndRef={chatEndRef} />
          <MessageComposer
            conversation={active}
            message={message}
            onMessageChange={onMessageChange}
            onSubmit={onSubmitMessage}
            shareMenuOpen={shareMenuOpen}
            onShareMenuToggle={onShareMenuToggle}
            shareMenuRef={shareMenuRef}
            shareableRecords={shareableRecords}
            selectedShareIds={selectedShareIds}
            onToggleShareSelection={onToggleShareSelection}
            onToggleSelectAllShareRecords={onToggleSelectAllShareRecords}
            onShareSelectedRecords={onShareSelectedRecords}
            onAttachFile={onAttachFile}
          />
        </>
      ) : (
        <ChatEmptyState />
      )}
    </div>
  )
}
