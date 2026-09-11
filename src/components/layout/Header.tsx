import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  Clock,
  Link2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getSelfAccount, setUiWorkspace } from '../../lib/account'
import { getUserDisplayName } from '../../lib/discover/owner'
import { petCountLabel } from '../../lib/dashboardDates'
import {
  formatNotificationTime,
  notificationHrefFallback,
  sortNotificationsNewestFirst,
} from '../../lib/notifications'
import { canSwitchWorkspace } from '../../lib/professional/dashboard'
import type { AppNotification, NotificationType } from '../../types'
import { AccountMenu } from '../account/AccountMenu'
import { SearchInput } from '../ui/SearchInput'

/** Dropdown shows a recent preview; full list via „Zobrazit všechny“. */
const NOTIFICATION_PREVIEW_LIMIT = 8

function getGreetingData(): { greeting: string; emoji: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { greeting: 'Dobré ráno', emoji: '☀️' }
  if (hour < 18) return { greeting: 'Dobré odpoledne', emoji: '🌤️' }
  return { greeting: 'Dobré večer', emoji: '🌙' }
}

function priorityAccentClass(item: AppNotification): string {
  if (item.priority === 'urgent') return 'border-l-2 border-l-[#B8934A]'
  if (item.priority === 'important') return 'border-l-2 border-l-[#2C4A3E]'
  return 'border-l-2 border-l-transparent'
}

function isVisibleForAccount(
  item: AppNotification,
  accountId: string | undefined,
): boolean {
  if (!item.recipientAccountId) return true
  if (!accountId) return false
  return item.recipientAccountId === accountId
}

