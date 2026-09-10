import {
  Bell,
  CheckCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { petCountLabel } from '../../lib/dashboardDates'
import {
  formatNotificationTime,
  notificationHrefFallback,
  sortNotificationsNewestFirst,
} from '../../lib/notifications'
import type { AppNotification } from '../../types'
import { Avatar } from '../ui/Avatar'
import { SearchInput } from '../ui/SearchInput'

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

export function Header() {
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
  const [searchInput, setSearchInput] = useState('')

  const sortedNotifications = useMemo(
    () => sortNotificationsNewestFirst(notifications),
    [notifications],
  )
  const unreadCount = sortedNotifications.filter((item) => item.unread).length

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
  }

  return (
    <header className="relative mb-6 pb-5 border-b border-[#E8E4DC]">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#EBF2EE]/60 to-transparent"
        aria-hidden
      />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#191E1B] sm:text-[1.65rem]">
            <span>{greeting}, Terezo {emoji}</span>
          </h1>
          <p className="mt-0.5 text-sm text-[#7D8B82] font-medium">
            {petCountLabel(pets.length)}
          </p>
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
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E4DC] bg-white text-[#4A564F] transition-all hover:bg-[#FAF8F5] hover:text-[#191E1B] hover:border-[#D1E0D8] cursor-pointer"
              aria-label="Notifikace"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#B8934A]" />
              )}
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-11 z-40 flex max-h-[min(28rem,70vh)] w-80 flex-col overflow-hidden rounded-2xl border border-[#E8E4DC] bg-white shadow-[0_15px_35px_rgba(25,30,27,0.1)] animate-in fade-in zoom-in-95 duration-150 sm:w-96">
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
                  <div className="min-h-0 flex-1 overflow-y-auto px-4 divide-y divide-[#F0EDE6]">
                    {sortedNotifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm font-semibold text-[#191E1B]">Vše je v pořádku</p>
                        <p className="mt-1 text-xs text-[#7D8B82]">
                          Nemáte žádná nová upozornění.
                        </p>
                      </div>
                    ) : (
                      sortedNotifications.map((item) => (
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          className={`-mx-2 flex cursor-pointer items-start gap-3 rounded-xl px-2 py-3 transition-colors first:pt-2 last:pb-2 ${
                            item.unread ? 'bg-[#F7F3EA]/70' : 'hover:bg-[#FAF8F5]'
                          } ${priorityAccentClass(item)}`}
                          onClick={() => openNotification(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openNotification(item)
                            }
                          }}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              item.unread ? 'bg-[#B8934A]' : 'bg-transparent'
                            }`}
                          />
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
                              {[
                                formatNotificationTime(item.createdAt),
                                item.petName,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="shrink-0 border-t border-[#F0EDE6] px-4 py-2.5">
                    <span className="text-[11px] font-medium text-[#A3AFA7]">
                      Zobrazit všechny notifikace
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <Avatar
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85"
            alt="Tereza V."
            size="sm"
            goldRing
          />
        </div>
      </div>
    </header>
  )
}
