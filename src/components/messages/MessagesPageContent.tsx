import {
  Archive,
  ArrowLeft,
  Send,
  Search,
  Paperclip,
  Phone,
  Video,
  ShieldCheck,
  CheckCheck,
  ClipboardPlus,
  FileText,
  ExternalLink,
  Syringe,
  Pill,
  Stethoscope,
  FlaskConical,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { conversations as initialConversations, discoverPets, healthRecords } from '../../data/mockData'
import {
  loadArchivedConversationIds,
  saveArchivedConversationIds,
} from '../../lib/archivedConversations'
import { useApp } from '../../context/AppContext'
import type { Conversation, HealthRecord } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'

type ShareCategory = 'vaccination' | 'medication' | 'visit' | 'results'

const SHARE_GROUPS: {
  id: ShareCategory
  label: string
  icon: typeof Syringe
}[] = [
  { id: 'vaccination', label: 'Očkování', icon: Syringe },
  { id: 'medication', label: 'Léky', icon: Pill },
  { id: 'visit', label: 'Návštěvy', icon: Stethoscope },
  { id: 'results', label: 'Výsledky', icon: FlaskConical },
]

function getShareCategory(record: HealthRecord): ShareCategory {
  if (record.type === 'vaccination') return 'vaccination'
  if (record.type === 'medication') return 'medication'
  if (record.type === 'examination' || /laborator|výsledk|vyšetřen/i.test(`${record.title} ${record.subtitle}`)) {
    return 'results'
  }
  return 'visit'
}

function buildHealthShareMessage(record: HealthRecord, index: number) {
  const now = new Date()
  const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return {
    id: `m_share_${Date.now()}_${index}`,
    sender: 'me' as const,
    text: `Sdílen zdravotní záznam: ${record.title}`,
    time: timeString,
    attachment: {
      kind: 'health_record' as const,
      recordId: record.id,
      title: record.title,
      subtitle: record.subtitle,
      date: record.date,
      category: getShareCategory(record),
    },
  }
}

function buildInitialConversations(): Conversation[] {
  const archivedIds = new Set(loadArchivedConversationIds())
  return initialConversations.map((conversation) => ({
    ...conversation,
    archived: archivedIds.has(conversation.id),
  }))
}

export function MessagesPageContent() {
  const { showToast } = useApp()
  const [conversations, setConversations] = useState<Conversation[]>(buildInitialConversations)
  const [listMode, setListMode] = useState<'inbox' | 'archive'>('inbox')
  const [activeId, setActiveId] = useState(() => {
    const initial = buildInitialConversations()
    return initial.find((c) => !c.archived)?.id ?? initial[0]?.id ?? ''
  })
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [selectedShareIds, setSelectedShareIds] = useState<string[]>([])
  const [contactProfileOpen, setContactProfileOpen] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((c) => c.id === activeId)
  const contactPet = active?.contactPetId
    ? discoverPets.find((pet) => pet.id === active.contactPetId)
    : undefined
  const archivedCount = conversations.filter((c) => c.archived).length

  useEffect(() => {
    const archivedIds = conversations.filter((c) => c.archived).map((c) => c.id)
    saveArchivedConversationIds(archivedIds)
  }, [conversations])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages])

  useEffect(() => {
    setContactProfileOpen(false)
  }, [activeId])

  useEffect(() => {
    setShareMenuOpen(false)
    setSelectedShareIds([])
  }, [activeId])

  useEffect(() => {
    if (!shareMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [shareMenuOpen])

  const shareableRecords = active?.petId
    ? healthRecords.filter((r) => r.petId === active.petId)
    : []

  const toggleShareSelection = (recordId: string) => {
    setSelectedShareIds((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId],
    )
  }

  const handleShareSelectedRecords = () => {
    if (!activeId || selectedShareIds.length === 0) return

    const records = shareableRecords.filter((r) => selectedShareIds.includes(r.id))
    const newMsgs = records.map((record, index) => buildHealthShareMessage(record, index))
    const lastMsg = newMsgs[newMsgs.length - 1]

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessage: lastMsg.text,
              time: 'Právě teď',
              messages: [...c.messages, ...newMsgs],
            }
          : c,
      ),
    )
    setShareMenuOpen(false)
    setSelectedShareIds([])

    const countLabel =
      records.length === 1
        ? '1 zdravotní záznam'
        : `${records.length} zdravotní záznamy`
    showToast('Záznamy sdíleny', `${countLabel} odeslán${records.length > 1 ? 'y' : ''} veterináři.`, 'gold')

    if (activeId === 'conv2') {
      setTimeout(() => {
        const replyMsg = {
          id: `m_reply_${Date.now()}`,
          sender: 'them' as const,
          text: 'Děkuji za sdílené údaje. Projdu je a doplním do klinické karty Luny.',
          time: `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`,
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

  const handleArchiveConversation = (conversationId: string) => {
    const target = conversations.find((c) => c.id === conversationId)
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, archived: true, unread: 0 } : c)),
    )

    if (activeId === conversationId) {
      const next = conversations.find((c) => c.id !== conversationId && !c.archived)
      setActiveId(next?.id ?? '')
      setMobileShowChat(false)
    }

    showToast(
      'Konverzace archivována',
      target
        ? `Vlákno s ${target.name} bylo přesunuto do archivu.`
        : 'Vlákno bylo přesunuto do archivu.',
      'info',
    )
  }

  const handleRestoreConversation = (conversationId: string) => {
    const target = conversations.find((c) => c.id === conversationId)
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, archived: false } : c)),
    )
    setListMode('inbox')
    setActiveId(conversationId)
    setMobileShowChat(true)
    showToast(
      'Konverzace obnovena',
      target
        ? `Vlákno s ${target.name} je znovu v aktivních zprávách.`
        : 'Vlákno je znovu v aktivních zprávách.',
      'gold',
    )
  }

  const filteredConversations = conversations.filter((c) => {
    const inCurrentList = listMode === 'archive' ? Boolean(c.archived) : !c.archived
    if (!inCurrentList) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      c.petContext.toLowerCase().includes(q)
    )
  })

  return (
    <>
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-[#191E1B]">Zprávy</h2>
            <Badge variant="gold" size="sm">
              Ověřeno
            </Badge>
          </div>

          <div
            role="tablist"
            aria-label="Přepínač konverzací"
            className="grid grid-cols-2 gap-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={listMode === 'inbox'}
              onClick={() => setListMode('inbox')}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                listMode === 'inbox'
                  ? 'bg-white text-[#2C4A3E] shadow-xs'
                  : 'text-[#5A6660] hover:text-[#234B54]',
              )}
            >
              Aktivní
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={listMode === 'archive'}
              onClick={() => setListMode('archive')}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                listMode === 'archive'
                  ? 'bg-white text-[#2C4A3E] shadow-xs'
                  : 'text-[#5A6660] hover:text-[#234B54]',
              )}
            >
              <Archive size={12} />
              Archiv
              {archivedCount > 0 && (
                <span
                  className={cn(
                    'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold',
                    listMode === 'archive'
                      ? 'bg-[#E0EAEC] text-[#234B54]'
                      : 'bg-[#E8E4DC] text-[#5A6660]',
                  )}
                >
                  {archivedCount}
                </span>
              )}
            </button>
          </div>

          {listMode === 'archive' && (
            <button
              type="button"
              onClick={() => setListMode('inbox')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] cursor-pointer"
            >
              <ArrowLeft size={13} />
              Zpět na aktivní chaty
            </button>
          )}

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3AEA7]"
            />
            <input
              type="text"
              placeholder={
                listMode === 'archive'
                  ? 'Hledat v archivu...'
                  : 'Hledat konverzace...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] pl-8.5 pr-3 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:bg-white focus:ring-2 focus:ring-[#2C4A3E]/10"
            />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EDE6]">
          {filteredConversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Archive size={22} className="mx-auto text-[#C5D0CB]" />
              <p className="mt-2 text-sm font-semibold text-[#191E1B]">
                {listMode === 'archive'
                  ? 'Archiv je prázdný'
                  : 'Žádné aktivní konverzace'}
              </p>
              <p className="mt-1 text-[11px] text-[#7D8B82]">
                {listMode === 'archive'
                  ? 'Archivované chaty se zobrazí tady.'
                  : 'Zkuste jiný filtr nebo obnovte chat z archivu.'}
              </p>
              {listMode === 'archive' && (
                <button
                  type="button"
                  onClick={() => setListMode('inbox')}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  Zpět na aktivní chaty
                </button>
              )}
            </div>
          ) : (
          filteredConversations.map((conv) => {
            const isSelected = activeId === conv.id
            return (
              <div
                key={conv.id}
                className={cn(
                  'group relative flex w-full items-start gap-3.5 p-4 text-left transition-all duration-200',
                  isSelected ? 'bg-[#EBF2EE]' : 'hover:bg-[#FAF8F5]',
                )}
              >
                <button
                  type="button"
                  onClick={() => selectConversation(conv.id)}
                  className="flex min-w-0 flex-1 items-start gap-3.5 text-left cursor-pointer"
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

                    <p className="mt-0.5 text-[10px] font-semibold text-[#234B54] truncate">
                      {conv.petContext}
                    </p>

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
                </button>

                <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                  {conv.unread > 0 && listMode === 'inbox' && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2C4A3E] text-[10px] font-bold text-white shadow-xs">
                      {conv.unread}
                    </span>
                  )}
                  {listMode === 'archive' ? (
                    <button
                      type="button"
                      onClick={() => handleRestoreConversation(conv.id)}
                      title="Obnovit konverzaci"
                      aria-label={`Obnovit konverzaci s ${conv.name}`}
                      className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-[#234B54] hover:bg-white cursor-pointer"
                    >
                      Obnovit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleArchiveConversation(conv.id)}
                      title="Archivovat konverzaci"
                      aria-label={`Archivovat konverzaci s ${conv.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#A3AEA7] opacity-0 transition-all hover:bg-white hover:text-[#234B54] group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                    >
                      <Archive size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
          )}
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
                <button
                  type="button"
                  onClick={() => setContactProfileOpen(true)}
                  className="rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4A3E]/30"
                  aria-label={`Otevřít profil ${active.name}`}
                >
                  <Avatar
                    src={active.avatar}
                    alt={active.name}
                    size="sm"
                    status={active.online ? 'online' : 'offline'}
                  />
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setContactProfileOpen(true)}
                      className="text-sm font-bold text-[#191E1B] hover:text-[#234B54] hover:underline underline-offset-2 transition-colors cursor-pointer text-left"
                    >
                      {active.name}
                    </button>
                    {active.role?.includes('veterinář') && (
                      <ShieldCheck size={14} className="text-[#2C4A3E]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#7D8B82]">
                    {active.online ? 'Právě online' : 'Naposledy aktivní před 2 h'}
                    {active.role && ` · ${active.role}`}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#234B54]">
                    {active.petContext}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {contactPet && (
                      <Link
                        to={`/discover/${contactPet.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                      >
                        <ExternalLink size={10} />
                        Profil {contactPet.name}
                      </Link>
                    )}
                    {active.petId && active.contactType === 'vet' && (
                      <>
                        <Link
                          to={`/pets/${active.petId}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                        >
                          <ExternalLink size={10} />
                          Profil mazlíčka
                        </Link>
                        <Link
                          to="/health"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                        >
                          <FileText size={10} />
                          Zdravotní záznamy
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {active.archived ? (
                  <button
                    type="button"
                    onClick={() => handleRestoreConversation(active.id)}
                    className="rounded-xl px-2.5 py-2 text-[11px] font-semibold text-[#234B54] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                    aria-label="Obnovit konverzaci"
                    title="Obnovit konverzaci"
                  >
                    Obnovit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleArchiveConversation(active.id)}
                    className="rounded-xl p-2 text-[#7D8B82] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
                    aria-label="Archivovat konverzaci"
                    title="Archivovat konverzaci"
                  >
                    <Archive size={17} />
                  </button>
                )}
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
                      {msg.attachment?.kind === 'health_record' ? (
                        <div
                          className={cn(
                            'rounded-xl border px-3 py-2.5',
                            isMe
                              ? 'border-white/20 bg-white/10'
                              : 'border-[#E8E4DC] bg-[#FAF8F5]',
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                                isMe ? 'bg-white/15 text-white' : 'bg-[#E0EAEC] text-[#234B54]',
                              )}
                            >
                              <FileText size={13} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-bold">{msg.attachment.title}</p>
                                {msg.attachment.category && (
                                  <span
                                    className={cn(
                                      'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                                      isMe
                                        ? 'bg-white/15 text-white/90'
                                        : 'bg-[#E0EAEC] text-[#234B54]',
                                    )}
                                  >
                                    {
                                      SHARE_GROUPS.find((g) => g.id === msg.attachment?.category)
                                        ?.label
                                    }
                                  </span>
                                )}
                              </div>
                              <p
                                className={cn(
                                  'mt-0.5',
                                  isMe ? 'text-white/80' : 'text-[#5A6660]',
                                )}
                              >
                                {msg.attachment.subtitle}
                              </p>
                              <p
                                className={cn(
                                  'mt-1 text-[10px] font-medium',
                                  isMe ? 'text-white/70' : 'text-[#7D8B82]',
                                )}
                              >
                                {msg.attachment.date}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p>{msg.text}</p>
                      )}
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
              className="relative flex items-center gap-2 border-t border-[#E8E4DC] bg-white p-3 sm:p-4"
            >
              {active.contactType === 'vet' && active.petId && (
                <div className="relative" ref={shareMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShareMenuOpen((open) => !open)}
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
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-lg">
                      <div className="border-b border-[#F0EDE6] px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                          Sdílet zdravotní údaje
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5A6660]">
                          Vyberte záznamy, které chcete odeslat veterináři.
                        </p>
                      </div>

                      <div className="max-h-64 overflow-y-auto py-1">
                        {SHARE_GROUPS.map((group) => {
                          const groupRecords = shareableRecords.filter(
                            (r) => getShareCategory(r) === group.id,
                          )
                          if (groupRecords.length === 0) return null
                          const GroupIcon = group.icon

                          return (
                            <div key={group.id} className="px-2 py-1">
                              <div className="flex items-center gap-1.5 px-1 py-1.5">
                                <GroupIcon size={12} className="text-[#234B54]" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                                  {group.label}
                                </span>
                              </div>
                              <ul>
                                {groupRecords.map((record) => {
                                  const isSelected = selectedShareIds.includes(record.id)
                                  return (
                                    <li key={record.id}>
                                      <label
                                        className={cn(
                                          'flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition-colors',
                                          isSelected
                                            ? 'bg-[#EBF2EE]'
                                            : 'hover:bg-[#FAF8F5]',
                                        )}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleShareSelection(record.id)}
                                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-[#C5D0CB] text-[#234B54] focus:ring-[#234B54]/20"
                                        />
                                        <span className="min-w-0 flex-1">
                                          <span className="block text-xs font-bold text-[#191E1B]">
                                            {record.title}
                                          </span>
                                          <span className="mt-0.5 block text-[11px] text-[#5A6660]">
                                            {record.subtitle}
                                          </span>
                                          <span className="mt-0.5 block text-[10px] font-medium text-[#7D8B82]">
                                            {record.date}
                                          </span>
                                        </span>
                                      </label>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )
                        })}

                        {shareableRecords.length === 0 && (
                          <p className="px-3 py-4 text-center text-[11px] text-[#7D8B82]">
                            Pro tohoto mazlíčka zatím nejsou dostupné záznamy.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-[#F0EDE6] bg-[#FAF8F5] px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedShareIds(
                              selectedShareIds.length === shareableRecords.length
                                ? []
                                : shareableRecords.map((r) => r.id),
                            )
                          }
                          disabled={shareableRecords.length === 0}
                          className="text-[11px] font-semibold text-[#234B54] hover:text-[#B8934A] disabled:opacity-40 cursor-pointer"
                        >
                          {selectedShareIds.length === shareableRecords.length
                            ? 'Zrušit výběr'
                            : 'Vybrat vše'}
                        </button>
                        <button
                          type="button"
                          onClick={handleShareSelectedRecords}
                          disabled={selectedShareIds.length === 0}
                          className="rounded-lg bg-[#234B54] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#1a383f] disabled:opacity-40 cursor-pointer"
                        >
                          Sdílet{selectedShareIds.length > 0 ? ` (${selectedShareIds.length})` : ''}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

    {active && (
      <Modal
        open={contactProfileOpen}
        onClose={() => setContactProfileOpen(false)}
        title={active.name}
        subtitle="Profil uživatele"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            <Avatar
              src={active.avatar}
              alt={active.name}
              size="lg"
              status={active.online ? 'online' : 'offline'}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-base font-bold text-[#191E1B]">{active.name}</h3>
                {active.role?.includes('veterinář') && (
                  <ShieldCheck size={15} className="text-[#2C4A3E]" />
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#7D8B82]">
                {active.online ? 'Právě online' : 'Naposledy aktivní před 2 h'}
              </p>
              <Badge variant="outline" size="sm" className="mt-2">
                {active.contactType === 'vet'
                  ? 'Veterinář'
                  : active.contactType === 'trainer'
                    ? 'Trenér'
                    : 'Komunita'}
              </Badge>
            </div>
          </div>

          {contactPet ? (
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Mazlíček tohoto uživatele
                </p>
                {active.role && (
                  <Link
                    to={`/discover/${contactPet.id}`}
                    onClick={() => setContactProfileOpen(false)}
                    className="mt-1 inline-flex text-sm font-semibold text-[#234B54] hover:text-[#B8934A] hover:underline underline-offset-2 transition-colors"
                  >
                    {active.role}
                  </Link>
                )}
              </div>

              <Link
                to={`/discover/${contactPet.id}`}
                onClick={() => setContactProfileOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-white p-2.5 transition-colors hover:border-[#234B54]/30 hover:bg-white"
              >
                <img
                  src={contactPet.image}
                  alt={contactPet.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#191E1B]">{contactPet.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#5A6660]">
                    {contactPet.breed}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#234B54]">
                    Otevřít profil mazlíčka →
                  </p>
                </div>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Kontext
              </p>
              <p className="mt-0.5 text-sm font-medium text-[#234B54]">{active.petContext}</p>
              {active.role && (
                <p className="mt-2 text-xs text-[#5A6660]">{active.role}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {contactPet && (
              <Link
                to={`/discover/${contactPet.id}`}
                onClick={() => setContactProfileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-xs font-semibold text-[#234B54] hover:border-[#234B54]/30 hover:bg-[#FAF8F5] transition-colors"
              >
                <ExternalLink size={13} />
                Otevřít profil {contactPet.name}
              </Link>
            )}
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => setContactProfileOpen(false)}
            >
              Zpět ke konverzaci
            </Button>
          </div>
        </div>
      </Modal>
    )}
    </>
  )
}
