import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bumpDiscoverEngagement, getDiscoverPetById } from '../../lib/discover'
import { saveConversationPrefs } from '../../lib/archivedConversations'
import { savePersistedInboxConversations } from '../../lib/messages/inboxStorage'
import {
  accessConversationRequest,
  canAccessConversation,
  getConversation,
  listConversationsForAccount,
  markConversationReadRequest,
  openBookingConversationRequest,
  projectConversationForViewer,
  sendMessageRequest,
  sortConversationsForInbox,
} from '../../lib/messaging'
import { getSelfAccount } from '../../lib/account'
import { useApp } from '../../context/AppContext'
import type { Conversation } from '../../types'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ChatThread } from './ChatThread'
import { ContactProfileModal } from './ContactProfileModal'
import { ConversationSidebar } from './ConversationSidebar'
import { SafeContactChat } from '../pets/lost/SafeContactChat'
import {
  buildConversationFromCommunityAuthor,
  buildConversationFromDiscoverPet,
  buildInitialConversations,
} from './messageShareUtils'
import { takeConnectMessageDraft } from '../../lib/connections'

function isAccountThread(c: Conversation): boolean {
  return Boolean(c.participantAccountIds?.length) || c.contactType === 'professional'
}

export type MessagesPageVariant = 'consumer' | 'professional'

