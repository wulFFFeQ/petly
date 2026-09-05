import { ClipboardPlus, Paperclip, Send } from 'lucide-react'
import type { Conversation, HealthRecord } from '../../types'
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
  shareableRecords: HealthRecord[]
  selectedShareIds: string[]
  onToggleShareSelection: (recordId: string) => void
  onToggleSelectAllShareRecords: () => void
  onShareSelectedRecords: () => void
  onAttachFile: () => void
}

export function MessageComposer({
  conversation: active,
  message,
  onMessageChange,
  onSubmit,
  shareMenuOpen,
  onShareMenuToggle,
  shareMenuRef,
  shareableRecords,
  selectedShareIds,
  onToggleShareSelection,
  onToggleSelectAllShareRecords,
  onShareSelectedRecords,
  onAttachFile,
}: MessageComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="relative flex items-center gap-2 border-t border-[#E8E4DC] bg-white p-3 sm:p-4"
    >
      {active.contactType === 'vet' && active.petId && (
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
            aria-label="Sdílet zdravotní záznamy"
            aria-expanded={shareMenuOpen}
          >
            <ClipboardPlus size={18} />
          </button>
          {shareMenuOpen && (
            <HealthShareMenu
              shareableRecords={shareableRecords}
              selectedShareIds={selectedShareIds}
              onToggleSelection={onToggleShareSelection}
              onToggleSelectAll={onToggleSelectAllShareRecords}
              onShare={onShareSelectedRecords}
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
        placeholder={`Napište zprávu pro ${active.name}...`}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        className="flex-1 h-10 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:bg-white focus:ring-2 focus:ring-[#2C4A3E]/10"
      />

      <button
        type="submit"
        disabled={!message.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2C4A3E] text-white shadow-xs transition-all hover:bg-[#20362E] active:scale-95 disabled:opacity-40 cursor-pointer"
        aria-label="Odeslat zprávu"
      >
        <Send size={16} />
      </button>
    </form>
  )
}
