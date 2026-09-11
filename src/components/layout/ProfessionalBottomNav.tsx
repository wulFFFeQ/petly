import {
  Calendar,
  CalendarCheck2,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getSelfAccount, setUiWorkspace } from '../../lib/account'
import { canSwitchWorkspace } from '../../lib/professional/dashboard'
import { getUnreadCountForAccount } from '../../lib/messaging'
import { cn } from '../../lib/utils'

const mainItems = [
  { to: '/professional', label: 'Přehled', icon: LayoutDashboard, end: true },
  { to: '/professional/bookings', label: 'Rezervace', icon: CalendarCheck2 },
  { to: '/professional/messages', label: 'Zprávy', icon: MessageCircle },
  { to: '/professional/calendar', label: 'Kalendář', icon: Calendar },
]

const moreItems = [
  { to: '/professional/access', label: 'Žádosti' },
  { to: '/professional/pets', label: 'Propojení' },
  { to: '/professional/services', label: 'Služby' },
  { to: '/professional/availability', label: 'Dostupnost' },
  { to: '/professional/records', label: 'Záznamy' },
  { to: '/professional/profile', label: 'Veřejný profil' },
  { to: '/professional/settings', label: 'Nastavení' },
  { to: '/professional/help', label: 'Nápověda' },
]

export function ProfessionalBottomNav() {
  const [showMore, setShowMore] = useState(false)
  const showSwitch = canSwitchWorkspace()
  const self = getSelfAccount()
  const unreadMessages = self?.id ? getUnreadCountForAccount(self.id) : 0

  return (
    <>
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-[#171B18]/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div className="fixed bottom-[80px] left-4 right-4 z-50 rounded-2xl border border-[#E8E4DC] bg-white/95 backdrop-blur-md p-3 shadow-[0_20px_40px_rgba(25,30,27,0.15)] lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="mb-2 px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
            Další sekce
          </div>
          <div className="flex flex-col gap-1">
            {moreItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E] font-semibold'
                      : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
            {showSwitch ? (
              <NavLink
                to="/"
                onClick={() => {
                  setUiWorkspace('consumer')
                  setShowMore(false)
                }}
                className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#2C4A3E]"
                data-testid="switch-to-owner-mobile"
              >
                Přepnout na účet majitele
              </NavLink>
            ) : null}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8E4DC] bg-white/90 backdrop-blur-md lg:hidden"
        data-testid="professional-bottom-nav"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
          {mainItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium',
                  isActive ? 'text-[#2C4A3E]' : 'text-[#7D8B82]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
                  <span className="truncate">{label}</span>
                  {to === '/professional/messages' && unreadMessages > 0 ? (
                    <span className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-[#2C4A3E]" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium text-[#7D8B82]"
          >
            <MoreHorizontal size={20} />
            <span>Více</span>
          </button>
        </div>
      </nav>
    </>
  )
}
