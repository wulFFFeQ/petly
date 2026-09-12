import {
  Calendar,
  CalendarCheck2,
  Heart,
  HelpCircle,
  LayoutDashboard,
  MessageCircle,
  PawPrint,
  Phone,
  PhoneCall,
  Plane,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { petCountLabel } from '../../lib/dashboardDates'
import { cn } from '../../lib/utils'
import { AccountMenu } from '../account/AccountMenu'
import { SidebarBrandHeader } from './Logo'

export function Sidebar() {
  const { pets } = useApp()

  const mainNav = [
    { to: '/', label: 'Přehled', icon: LayoutDashboard },
    { to: '/pets', label: 'Moji mazlíčci', icon: PawPrint, badge: pets.length },
    { to: '/discover', label: 'Objevovat', icon: Search },
    { to: '/community', label: 'Komunita', icon: Users },
    { to: '/health', label: 'Zdraví', icon: Heart },
    { to: '/calendar', label: 'Kalendář', icon: Calendar },
    { to: '/bookings', label: 'Rezervace', icon: CalendarCheck2 },
    { to: '/messages', label: 'Zprávy', icon: MessageCircle },
  ]

  const servicesNav = [
    { to: '/travel', label: 'Cestování', icon: Plane },
    { to: '/contacts', label: 'Důležité kontakty', icon: Phone },
    { to: '/concierge', label: 'Concierge', icon: PhoneCall },
  ]

  const bottomNav = [
    { to: '/settings', label: 'Nastavení', icon: Settings },
    { to: '/help', label: 'Nápověda', icon: HelpCircle },
  ]

  return (
    <aside
      className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:border-[#E8E4DC]/70 z-30"
      style={{ backgroundColor: '#FAF8F5' }}
    >
      <SidebarBrandHeader />

      <div className="mx-4 h-px bg-[#E8E4DC]/60" />

      <div className="flex min-h-0 flex-1 flex-col px-4 py-5 justify-between overflow-y-auto">
        <div>
          <div className="px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A3AEA7]">
              Hlavní menu
            </span>
          </div>

          <nav className="mt-3 flex flex-col gap-1">
            {mainNav.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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
                          isActive ? 'text-[#2C4A3E]' : 'text-[#7D8B82] group-hover:text-[#191E1B]',
                        )}
                      />
                      <span>{label}</span>
                    </div>

                    {badge && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          isActive
                            ? 'bg-[#2C4A3E] text-white'
                            : typeof badge === 'number'
                              ? 'bg-[#EFECE6] text-[#4A564F]'
                              : 'bg-[#FAF4E6] text-[#B8934A]',
                        )}
                      >
                        {badge}
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#2C4A3E]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-5 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A3AEA7]">
              Služby
            </span>
          </div>
          <nav className="mt-3 flex flex-col gap-1">
            {servicesNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E] font-semibold shadow-xs'
                      : 'text-[#4A564F] hover:bg-white/60 hover:text-[#191E1B]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.2 : 1.75}
                      className={cn(
                        'transition-colors',
                        isActive ? 'text-[#2C4A3E]' : 'text-[#7D8B82] group-hover:text-[#191E1B]',
                      )}
                    />
                    <span>{label}</span>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#2C4A3E]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-5 px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A3AEA7]">
              Předvolby
            </span>
          </div>

          <nav className="flex flex-col gap-1">
            {bottomNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E] font-semibold'
                      : 'text-[#7D8B82] hover:bg-white/60 hover:text-[#191E1B]',
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <div className="mt-4 border-t border-[#F0EDE6] pt-4">
            <AccountMenu
              showLabel
              size="sm"
              goldRing
              subtitle={petCountLabel(pets.length)}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
