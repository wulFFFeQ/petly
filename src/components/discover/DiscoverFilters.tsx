import { ChevronDown, MapPin, RotateCcw, SlidersHorizontal, Sparkles, ShieldCheck, Dna } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  countActiveDiscoverCriteria,
  DISCOVER_ACTIVITY_FILTERS,
  DISCOVER_DISTANCE_OPTIONS,
  DISCOVER_LOCATIONS,
  DISCOVER_SEEKING_FILTERS,
  toggleListValue,
  type DiscoverSpecies,
} from '../../lib/discoverCriteria'
import { SearchInput } from '../ui/SearchInput'
import { cn } from '../../lib/utils'

const SPECIES_OPTIONS: { id: DiscoverSpecies; label: string }[] = [
  { id: 'all', label: 'Všichni mazlíčci' },
  { id: 'dog', label: 'Psi' },
  { id: 'cat', label: 'Kočky' },
]

export function DiscoverFilters({ resultCount }: { resultCount?: number }) {
  const {
    discoverSearch,
    discoverCriteria,
    setDiscoverSearch,
    setDiscoverCriteria,
    resetDiscoverCriteria,
  } = useApp()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const activeCount = countActiveDiscoverCriteria(discoverCriteria)

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

      <div className="flex flex-wrap gap-2">
        {SPECIES_OPTIONS.map(({ id, label }) => {
          const isActive = discoverCriteria.species === id
          return (
            <button
              key={id}
              type="button"
              onClick={() =>
                setDiscoverCriteria((prev) => ({ ...prev, species: id }))
              }
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-[#2C4A3E] text-white shadow-sm'
                  : 'bg-white border border-[#E8E4DC] text-[#4A564F] hover:text-[#191E1B] hover:border-[#D1E0D8] hover:bg-[#FAF8F5]',
              )}
            >
              {label}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() =>
            setDiscoverCriteria((prev) => ({ ...prev, nearby: !prev.nearby }))
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
            discoverCriteria.nearby
              ? 'bg-[#2C4A3E] text-white shadow-sm'
              : 'bg-white border border-[#E8E4DC] text-[#4A564F] hover:text-[#191E1B] hover:border-[#D1E0D8] hover:bg-[#FAF8F5]',
          )}
        >
          <MapPin
            size={13}
            className={discoverCriteria.nearby ? 'text-[#FAF4E6]' : 'text-[#B8934A]'}
          />
          V okolí
        </button>

        <button
          type="button"
          onClick={() =>
            setDiscoverCriteria((prev) => ({ ...prev, popular: !prev.popular }))
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
            discoverCriteria.popular
              ? 'bg-[#2C4A3E] text-white shadow-sm'
              : 'bg-white border border-[#E8E4DC] text-[#4A564F] hover:text-[#191E1B] hover:border-[#D1E0D8] hover:bg-[#FAF8F5]',
          )}
        >
          <Sparkles
            size={13}
            className={discoverCriteria.popular ? 'text-[#FAF4E6]' : 'text-[#B8934A]'}
          />
          Populární
        </button>

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer',
            advancedOpen || activeCount > 0
              ? 'bg-[#EBF2EE] text-[#2C4A3E] border border-[#D1E0D8]'
              : 'bg-white border border-[#E8E4DC] text-[#4A564F] hover:bg-[#FAF8F5]',
          )}
        >
          <SlidersHorizontal size={13} />
          Kritéria
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-[#2C4A3E] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={13}
            className={cn('transition-transform', advancedOpen && 'rotate-180')}
          />
        </button>

        {(activeCount > 0 || discoverSearch) && (
          <button
            type="button"
            onClick={() => {
              resetDiscoverCriteria()
              setDiscoverSearch('')
            }}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#7D8B82] hover:text-[#2C4A3E] hover:bg-[#FAF8F5] cursor-pointer"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </div>

      {advancedOpen && (
        <div className="rounded-2xl border border-[#E8E4DC] bg-white p-4 sm:p-5 space-y-5 shadow-[0_8px_24px_rgba(25,30,27,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#191E1B]">Kritéria hledání</h3>
              <p className="text-xs text-[#7D8B82]">
                Kombinujte filtry — zobrazí se mazlíčci, kteří splní všechna zvolená kritéria.
              </p>
            </div>
            {typeof resultCount === 'number' && (
              <span className="rounded-full bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-semibold text-[#5A6660]">
                {resultCount}{' '}
                {resultCount === 1 ? 'výsledek' : resultCount < 5 ? 'výsledky' : 'výsledků'}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Stav profilu
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setDiscoverCriteria((prev) => ({ ...prev, verified: !prev.verified }))
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors',
                  discoverCriteria.verified
                    ? 'bg-[#EBF2EE] text-[#2C4A3E] ring-1 ring-[#2C4A3E]/20'
                    : 'bg-[#FAF8F5] text-[#5A6660] hover:bg-[#EBF2EE]',
                )}
              >
                <ShieldCheck size={13} />
                Jen ověřené
              </button>
              <button
                type="button"
                onClick={() =>
                  setDiscoverCriteria((prev) => ({ ...prev, breeding: !prev.breeding }))
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors',
                  discoverCriteria.breeding
                    ? 'bg-[#FAF4E6] text-[#B8934A] ring-1 ring-[#E8D8B5]'
                    : 'bg-[#FAF8F5] text-[#5A6660] hover:bg-[#FAF4E6]',
                )}
              >
                <Dna size={13} />
                Chovný profil
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Lokalita
            </p>
            <div className="flex flex-wrap gap-2">
              {DISCOVER_LOCATIONS.map((location) => {
                const active = discoverCriteria.locations.includes(location)
                return (
                  <button
                    key={location}
                    type="button"
                    onClick={() =>
                      setDiscoverCriteria((prev) => ({
                        ...prev,
                        locations: toggleListValue(prev.locations, location),
                      }))
                    }
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors',
                      active
                        ? 'bg-[#2C4A3E] text-white'
                        : 'bg-[#FAF8F5] text-[#5A6660] hover:bg-[#EBF2EE]',
                    )}
                  >
                    {location}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Vzdálenost
            </p>
            <div className="flex flex-wrap gap-2">
              {DISCOVER_DISTANCE_OPTIONS.map((option) => {
                const active = discoverCriteria.maxDistanceKm === option.value
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() =>
                      setDiscoverCriteria((prev) => ({
                        ...prev,
                        maxDistanceKm: option.value,
                      }))
                    }
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors',
                      active
                        ? 'bg-[#2C4A3E] text-white'
                        : 'bg-[#FAF8F5] text-[#5A6660] hover:bg-[#EBF2EE]',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Oblíbené aktivity
            </p>
            <p className="text-[11px] text-[#7D8B82]">
              Mazlíček má danou aktivitu ráda (hodnocení 4–5).
            </p>
            <div className="flex flex-wrap gap-2">
              {DISCOVER_ACTIVITY_FILTERS.map((activity) => {
                const active = discoverCriteria.activities.includes(activity.key)
                return (
                  <button
                    key={activity.key}
                    type="button"
                    onClick={() =>
                      setDiscoverCriteria((prev) => ({
                        ...prev,
                        activities: toggleListValue(prev.activities, activity.key),
                      }))
                    }
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                      active
                        ? 'bg-[#EBF2EE] text-[#2C4A3E] ring-1 ring-[#2C4A3E]/25'
                        : 'bg-[#F3F0EA] text-[#5A6660] hover:bg-[#EBF2EE]',
                    )}
                  >
                    {activity.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Hledá
            </p>
            <div className="flex flex-wrap gap-2">
              {DISCOVER_SEEKING_FILTERS.map((item) => {
                const active = discoverCriteria.seeking.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDiscoverCriteria((prev) => ({
                        ...prev,
                        seeking: toggleListValue(prev.seeking, item.id),
                      }))
                    }
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                      active
                        ? 'bg-[#FAF4E6] text-[#B8934A] ring-1 ring-[#E8D8B5]'
                        : 'bg-[#F3F0EA] text-[#5A6660] hover:bg-[#FAF4E6]',
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
