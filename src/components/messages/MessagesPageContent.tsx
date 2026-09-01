import {
  ArrowLeft,
  Send,
  Search,
  Paperclip,
  Phone,
  Video,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { conversations as initialConversations } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type { Conversation } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

export function MessagesPageContent() {
  const { showToast } = useApp()
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? '')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((c) => c.id === activeId)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages])

  const selectConversation = (id: string) => {
    setActiveId(id)
    setMobileShowChat(true)
    // mark read
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    )
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !activeId) return

    const now = new Date()
    const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

    const newMsg = {
      id: `m_${Date.now()}`,
      sender: 'me' as const,
      text: message.trim(),
      time: timeString,
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessage: newMsg.text,
              time: 'Právě teď',
              messages: [...c.messages, newMsg],
            }
          : c,
      ),
    )

    setMessage('')

    // Simulate polite automated reply from Vet or Friend after 1.5s
    if (activeId === 'conv2') {
      setTimeout(() => {
        const replyMsg = {
          id: `m_reply_${Date.now()}`,
          sender: 'them' as const,
          text: 'Děkuji za aktualizaci, Terezo. Zaznamenám to do klinické karty Luny.',
          time: `${now.getHours()}:${String(now.getMinutes() + 1).padStart(2, '0')}`,
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  lastMessage: replyMsg.text,
                  time: 'Právě teď',
                  messages: [...c.messages, replyMsg],
                }
              : c,
          ),
        )
      }, 1400)
    }
  }

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <Card
      variant="elevated"
      padding="none"
      className="flex h-[calc(100vh-210px)] min-h-[540px] max-h-[800px] overflow-hidden"
    >
      {/* Left Column: Conversation List */}
      <div
        className={cn(
          'w-full border-r border-[#E8E4DC] md:w-80 lg:w-96 flex flex-col bg-white',
          mobileShowChat ? 'hidden md:flex' : 'flex',
        )}
      >
        {/* Search header */}
        <div className="p-4 border-b border-[#F0EDE6] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#191E1B]">Konverzace</h2>
            <Badge variant="gold" size="sm">
              Ověřeno
            </Badge>
          </div>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3AEA7]"
            />
            <input
              type="text"
              placeholder="Hledat konverzace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] pl-8.5 pr-3 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:bg-white focus:ring-2 focus:ring-[#2C4A3E]/10"
            />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE6]">
          {filteredConversations.map((conv) => {
            const isSelected = activeId === conv.id
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={cn(
                  'flex w-full items-start gap-3.5 p-4 text-left transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'bg-[#EBF2EE]'
                    : 'hover:bg-[#FAF8F5]',
                )}
              >
                <Avatar
                  src={conv.avatar}
                  alt={conv.name}
                  size="md"
                  status={conv.online ? 'online' : 'offline'}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'text-sm font-bold truncate',
                        isSelected ? 'text-[#2C4A3E]' : 'text-[#191E1B]',
                      )}
                    >
                      {conv.name}
                    </span>
                    <span className="text-[10px] font-medium text-[#7D8B82] shrink-0">
                      {conv.time}
                    </span>
                  </div>

                  {conv.role && (
                    <p className="text-[11px] text-[#7D8B82] font-medium truncate">
                      {conv.role}
                    </p>
                  )}

                  <p
                    className={cn(
                      'text-xs truncate mt-1',
                      conv.unread > 0
                        ? 'font-bold text-[#191E1B]'
                        : 'text-[#4A564F]',
                    )}
                  >
                    {conv.lastMessage}
                  </p>
                </div>

                {conv.unread > 0 && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2C4A3E] text-[10px] font-bold text-white shadow-xs">
                    {conv.unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Column: Chat Room Window */}
      <div
        className={cn(
          'flex flex-1 flex-col bg-[#FAF8F5]',
          !mobileShowChat ? 'hidden md:flex' : 'flex',
        )}
      >
        {active ? (
          <>
            {/* Chat Top Bar */}
            <div className="flex items-center justify-between border-b border-[#E8E4DC] bg-white px-5 py-3.5 shadow-xs">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="rounded-xl p-1.5 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#191E1B] md:hidden cursor-pointer"
                  aria-label="Zpět ke konverzacím"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar
                  src={active.avatar}
                  alt={active.name}
                  size="sm"
                  status={active.online ? 'online' : 'offline'}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#191E1B]">
                      {active.name}
                    </span>
                    {active.role?.includes('veterinář') && (
                      <ShieldCheck size={14} className="text-[#2C4A3E]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#7D8B82]">
                    {active.online ? 'Právě online' : 'Naposledy aktivní před 2 h'}
                    {active.role && ` · ${active.role}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => showToast('Hlasový hovor zahájen', `Připojování k ${active.name}...`, 'info')}
                  className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
                  aria-label="Hlasový hovor"
                >
                  <Phone size={17} />
                </button>
                <button
                  onClick={() => showToast('Vzdálená videokonzultace', `Otevírání video odkazu pro ${active.name}...`, 'gold')}
                  className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
                  aria-label="Videohovor"
                >
                  <Video size={17} />
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
              <div className="text-center my-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A3AEA7] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E4DC]">
                  Šifrovaný kanál péče o mazlíčky
                </span>
              </div>

              {active.messages.map((msg) => {
                const isMe = msg.sender === 'me'
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-2',
                      isMe ? 'justify-end' : 'justify-start',
                    )}
                  >
                    {!isMe && (
                      <Avatar src={active.avatar} alt={active.name} size="xs" />
                    )}
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed',
                        isMe
                          ? 'bg-[#2C4A3E] text-white rounded-br-xs'
                          : 'bg-white border border-[#E8E4DC] text-[#191E1B] rounded-bl-xs',
                      )}
                    >
                      <p>{msg.text}</p>
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-[10px]',
                          isMe ? 'text-white/70' : 'text-[#7D8B82]',
                        )}
                      >
                        <span>{msg.time}</span>
                        {isMe && <CheckCheck size={12} className="text-white/80" />}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t border-[#E8E4DC] bg-white p-3 sm:p-4"
            >
              <button
                type="button"
                onClick={() => showToast('Příloha souboru', 'Vyberte veterinární PDF nebo fotografii.', 'info')}
                className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
                aria-label="Přiložit soubor"
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                placeholder={`Napište zprávu pro ${active.name}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-xs text-[#7D8B82]">
            Vyberte konverzaci a začněte psát.
          </div>
        )}
      </div>
    </Card>
  )
}
