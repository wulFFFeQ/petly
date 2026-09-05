import { Sparkles, MapPin } from 'lucide-react'
import { useApp, type DiscoverFilter } from '../../context/AppContext'
import { SearchInput } from '../ui/SearchInput'
import { cn } from '../../lib/utils'

const filters: { id: DiscoverFilter; label: string; icon?: typeof Sparkles }[] = [
  { id: 'all', label: 'Všichni mazlíčci' },
  { id: 'dog', label: 'Psi' },
  { id: 'cat', label: 'Kočky' },
  { id: 'nearby', label: 'V okolí (Kolín / Kutná Hora)', icon: MapPin },
  { id: 'popular', label: 'Populární profily', icon: Sparkles },
]

export function DiscoverFilters() {
  const { discoverSearch, discoverFilter, setDiscoverSearch, setDiscoverFilter } = useApp()

  return (
    <div className="space-y-4">
      <SearchInput
        size="lg"
        placeholder="Hledat mazlíčky, plemena, lokality nebo majitele..."
        value={discoverSearch}
        onChange={(e) => setDiscoverSearch(e.target.value)}
        clearable
        onClear={() => setDiscoverSearch('')}
      />

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
