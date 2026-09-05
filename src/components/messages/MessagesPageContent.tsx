import { useState, useRef, useEffect } from 'react'
import { discoverPets, healthRecords } from '../../data/mockData'
import { saveConversationPrefs } from '../../lib/archivedConversations'
import { useApp } from '../../context/AppContext'
import type { Conversation } from '../../types'
import { Card } from '../ui/Card'
import { ChatThread } from './ChatThread'
import { ContactProfileModal } from './ContactProfileModal'
import { ConversationSidebar } from './ConversationSidebar'
import { buildHealthShareMessage, buildInitialConversations } from './messageShareUtils'

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
    const unreadById: Record<string, number> = {}
    for (const conversation of conversations) {
      unreadById[conversation.id] = conversation.unread
    }
    saveConversationPrefs({
      archivedIds: conversations.filter((c) => c.archived).map((c) => c.id),
      unreadById,
    })
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
        <ConversationSidebar
          listMode={listMode}
          onListModeChange={setListMode}
          search={search}
          onSearchChange={setSearch}
          archivedCount={archivedCount}
          filteredConversations={filteredConversations}
          activeId={activeId}
          mobileShowChat={mobileShowChat}
          onSelectConversation={selectConversation}
          onArchiveConversation={handleArchiveConversation}
          onRestoreConversation={handleRestoreConversation}
        />

        <ChatThread
          conversation={active}
          contactPet={contactPet}
          mobileShowChat={mobileShowChat}
          chatEndRef={chatEndRef}
          message={message}
          onMessageChange={setMessage}
          onSubmitMessage={handleSendMessage}
          onBack={() => setMobileShowChat(false)}
          onOpenProfile={() => setContactProfileOpen(true)}
          onArchive={() => handleArchiveConversation(active!.id)}
          onRestore={() => handleRestoreConversation(active!.id)}
          onCall={() =>
            showToast('Hlasový hovor zahájen', `Připojování k ${active!.name}...`, 'info')
          }
          onVideoCall={() =>
            showToast(
              'Vzdálená videokonzultace',
              `Otevírání video odkazu pro ${active!.name}...`,
              'gold',
            )
          }
          shareMenuOpen={shareMenuOpen}
          onShareMenuToggle={() => setShareMenuOpen((open) => !open)}
          shareMenuRef={shareMenuRef}
          shareableRecords={shareableRecords}
          selectedShareIds={selectedShareIds}
          onToggleShareSelection={toggleShareSelection}
          onToggleSelectAllShareRecords={() =>
            setSelectedShareIds(
              selectedShareIds.length === shareableRecords.length
                ? []
                : shareableRecords.map((r) => r.id),
            )
          }
          onShareSelectedRecords={handleShareSelectedRecords}
          onAttachFile={() =>
            showToast('Příloha souboru', 'Vyberte veterinární PDF nebo fotografii.', 'info')
          }
        />
      </Card>

      {active && (
        <ContactProfileModal
          conversation={active}
          contactPet={contactPet}
          open={contactProfileOpen}
          onClose={() => setContactProfileOpen(false)}
        />
      )}
    </>
  )
}
