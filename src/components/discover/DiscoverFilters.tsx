import {
  ChevronDown,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Dna,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  countActiveDiscoverCriteria,
  coordsForCityName,
  DISCOVER_ACTIVITY_FILTERS,
  DISCOVER_RADIUS_OPTIONS,
  DISCOVER_SEEKING_FILTERS,
  removeLocationAnchor,
  toggleListValue,
  upsertLocationAnchor,
  type DiscoverSpecies,
} from '../../lib/discoverCriteria'
import { searchCities, type PlaceSuggestion } from '../../lib/geolocation'
import { getUserHomeCity } from '../../lib/userProfile'
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
  const [homeCity, setHomeCity] = useState(getUserHomeCity)
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([])
  const [citySearchStatus, setCitySearchStatus] = useState<
    'idle' | 'loading' | 'empty' | 'error'
  >('idle')

  useEffect(() => {
    if (advancedOpen) setHomeCity(getUserHomeCity())
  }, [advancedOpen])

  useEffect(() => {
    if (!advancedOpen) return
    const trimmed = cityQuery.trim()
    if (trimmed.length < 2) {
      setCitySuggestions([])
      setCitySearchStatus('idle')
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setCitySearchStatus('loading')
      try {
        const results = await searchCities(trimmed, controller.signal)
        if (controller.signal.aborted) return
        setCitySuggestions(results)
        setCitySearchStatus(results.length === 0 ? 'empty' : 'idle')
      } catch {
        if (controller.signal.aborted) return
        setCitySuggestions([])
        setCitySearchStatus('error')
      }
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [cityQuery, advancedOpen])

  const selectedOtherCities = discoverCriteria.locations.filter(
    (city) => city.toLowerCase() !== homeCity.toLowerCase(),
  )
  const homeSelected = discoverCriteria.locations.some(
    (city) => city.toLowerCase() === homeCity.toLowerCase(),
  )

  const selectCity = (
    city: string,
    coords?: { latitude: number; longitude: number },
  ) => {
    const normalized = city.trim()
    if (!normalized) return
    const resolved = coords ?? coordsForCityName(normalized)
    setDiscoverCriteria((prev) => {
      const exists = prev.locations.some(
        (item) => item.toLowerCase() === normalized.toLowerCase(),
      )
      if (exists) return prev
      return {
        ...prev,
        locations: [...prev.locations, normalized],
        locationAnchors: resolved
          ? upsertLocationAnchor(prev.locationAnchors, {
              name: normalized,
              latitude: resolved.latitude,
              longitude: resolved.longitude,
            })
          : prev.locationAnchors,
      }
    })
    setCityQuery('')
    setCitySuggestions([])
    setCitySearchStatus('idle')
  }

  const removeCity = (city: string) => {
    setDiscoverCriteria((prev) => ({
      ...prev,
      locations: prev.locations.filter(
        (item) => item.toLowerCase() !== city.toLowerCase(),
      ),
      locationAnchors: removeLocationAnchor(prev.locationAnchors, city),
    }))
  }

  const toggleHomeCity = () => {
    setDiscoverCriteria((prev) => {
      const selected = prev.locations.some(
        (item) => item.toLowerCase() === homeCity.toLowerCase(),
      )
      if (selected) {
        return {
          ...prev,
          locations: prev.locations.filter(
            (item) => item.toLowerCase() !== homeCity.toLowerCase(),
          ),
          locationAnchors: removeLocationAnchor(prev.locationAnchors, homeCity),
        }
      }
      const coords = coordsForCityName(homeCity)
      return {
        ...prev,
        locations: [...prev.locations, homeCity],
        locationAnchors: coords
          ? upsertLocationAnchor(prev.locationAnchors, {
              name: homeCity,
              latitude: coords.latitude,
              longitude: coords.longitude,
            })
          : prev.locationAnchors,
      }
    })
  }

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
            <p className="text-[11px] text-[#7D8B82]">
              Vaše město z profilu, nebo vyhledejte jiné místo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleHomeCity}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors',
                  homeSelected
                    ? 'bg-[#2C4A3E] text-white'
                    : 'bg-[#FAF8F5] text-[#5A6660] hover:bg-[#EBF2EE]',
                )}
              >
                <MapPin size={12} className={homeSelected ? 'text-[#FAF4E6]' : 'text-[#B8934A]'} />
                {homeCity}
                <span className={cn('text-[10px] font-medium', homeSelected ? 'text-white/70' : 'text-[#A3AEA7]')}>
                  moje místo
                </span>
              </button>

              {selectedOtherCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => removeCity(city)}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#2C4A3E] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  {city}
                  <X size={12} className="opacity-80" />
                </button>
              ))}
            </div>

            <div className="relative pt-1">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A3AEA7]"
                />
                <input
                  type="search"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Hledat město…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] py-2.5 pl-9 pr-3 text-xs font-medium text-[#191E1B] outline-none placeholder:text-[#A3AEA7] focus:border-[#D1E0D8] focus:bg-white"
                />
              </div>

              {(cityQuery.trim().length >= 2 || citySearchStatus !== 'idle') && (
                <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-[#E8E4DC] bg-white shadow-[0_12px_28px_rgba(25,30,27,0.1)]">
                  {citySearchStatus === 'loading' && (
                    <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">Hledám města…</p>
                  )}
                  {citySearchStatus === 'empty' && (
                    <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">
                      Nic jsme nenašli. Zkuste jiné znění.
                    </p>
                  )}
                  {citySearchStatus === 'error' && (
                    <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">
                      Vyhledávání se nezdařilo. Zkuste to znovu.
                    </p>
                  )}
                  {citySuggestions.map((place) => {
                    const already =
                      place.label.toLowerCase() === homeCity.toLowerCase() ||
                      discoverCriteria.locations.some(
                        (item) => item.toLowerCase() === place.label.toLowerCase(),
                      )
                    return (
                      <button
                        key={place.id}
                        type="button"
                        disabled={already}
                        onClick={() =>
                          selectCity(place.label, {
                            latitude: place.latitude,
                            longitude: place.longitude,
                          })
                        }
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer',
                          already
                            ? 'text-[#A3AEA7] cursor-default'
                            : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                        )}
                      >
                        <MapPin size={13} className="shrink-0 text-[#B8934A]" />
                        <span>{place.label}</span>
                        {already && (
                          <span className="ml-auto text-[10px] text-[#A3AEA7]">vybráno</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                Okolí místa
              </p>
              <p className="text-[11px] text-[#7D8B82]">
                Rozšířit hledání o kilometry od vybraného místa
                {discoverCriteria.locations[0]
                  ? ` (${discoverCriteria.locations.join(', ')})`
                  : ` (výchozí: ${homeCity})`}
                .
              </p>
              <div className="flex flex-wrap gap-2">
                {DISCOVER_RADIUS_OPTIONS.map((option) => {
                  const active = discoverCriteria.locationRadiusKm === option.value
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() =>
                        setDiscoverCriteria((prev) => ({
                          ...prev,
                          locationRadiusKm: option.value,
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
