import { Send } from 'lucide-react'

interface BookingMessageComposerProps {
  message: string
  onMessageChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled?: boolean
}

/**
 * Simple booking/professional compose UX.
 * Extension point: attachments / media / AI — not wired yet.
 */
export function BookingMessageComposer({
  message,
  onMessageChange,
  onSubmit,
  disabled,
}: BookingMessageComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 border-t border-[#E8E4DC] bg-white p-3 sm:p-4"
      data-testid="booking-message-composer"
    >
      <textarea
        rows={1}
        placeholder="Napište zprávu…"
        value={message}
        disabled={disabled}
        data-testid="booking-message-input"
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (message.trim() && !disabled) {
              onSubmit(e)
            }
          }
        }}
        className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-2.5 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:bg-white focus:ring-2 focus:ring-[#2C4A3E]/10"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        data-testid="booking-message-send"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2C4A3E] text-white shadow-xs transition-all hover:bg-[#20362E] active:scale-95 disabled:opacity-40 cursor-pointer"
        aria-label="Odeslat"
      >
        <Send size={16} />
      </button>
    </form>
  )
}
