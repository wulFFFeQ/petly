import {
  Bell,
  Sun,
  Sunset,
  Moon,
  Search,
  CheckCheck,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { petCountLabel } from '../../lib/dashboardDates'
import { Avatar } from '../ui/Avatar'

function getGreetingData(): { greeting: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour < 12) return { greeting: 'Dobré ráno', icon: Sun }
  if (hour < 18) return { greeting: 'Dobré odpoledne', icon: Sunset }
  return { greeting: 'Dobré večer', icon: Moon }
}

export function Header() {
  const { greeting, icon: GreetingIcon } = getGreetingData()
  const { pets, setDiscoverSearch } = useApp()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    setDiscoverSearch(searchInput.trim())
    navigate('/discover')
  }

  const notifications = [
    {
      id: 'n1',
      title: 'Naplánováno očkování proti vzteklině u Luny',
      time: 'Za 12 dní · 24. 9.',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Rutinní dentální prohlídka u Mila',
      time: 'Zítra v 14:30 · MUDr. Novák',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Sarah K. se líbí váš příspěvek',
      time: 'před 2 hodinami',
      unread: false,
    },
  ]

  return (
    <header className="relative mb-6 pb-5 border-b border-[#E8E4DC]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#191E1B] sm:text-[1.65rem] flex items-center gap-2">
            <span>{greeting}, Terezo</span>
            <GreetingIcon size={20} className="text-[#B8934A] shrink-0" />
          </h1>
          <p className="mt-0.5 text-sm text-[#7D8B82] font-medium">
            {petCountLabel(pets.length)}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden xl:block w-52"
          >
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3AEA7]"
            />
            <input
              type="text"
              placeholder="Hledat..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-9 rounded-xl border border-[#E8E4DC] bg-white pl-9 pr-3 text-xs text-[#191E1B] placeholder:text-[#A3AEA7] outline-none focus:border-[#2C4A3E] focus:ring-2 focus:ring-[#2C4A3E]/10"
            />
          </form>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8E4DC] bg-white text-[#4A564F] transition-all hover:bg-[#FAF8F5] hover:text-[#191E1B] hover:border-[#D1E0D8] cursor-pointer"
              aria-label="Notifikace"
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#B8934A]" />
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 top-11 z-40 w-80 sm:w-96 rounded-2xl border border-[#E8E4DC] bg-white p-4 shadow-[0_15px_35px_rgba(25,30,27,0.1)] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE6]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#191E1B]">Notifikace</span>
                      <span className="rounded-full bg-[#EBF2EE] px-2 py-0.5 text-[10px] font-bold text-[#2C4A3E]">
                        2 nové
                      </span>
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-[#7D8B82] hover:text-[#2C4A3E] flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <CheckCheck size={13} />
                      Označit jako přečtené
                    </button>
                  </div>
                  <div className="mt-2 divide-y divide-[#F0EDE6]">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 first:pt-1 last:pb-1 flex items-start gap-3 hover:bg-[#FAF8F5] rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                        onClick={() => setShowNotifications(false)}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            item.unread ? 'bg-[#B8934A]' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#191E1B]">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#7D8B82] mt-0.5">
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
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
