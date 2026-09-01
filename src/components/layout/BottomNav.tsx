import {
  Calendar,
  Heart,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Search,
  Settings,
  HelpCircle,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { cn } from '../../lib/utils'

const mainItems = [
  { to: '/', label: 'Domů', icon: LayoutDashboard },
  { to: '/pets', label: 'Mazlíčci', icon: PawPrint },
  { to: '/discover', label: 'Objevovat', icon: Search },
  { to: '/community', label: 'Komunita', icon: Users },
  { to: '/health', label: 'Zdraví', icon: Heart },
]

const moreItems = [
  { to: '/calendar', label: 'Kalendář', icon: Calendar },
  { to: '/messages', label: 'Zprávy', icon: MessageCircle },
  { to: '/settings', label: 'Nastavení', icon: Settings },
  { to: '/help', label: 'Nápověda', icon: HelpCircle },
]

export function BottomNav() {
  const [showMore, setShowMore] = useState(false)
  const { pets } = useApp()

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
            {moreItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#EBF2EE] text-[#2C4A3E] font-semibold'
                      : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                  )
                }
              >
                <Icon size={18} className="text-[#2C4A3E]" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8E4DC] bg-white/90 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
          {mainItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all duration-200',
                  isActive
                    ? 'text-[#2C4A3E] font-semibold'
                    : 'text-[#7D8B82] hover:text-[#191E1B]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.3 : 1.75}
                    className={isActive ? 'text-[#2C4A3E]' : 'text-[#7D8B82]'}
                  />
                  <span>{label}</span>
                  {to === '/pets' && pets.length > 0 && (
                    <span className="absolute top-1 right-2 h-1.5 w-1.5 rounded-full bg-[#B8934A]" />
                  )}
                  {isActive && (
                    <span className="absolute -bottom-1 h-1 w-4 rounded-full bg-[#2C4A3E]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-all cursor-pointer',
              showMore ? 'text-[#2C4A3E] font-semibold' : 'text-[#7D8B82] hover:text-[#191E1B]',
            )}
          >
            <MoreHorizontal size={20} />
            <span>Více</span>
          </button>
        </div>
      </nav>
    </>
  )
}