export function MessagesPageContent({
  variant = 'consumer',
}: {
  variant?: MessagesPageVariant
}) {
  const { showToast, lostConversations, sendLostFinderMessage, upsertNotification, pets, photos } =
    useApp()
  const self = getSelfAccount()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const initial = buildInitialConversations()
    if (variant === 'professional' && self?.id) {
      return listConversationsForAccount(self.id, { professionalOnly: true })
    }
    return initial
  })
  const [listMode, setListMode] = useState<'inbox' | 'archive'>('inbox')
  const [activeId, setActiveId] = useState(() => {
    const initial =
      variant === 'professional' && self?.id
        ? listConversationsForAccount(self.id, { professionalOnly: true })
        : buildInitialConversations()
    return initial.find((c) => !c.archived)?.id ?? initial[0]?.id ?? ''
  })
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [contactProfileOpen, setContactProfileOpen] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  const refreshAccountThreads = () => {
    if (!self?.id) return
    if (variant === 'professional') {
      setConversations(listConversationsForAccount(self.id, { professionalOnly: true }))
      return
    }
    setConversations((prev) => {
      const accountThreads = listConversationsForAccount(self.id)
      const accountIds = new Set(accountThreads.map((c) => c.id))
      const legacy = prev.filter((c) => !accountIds.has(c.id) && !isAccountThread(c))
      const merged = [...accountThreads, ...legacy]
      return sortConversationsForInbox(merged)
    })
  }

  useEffect(() => {
    const contactPetId = searchParams.get('contactPetId')
    const contactAuthorId = searchParams.get('contactAuthorId')
    const conversationId = searchParams.get('conversationId')
    const bookingId = searchParams.get('bookingId')
    if (!contactPetId && !contactAuthorId && !conversationId && !bookingId) return

    let openedId: string | null = null
    let createdNewDiscoverThread = false

    if (bookingId && self?.id) {
      const result = openBookingConversationRequest(bookingId, self.id)
      if (!result.ok) {
        setAccessDenied(true)
        setActiveId('')
        setSearchParams({}, { replace: true })
        return
      }
      setAccessDenied(false)
      refreshAccountThreads()
      openedId = result.data.id
      setListMode('inbox')
      setActiveId(openedId)
      setMobileShowChat(true)
      markConversationReadRequest(openedId, self.id)
      setSearchParams({}, { replace: true })
      return
    }

    if (conversationId) {
      if (self?.id) {
        const stored = getConversation(conversationId)
        if (stored?.participantAccountIds?.length) {
          const access = accessConversationRequest(conversationId, self.id)
          if (!access.ok) {
            setAccessDenied(true)
            setActiveId('')
            setSearchParams({}, { replace: true })
            return
          }
          setAccessDenied(false)
          refreshAccountThreads()
          markConversationReadRequest(conversationId, self.id)
          setListMode('inbox')
          setActiveId(conversationId)
          setMobileShowChat(true)
          setSearchParams({}, { replace: true })
          return
        }
      }

      setConversations((prev) => {
        const fromLost = lostConversations.find((c) => c.id === conversationId)
        const existing = prev.find((c) => c.id === conversationId)
        if (existing) {
          if (
            existing.participantAccountIds?.length &&
            self?.id &&
            !canAccessConversation(self.id, existing)
          ) {
            return prev
          }
          openedId = existing.id
          return prev.map((c) =>
            c.id === existing.id ? { ...c, archived: false, unread: 0 } : c,
          )
        }
        if (fromLost) {
          openedId = fromLost.id
          return [{ ...fromLost, archived: false, unread: 0 }, ...prev]
        }
        // Unknown ACL conversation — deny if we have a self account and it looks gated
        if (self?.id) {
          const gated = getConversation(conversationId)
          if (gated && !canAccessConversation(self.id, gated)) {
            return prev
          }
        }
        return prev
      })
      if (openedId) {
        setAccessDenied(false)
        setListMode('inbox')
        setActiveId(openedId)
        setMobileShowChat(true)
      } else if (self?.id && getConversation(conversationId)) {
        setAccessDenied(true)
        setActiveId('')
      }
      setSearchParams({}, { replace: true })
      return
    }

    if (variant === 'professional') {
      setSearchParams({}, { replace: true })
      return
    }

    if (contactAuthorId) {
      const contactName = searchParams.get('contactName') || 'Uživatel komunity'
      const contactAvatar =
        searchParams.get('contactAvatar') ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85'
      const contactRole = searchParams.get('contactRole') || undefined

      setConversations((prev) => {
        const existing = prev.find(
          (c) =>
            c.contactAuthorId === contactAuthorId ||
            c.id === `conv_community_${contactAuthorId}` ||
            (c.contactType === 'community' &&
              c.name === contactName &&
              !c.lostAnnouncementId),
        )
        if (existing) {
          openedId = existing.id
          return prev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  archived: false,
                  unread: 0,
                  contactAuthorId: c.contactAuthorId ?? contactAuthorId,
                }
              : c,
          )
        }

        const created = buildConversationFromCommunityAuthor({
          authorId: contactAuthorId,
          name: contactName,
          avatar: contactAvatar,
          role: contactRole || undefined,
        })
        openedId = created.id
        return [created, ...prev]
      })

      if (openedId) {
        setListMode('inbox')
        setActiveId(openedId)
        setMobileShowChat(true)
      }
      setSearchParams({}, { replace: true })
      return
    }

    if (!contactPetId) {
      setSearchParams({}, { replace: true })
      return
    }

    const petContactId = contactPetId

    setConversations((prev) => {
      const existing = prev.find((c) => c.contactPetId === petContactId)
      if (existing) {
        openedId = existing.id
        return prev.map((c) =>
          c.id === existing.id ? { ...c, archived: false, unread: 0 } : c,
        )
      }

      if (pets.some((owned) => owned.id === petContactId)) {
        return prev
      }

      const pet = getDiscoverPetById(petContactId, pets, undefined, photos)
      if (!pet) return prev

      const introDraft = takeConnectMessageDraft(petContactId) ?? undefined
      const created = buildConversationFromDiscoverPet(pet, introDraft)
      openedId = created.id
      createdNewDiscoverThread = true
      return [created, ...prev]
    })

    if (openedId) {
      setListMode('inbox')
      setActiveId(openedId)
      setMobileShowChat(true)

      if (createdNewDiscoverThread) {
        const pet = getDiscoverPetById(petContactId, pets, undefined, photos)
        bumpDiscoverEngagement(petContactId, { connections: 1, communityInteractions: 1 })
        upsertNotification({
          type: 'community',
          title: 'Nová žádost o propojení',
          message: pet?.ownerName
            ? `Oslovili jste ${pet.ownerName} kvůli propojení s ${pet.name}.`
            : pet
              ? `Oslovili jste majitele ${pet.name} kvůli propojení.`
              : 'Odeslali jste žádost o propojení z Objevovat.',
          priority: 'normal',
          dedupeKey: `discover:connect:${petContactId}`,
          petId: petContactId,
          petName: pet?.name,
          href: `/messages?conversationId=${encodeURIComponent(openedId)}`,
          conversationId: openedId,
          time: 'Právě teď',
        })
      }
    }

    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open deep links once per params change
  }, [searchParams, setSearchParams, lostConversations, upsertNotification, pets, photos, self?.id, variant])

  useEffect(() => {
    if (variant === 'professional') return
    if (lostConversations.length === 0) return
    setConversations((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]))
      let changed = false
      for (const lost of lostConversations) {
        const existing = byId.get(lost.id)
        if (!existing) {
          byId.set(lost.id, lost)
          changed = true
          continue
        }
        if (
          (existing.contactType === 'lost_finder' ||
            existing.contactType === 'emergency_finder') &&
          (existing.messages.length !== lost.messages.length ||
            existing.lastMessage !== lost.lastMessage)
        ) {
          byId.set(lost.id, {
            ...lost,
            archived: existing.archived,
            unread: existing.unread,
          })
          changed = true
        }
      }
      if (!changed) return prev
      const rest = prev.filter(
        (c) => c.contactType !== 'lost_finder' && c.contactType !== 'emergency_finder',
      )
      const lostMerged = lostConversations.map((c) => byId.get(c.id) ?? c)
      return [...lostMerged, ...rest]
    })
  }, [lostConversations, variant])

  const active = conversations.find((c) => c.id === activeId)
  const contactPet = active?.contactPetId
    ? getDiscoverPetById(active.contactPetId, pets, undefined, photos)
    : undefined

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages, message])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    savePersistedInboxConversations(conversations)
    saveConversationPrefs({
      archivedIds: conversations.filter((c) => c.archived).map((c) => c.id),
      unreadById: Object.fromEntries(conversations.map((c) => [c.id, c.unread])),
    })
  }, [conversations])

  const archivedCount = conversations.filter((c) => c.archived).length

  // K61: Clinical Share via authorize + Messages (not access grant).

  const selectConversation = (id: string) => {
    setAccessDenied(false)
    setActiveId(id)
    setMobileShowChat(true)
    if (self?.id) {
      const target = conversations.find((c) => c.id === id) ?? getConversation(id)
      if (target && isAccountThread(target)) {
        markConversationReadRequest(id, self.id)
        refreshAccountThreads()
        return
      }
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    )
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !activeId) return

    const activeConv = conversations.find((c) => c.id === activeId)
    if (
      activeConv?.contactType === 'lost_finder' ||
      activeConv?.contactType === 'emergency_finder'
    ) {
      sendLostFinderMessage(activeId, message.trim(), 'owner')
      setMessage('')
      return
    }

    if (activeConv && isAccountThread(activeConv) && self?.id) {
      const result = sendMessageRequest(
        {
          conversationId: activeId,
          senderAccountId: self.id,
          text: message.trim(),
        },
        { upsertNotification },
      )
      setMessage('')
      if (!result.ok) {
        showToast('Zprávu nelze odeslat', result.message, 'error')
        return
      }
      refreshAccountThreads()
      setConversations((prev) => {
        const projected = projectConversationForViewer(result.data.conversation, self.id)
        const rest = prev.filter((c) => c.id !== projected.id)
        return sortConversationsForInbox([projected, ...rest])
      })
      return
    }

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
        upsertNotification({
          id: `n_msg_${replyMsg.id}`,
          type: 'message',
          title: 'Nová zpráva',
          message: 'Máte novou zprávu.',
          priority: 'normal',
          dedupeKey: `msg:${activeId}:${replyMsg.id}`,
          href: `/messages?conversationId=${activeId}`,
          conversationId: activeId,
          time: 'právě teď',
        })
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

  const filteredConversations = sortConversationsForInbox(
    conversations.filter((c) => {
      if (variant === 'professional' && self?.id && !canAccessConversation(self.id, c)) {
        return false
      }
      const inCurrentList = listMode === 'archive' ? Boolean(c.archived) : !c.archived
      if (!inCurrentList) return false
      const q = search.toLowerCase()
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        c.petContext.toLowerCase().includes(q) ||
        (c.serviceNameSnapshot?.toLowerCase().includes(q) ?? false)
      )
    }),
  )

  if (accessDenied) {
    return (
      <Card variant="elevated" className="mx-auto max-w-lg" data-testid="messaging-denied">
        <p className="text-sm font-bold text-[#191E1B]">Přístup odepřen</p>
        <p className="mt-1 text-xs text-[#7D8B82]">
          Tato konverzace neexistuje nebo k ní nemáte oprávnění.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => {
            setAccessDenied(false)
            refreshAccountThreads()
          }}
        >
          Zpět na zprávy
        </Button>
      </Card>
    )
  }

  return (
    <>
      <Card
        variant="elevated"
        padding="none"
        className="flex h-[calc(100vh-210px)] min-h-[540px] max-h-[800px] overflow-hidden"
        data-testid={
          variant === 'professional' ? 'professional-messages-page' : 'messages-page-content'
        }
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

        {active?.contactType === 'lost_finder' || active?.contactType === 'emergency_finder' ? (
          <div
            className={`flex min-w-0 flex-1 flex-col overflow-y-auto bg-[#FAF8F5] p-4 ${
              mobileShowChat ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <button
              type="button"
              className="mb-3 cursor-pointer text-left text-xs font-semibold text-[#7D8B82] lg:hidden"
              onClick={() => setMobileShowChat(false)}
            >
              ← Zprávy
            </button>
            <SafeContactChat role="owner" conversationId={active.id} />
          </div>
        ) : (
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
            onAttachFile={() =>
              showToast('Příloha souboru', 'Vyberte veterinární PDF nebo fotografii.', 'info')
            }
            onClinicalShared={() => {
              refreshAccountThreads()
              setShareMenuOpen(false)
            }}
          />
        )}
      </Card>

      {active &&
        active.contactType !== 'lost_finder' &&
        active.contactType !== 'emergency_finder' && (
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
