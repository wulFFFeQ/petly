import {
  Calendar,
  CalendarCheck2,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Link2,
  MessageCircle,
  ScrollText,
  Settings,
  Sparkles,
  UserRound,
  Wallet,
  Building2,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getSelfAccount, setUiWorkspace } from '../../lib/account'
import { canSwitchWorkspace } from '../../lib/professional/dashboard'
import { getUnreadCountForAccount } from '../../lib/messaging'
import { cn } from '../../lib/utils'
import { AccountMenu } from '../account/AccountMenu'
import { SidebarBrandHeader } from './Logo'

const mainNav = [
  { to: '/professional', label: 'Přehled', icon: LayoutDashboard, end: true },
  { to: '/professional/pets', label: 'Propojení', icon: Link2 },
  { to: '/professional/access', label: 'Žádosti', icon: ClipboardList },
  { to: '/professional/bookings', label: 'Rezervace', icon: CalendarCheck2 },
  { to: '/professional/messages', label: 'Zprávy', icon: MessageCircle },
  { to: '/professional/calendar', label: 'Kalendář', icon: Calendar },
  { to: '/professional/records', label: 'Záznamy', icon: FileText },
  { to: '/professional/profile', label: 'Veřejný profil', icon: UserRound },
]
const bottomNav = [
  { to: '/professional/services', label: 'Služby', icon: Sparkles },
  { to: '/professional/availability', label: 'Dostupnost', icon: Clock },
  { to: '/professional/booking-rules', label: 'Pravidla rezervací', icon: ScrollText },
  { to: '/professional/payments', label: 'Platby', icon: Wallet },
  { to: '/professional/organizations', label: 'Organizace', icon: Building2 },
  { to: '/professional/settings', label: 'Nastavení', icon: Settings },
  { to: '/professional/help', label: 'Nápověda', icon: HelpCircle },
]

export function ProfessionalSidebar() {
  const showSwitch = canSwitchWorkspace()
  const self = getSelfAccount()
  const unreadMessages = self?.id ? getUnreadCountForAccount(self.id) : 0

  return (
    <aside
      className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:border-[#E8E4DC]/70 z-30"
      style={{ backgroundColor: '#FAF8F5' }}
      data-testid="professional-sidebar"
    >
      <SidebarBrandHeader />

      <div className="mx-4 h-px bg-[#E8E4DC]/60" />

      <div className="flex min-h-0 flex-1 flex-col px-4 py-5 justify-between overflow-y-auto">
        <div>
          <div className="px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A3AEA7]">
              Profesionální
            </span>
          </div>

          <nav className="mt-3 flex flex-col gap-1">
            {mainNav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E] font-semibold shadow-xs'
                      : 'text-[#4A564F] hover:bg-white/60 hover:text-[#191E1B]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        size={19}
                        strokeWidth={isActive ? 2.2 : 1.75}
                        className={cn(
                          'transition-colors',
                          isActive
                            ? 'text-[#2C4A3E]'
                            : 'text-[#7D8B82] group-hover:text-[#191E1B]',
                        )}
                      />
                      <span>{label}</span>
                    </div>
                    {to === '/professional/messages' && unreadMessages > 0 ? (
                      <span
                        className="rounded-full bg-[#2C4A3E] px-1.5 py-0.5 text-[10px] font-bold text-white"
                        data-testid="professional-messages-unread"
                      >
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A3AEA7]">
              Nastavení
            </span>
          </div>
          <nav className="mt-3 flex flex-col gap-1">
            {bottomNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E] font-semibold'
                      : 'text-[#4A564F] hover:bg-white/60 hover:text-[#191E1B]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.2 : 1.75}
                      className={isActive ? 'text-[#2C4A3E]' : 'text-[#7D8B82]'}
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-6 space-y-3">
          {showSwitch ? (
            <NavLink
              to="/"
              onClick={() => setUiWorkspace('consumer')}
              data-testid="switch-to-owner"
              className="block rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-2.5 text-center text-xs font-semibold text-[#2C4A3E] hover:bg-[#EBF2EE]"
            >
              Přepnout na účet majitele
            </NavLink>
          ) : null}
          <AccountMenu showLabel size="sm" goldRing={false} subtitle="Pracovní prostředí" />
        </div>
      </div>
    </aside>
  )
}
