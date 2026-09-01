import { Search, X, Sparkles, MapPin } from 'lucide-react'
import { useApp, type DiscoverFilter } from '../../context/AppContext'
import { cn } from '../../lib/utils'

const filters: { id: DiscoverFilter; label: string; icon?: typeof Sparkles }[] = [
  { id: 'all', label: 'Všichni mazlíčci' },
  { id: 'dog', label: 'Psi' },
  { id: 'cat', label: 'Kočky' },
  { id: 'other', label: 'Jiné druhy' },
  { id: 'nearby', label: 'V okolí (Kolín / Kutná Hora)', icon: MapPin },
  { id: 'popular', label: 'Populární profily', icon: Sparkles },
]

export function DiscoverFilters() {
  const { discoverSearch, discoverFilter, setDiscoverSearch, setDiscoverFilter } = useApp()

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3AEA7]"
        />
        <input
          type="text"
          placeholder="Hledat mazlíčky, plemena, lokality nebo majitele..."
          value={discoverSearch}
          onChange={(e) => setDiscoverSearch(e.target.value)}
          className="w-full h-11 rounded-2xl border border-[#E8E4DC] bg-white pl-10 pr-10 text-sm text-[#191E1B] placeholder:text-[#A3AEA7] outline-none transition-all focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        />
        {discoverSearch && (
          <button
            onClick={() => setDiscoverSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A3AEA7] hover:text-[#191E1B] p-1 rounded-md"
            aria-label="Vymazat vyhledávání"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        {filters.map(({ id, label, icon: Icon }) => {
          const isActive = discoverFilter === id
          return (
            <button
              key={id}
              onClick={() => setDiscoverFilter(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-[#2C4A3E] text-white shadow-sm'
                  : 'bg-white border border-[#E8E4DC] text-[#4A564F] hover:text-[#191E1B] hover:border-[#D1E0D8] hover:bg-[#FAF8F5]',
              )}
            >
              {Icon && (
                <Icon
                  size={13}
                  className={isActive ? 'text-[#FAF4E6]' : 'text-[#B8934A]'}
                />
              )}
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