function notificationTypeIcon(type: NotificationType) {
  switch (type) {
    case 'professional_access_requested':
      return Link2
    case 'professional_access_approved':
      return UserCheck
    case 'professional_access_revoked':
    case 'professional_access_rejected':
      return UserX
    case 'professional_access_expired':
      return Clock
    case 'booking_requested':
    case 'booking_reminder':
      return CalendarClock
    case 'booking_confirmed':
    case 'booking_completed':
    case 'booking_rescheduled':
      return CalendarCheck
    case 'booking_declined':
    case 'booking_cancelled':
      return CalendarX
    default:
      return Bell
  }
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: AppNotification
  onOpen: (item: AppNotification) => void
}) {
  const Icon = notificationTypeIcon(item.type)
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`notification-row-${item.id}`}
      className={`-mx-2 flex cursor-pointer items-start gap-3 rounded-xl px-2 py-3 transition-colors first:pt-2 last:pb-2 ${
        item.unread ? 'bg-[#F7F3EA]/70' : 'hover:bg-[#FAF8F5]'
      } ${priorityAccentClass(item)}`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(item)
        }
      }}
    >
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          item.unread ? 'bg-[#EBF2EE] text-[#2C4A3E]' : 'bg-[#F0EDE6] text-[#7D8B82]'
        }`}
      >
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs text-[#191E1B] ${
            item.unread ? 'font-bold' : 'font-semibold'
          }`}
        >
          {item.title}
        </p>
        <p className="mt-0.5 text-[11px] text-[#7D8B82]">
          {item.message || item.time || formatNotificationTime(item.createdAt)}
        </p>
        <p className="mt-0.5 text-[10px] text-[#A3AFA7]">
          {[formatNotificationTime(item.createdAt), item.petName].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          item.unread ? 'bg-[#B8934A]' : 'bg-transparent'
        }`}
      />
    </div>
  )
}

export function Header({ variant = 'consumer' }: { variant?: 'consumer' | 'professional' }) {
  const { greeting, emoji } = getGreetingData()
  const {
    pets,
    setDiscoverSearch,
    notifications,
    markNotificationsRead,
    markNotificationRead,
  } = useApp()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAllNotifications, setShowAllNotifications] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const account = getSelfAccount()
  const accountId = account?.id
  const displayName =
    account?.displayName?.trim() || getUserDisplayName() || 'uživateli'
  const showWorkspaceSwitch = canSwitchWorkspace()
  const isProfessional = variant === 'professional'

  const sortedNotifications = useMemo(() => {
    const visible = notifications.filter((item) => isVisibleForAccount(item, accountId))
    return sortNotificationsNewestFirst(visible)
  }, [notifications, accountId])

  const unreadNotifications = useMemo(
    () => sortedNotifications.filter((item) => item.unread),
    [sortedNotifications],
  )
  const unreadCount = unreadNotifications.length

  const previewPool = showAllNotifications
    ? sortedNotifications
    : sortedNotifications.slice(0, NOTIFICATION_PREVIEW_LIMIT)
  const visibleUnread = previewPool.filter((item) => item.unread)
  const visibleRead = previewPool.filter((item) => !item.unread)
  const hasMoreThanPreview = sortedNotifications.length > NOTIFICATION_PREVIEW_LIMIT

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    setDiscoverSearch(searchInput.trim())
    navigate('/discover')
  }

  const openNotification = (item: AppNotification) => {
    if (item.unread) markNotificationRead(item.id)
    const href = notificationHrefFallback(item)
    if (href) navigate(href)
    setShowNotifications(false)
    setShowAllNotifications(false)
  }

  const toggleDropdown = () => {
    setShowNotifications((open) => {
      if (open) setShowAllNotifications(false)
      return !open
    })
  }

  const closeDropdown = () => {
    setShowNotifications(false)
    setShowAllNotifications(false)
  }

  return (
    <header className="relative mb-6 pb-5 border-b border-[#E8E4DC]">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#EBF2EE]/60 to-transparent"
        aria-hidden
      />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-2xl font-bold tracking-tight text-[#191E1B] sm:text-[1.65rem]"
            data-testid="header-greeting"
          >
            <span>
              {greeting}, {displayName} {emoji}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-[#7D8B82] font-medium">
            {isProfessional ? 'Vaše profesionální prostředí' : petCountLabel(pets.length)}
          </p>
          {showWorkspaceSwitch ? (
            isProfessional ? (
              <Link
                to="/"
                onClick={() => setUiWorkspace('consumer')}
                data-testid="header-switch-to-owner"
                className="mt-1 inline-block text-xs font-semibold text-[#2C4A3E] hover:underline"
              >
                Přepnout na účet majitele
              </Link>
            ) : (
              <Link
                to="/professional"
                onClick={() => setUiWorkspace('professional')}
                data-testid="header-switch-to-professional"
                className="mt-1 inline-block text-xs font-semibold text-[#2C4A3E] hover:underline"
              >
                Přepnout na profesionální účet
              </Link>
            )
          ) : null}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <form
            onSubmit={handleSearchSubmit}
            className="hidden xl:block w-52"
          >
            <SearchInput
              size="sm"
              placeholder="Hledat..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>

          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E4DC] bg-white text-[#4A564F] transition-all hover:bg-[#FAF8F5] hover:text-[#191E1B] hover:border-[#D1E0D8] cursor-pointer"
              aria-label="Notifikace"
              data-testid="notifications-bell"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B8934A] px-1 text-[9px] font-bold leading-none text-white"
                  data-testid="notifications-unread-badge"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={closeDropdown}
                />
                <div
                  className="absolute right-0 top-11 z-40 flex max-h-[min(28rem,70vh)] w-80 flex-col overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-[0_15px_35px_rgba(25,30,27,0.1)] animate-in fade-in zoom-in-95 duration-150 sm:w-96"
                  data-testid="notifications-dropdown"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-[#F0EDE6] px-4 pb-3 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#191E1B]">Notifikace</span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-[#EBF2EE] px-2 py-0.5 text-[10px] font-bold text-[#2C4A3E]">
                          {unreadCount} nové
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => markNotificationsRead()}
                      className="flex cursor-pointer items-center gap-1 text-xs font-medium text-[#7D8B82] hover:text-[#2C4A3E]"
                    >
                      <CheckCheck size={13} />
                      Označit jako přečtené
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4">
                    {sortedNotifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm font-semibold text-[#191E1B]">Vše je v pořádku</p>
                        <p className="mt-1 text-xs text-[#7D8B82]">
                          Nemáte žádná nová upozornění.
                        </p>
                      </div>
                    ) : (
                      <>
                        {visibleUnread.length > 0 && (
                          <div className="pt-3" data-testid="notifications-section-new">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#7D8B82]">
                              Nové
                            </p>
                            <div className="divide-y divide-[#F0EDE6]">
                              {visibleUnread.map((item) => (
                                <NotificationRow
                                  key={item.id}
                                  item={item}
                                  onOpen={openNotification}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {visibleRead.length > 0 && (
                          <div
                            className={visibleUnread.length > 0 ? 'pt-3' : 'pt-3'}
                            data-testid="notifications-section-older"
                          >
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#7D8B82]">
                              Starší
                            </p>
                            <div className="divide-y divide-[#F0EDE6]">
                              {visibleRead.map((item) => (
                                <NotificationRow
                                  key={item.id}
                                  item={item}
                                  onOpen={openNotification}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {sortedNotifications.length > 0 && (
                    <div className="shrink-0 border-t border-[#F0EDE6] px-4 py-2.5">
                      {hasMoreThanPreview ? (
                        <button
                          type="button"
                          onClick={() => setShowAllNotifications((v) => !v)}
                          className="cursor-pointer text-[11px] font-medium text-[#2C4A3E] hover:text-[#191E1B]"
                        >
                          {showAllNotifications
                            ? 'Zobrazit méně'
                            : `Zobrazit všechny notifikace (${sortedNotifications.length})`}
                        </button>
                      ) : (
                        <span className="text-[11px] font-medium text-[#A3AFA7]">
                          Zobrazit všechny notifikace
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <AccountMenu size="sm" goldRing />
        </div>
      </div>
    </header>
  )
}
