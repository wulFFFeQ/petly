import { ClipboardPlus, Paperclip, Send } from 'lucide-react'
import type { Conversation } from '../../types'
import { cn } from '../../lib/utils'
import { HealthShareMenu } from './HealthShareMenu'

interface MessageComposerProps {
  conversation: Conversation
  message: string
  onMessageChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  shareMenuOpen: boolean
  onShareMenuToggle: () => void
  shareMenuRef: React.RefObject<HTMLDivElement | null>
  onAttachFile: () => void
  onShared?: () => void
}

export function MessageComposer({
  conversation: active,
  message,
  onMessageChange,
  onSubmit,
  shareMenuOpen,
  onShareMenuToggle,
  shareMenuRef,
  onAttachFile,
  onShared,
}: MessageComposerProps) {
  const showShare = Boolean(active.petId && active.participantAccountIds?.length)

  return (
    <form
      onSubmit={onSubmit}
      className="relative flex items-center gap-2 border-t border-[#E8E4DC] bg-white p-3 sm:p-4"
    >
      {showShare && (
        <div className="relative" ref={shareMenuRef}>
          <button
            type="button"
            onClick={onShareMenuToggle}
            className={cn(
              'rounded-xl p-2 transition-colors cursor-pointer',
              shareMenuOpen
                ? 'bg-[#E0EAEC] text-[#234B54]'
                : 'text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#234B54]',
            )}
            aria-label="Sdílet klinický záznam"
            aria-expanded={shareMenuOpen}
            data-testid="messages-clinical-share-toggle"
          >
            <ClipboardPlus size={18} />
          </button>
          {shareMenuOpen && (
            <HealthShareMenu
              conversation={active}
              onClose={() => onShareMenuToggle()}
              onShared={onShared}
            />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onAttachFile}
        className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
        aria-label="Přiložit soubor"
      >
        <Paperclip size={18} />
      </button>

      <input
        type="text"
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Napište zprávu…"
        className="h-10 flex-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm outline-none focus:border-[#234B54] focus:bg-white"
      />

      <button
        type="submit"
        className="rounded-xl bg-[#234B54] p-2.5 text-white hover:bg-[#1a3a41] transition-colors cursor-pointer"
        aria-label="Odeslat"
      >
        <Send size={16} />
      </button>
    </form>
  )
}
