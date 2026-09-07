import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { getOrCreateReporterAnonymousId } from '../../../lib/lostPet'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

interface LostPetAnonymousChatProps {
  announcementId: string
  petName: string
  conversationId?: string
}

export function LostPetAnonymousChat({
  announcementId,
  petName,
  conversationId: initialConversationId,
}: LostPetAnonymousChatProps) {
  const { getLostChatThreadForFinder, sendLostFinderMessage, lostConversations } = useApp()
  const finderId = getOrCreateReporterAnonymousId()
  const thread = getLostChatThreadForFinder(announcementId, finderId)
  const conversationId =
    initialConversationId ||
    thread?.conversationId ||
    lostConversations.find(
      (c) => c.lostAnnouncementId === announcementId && c.finderAnonymousId === finderId,
    )?.id

  const [text, setText] = useState('')

  if (!conversationId || !thread) {
    return null
  }

  return (
    <Card variant="elevated" padding="md" className="mt-6">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8934A]">
        Anonymní kontakt · {petName}
      </p>
      <p className="mt-1 text-xs text-[#7D8B82]">
        Majitel neuvidí váš telefon ani e-mail. Komunikace probíhá přes LOVED &amp; KNOWN.
      </p>
      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl bg-[#FAF8F5] p-3">
        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl px-3 py-2 text-sm ${
              msg.sender === 'finder'
                ? 'ml-6 bg-[#2C4A3E] text-white'
                : 'mr-6 bg-white border border-[#E8E4DC] text-[#191E1B]'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          sendLostFinderMessage(conversationId, text, 'finder')
          setText('')
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Zpráva majiteli…"
          className="h-10 flex-1 rounded-xl border border-[#E8E4DC] px-3 text-sm outline-none focus:border-[#2C4A3E]"
        />
        <Button type="submit" variant="primary" size="sm" disabled={!text.trim()}>
          Odeslat
        </Button>
      </form>
    </Card>
  )
}
