import { ChevronDown, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import {
  CATALOG_MAX_PRICE_OPTIONS,
  CATALOG_MIN_RATING_OPTIONS,
  CATALOG_ROLE_FILTERS,
  CATALOG_SERVICE_CATEGORY_OPTIONS,
  CATALOG_SORT_OPTIONS,
  catalogHasActiveFilters,
  type ProfessionalCatalogCriteria,
} from '../../lib/professional'
import type { ServiceCategory } from '../../lib/booking'
import { cn } from '../../lib/utils'
import { SearchInput } from '../ui/SearchInput'

/** Emoji are UI-only — never stored on the data model. */
const CATEGORY_EMOJI: Record<string, string> = {
  veterinarian: '🩺',
  veterinary_clinic: '🏥',
  shelter: '🐾',
  groomer: '✂️',
  trainer: '🎓',
  breeder: '🐕',
  pet_hotel: '🏨',
  pet_service: '✨',
}

interface ProfessionalCatalogFiltersProps {
  criteria: ProfessionalCatalogCriteria
  onChange: (next: ProfessionalCatalogCriteria) => void
  resultCount: number
  totalPublic: number
}

export function ProfessionalCatalogFilters({
  criteria,
  onChange,
  resultCount,
  totalPublic,
}: ProfessionalCatalogFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const activeRole = (criteria.role ?? '').trim()
  const hasFilters = catalogHasActiveFilters(criteria)

  const patch = (partial: Partial<ProfessionalCatalogCriteria>) => {
    onChange({ ...criteria, ...partial })
  }

  const clearFilters = () => {
    onChange({
      role: '',
      q: '',
      city: '',
      verifiedOnly: false,
      serviceQuery: '',
      serviceCategory: '',
      maxPrice: null,
      minRating: '',
      sortBy: 'relevance',
      distanceKm: null,
      species: 'all',
    })
  }

  return (
    <div className="space-y-4" data-testid="professional-catalog-filters">
      <SearchInput
        size="lg"
        value={criteria.q ?? ''}
        onChange={(e) => patch({ q: e.target.value })}
        onClear={() => patch({ q: '' })}
        clearable
        placeholder="Hledat profesionála nebo službu..."
        aria-label="Hledat profesionála nebo službu"
        data-testid="professional-catalog-search"
      />

      <div className="flex flex-wrap gap-2" data-testid="professional-catalog-categories">
        <button
          type="button"
          data-testid="professional-catalog-role-all"
          onClick={() => patch({ role: '' })}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            !activeRole
              ? 'bg-[#2C4A3E] text-white'
              : 'bg-white text-[#4A564F] ring-1 ring-[#E8E4DC] hover:bg-[#EBF2EE]',
          )}
        >
          Všechny kategorie
        </button>
        {CATALOG_ROLE_FILTERS.map((cat) => {
          const selected = activeRole === cat.role
          const emoji = CATEGORY_EMOJI[cat.role] ?? ''
          return (
            <button
              key={cat.role}
              type="button"
              data-testid={`professional-catalog-role-${cat.role}`}
              onClick={() => patch({ role: selected ? '' : cat.role })}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                selected
                  ? 'bg-[#2C4A3E] text-white'
                  : 'bg-white text-[#4A564F] ring-1 ring-[#E8E4DC] hover:bg-[#EBF2EE]',
              )}
            >
              <span aria-hidden="true">{emoji} </span>
              {cat.catalogLabel}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="professional-catalog-verified-toggle"
          onClick={() => patch({ verifiedOnly: !criteria.verifiedOnly })}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            criteria.verifiedOnly
              ? 'bg-[#EBF2EE] text-[#2C4A3E] ring-1 ring-[#2C4A3E]/25'
              : 'bg-white text-[#4A564F] ring-1 ring-[#E8E4DC] hover:bg-[#EBF2EE]',
          )}
        >
          <ShieldCheck size={14} />
          Ověřený profil
        </button>

        <button
          type="button"
          data-testid="professional-catalog-advanced-toggle"
          onClick={() => setAdvancedOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
            advancedOpen
              ? 'bg-[#EBF2EE] text-[#2C4A3E] ring-1 ring-[#2C4A3E]/25'
              : 'bg-white text-[#4A564F] ring-1 ring-[#E8E4DC] hover:bg-[#EBF2EE]',
          )}
        >
          Další filtry
          <ChevronDown
            size={14}
            className={cn('transition-transform', advancedOpen && 'rotate-180')}
          />
        </button>

        {hasFilters ? (
          <button
            type="button"
            data-testid="professional-catalog-clear"
            onClick={clearFilters}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#7D8B82] hover:text-[#2C4A3E]"
          >
            Vymazat filtry
          </button>
        ) : null}

        <p className="ml-auto text-xs font-medium text-[#7D8B82]">
          {resultCount === 0
            ? 'Žádné výsledky'
            : `Zobrazeno ${resultCount} z ${totalPublic}`}
        </p>
      </div>

      {advancedOpen ? (
        <div
          className="space-y-3 rounded-2xl border border-[#E8E4DC] bg-white p-4"
          data-testid="professional-catalog-advanced"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Hodnocení
              </span>
              <select
                value={
                  criteria.minRating === undefined || criteria.minRating === ''
                    ? ''
                    : String(criteria.minRating)
                }
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') patch({ minRating: '' })
                  else if (raw === 'none') patch({ minRating: 'none' })
                  else patch({ minRating: Number(raw) as 4.5 | 4.0 | 3.5 })
                }}
                data-testid="professional-catalog-rating-filter"
                className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm text-[#191E1B] outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
              >
                {CATALOG_MIN_RATING_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Řazení
              </span>
              <select
                value={criteria.sortBy ?? 'relevance'}
                onChange={(e) =>
                  patch({
                    sortBy: e.target.value as 'relevance' | 'rating' | 'reviewCount',
                  })
                }
                data-testid="professional-catalog-sort"
                className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm text-[#191E1B] outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
              >
                {CATALOG_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Lokalita
              </span>
              <input
                type="text"
                value={criteria.city ?? ''}
                onChange={(e) => patch({ city: e.target.value })}
                placeholder="Např. Praha"
                data-testid="professional-catalog-location"
                className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm text-[#191E1B] outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Specializace / služby
              </span>
              <input
                type="text"
                value={criteria.serviceQuery ?? ''}
                onChange={(e) => patch({ serviceQuery: e.target.value })}
                placeholder="Např. očkování"
                data-testid="professional-catalog-service"
                className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm text-[#191E1B] outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Kategorie služby
              </span>
              <select
                value={criteria.serviceCategory ?? ''}
                onChange={(e) =>
                  patch({
                    serviceCategory: (e.target.value || '') as ServiceCategory | '',
                  })
                }
                data-testid="professional-catalog-service-category"
                className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm text-[#191E1B] outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
              >
                {CATALOG_SERVICE_CATEGORY_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Cena do
              </span>
              <select
                value={
                  criteria.maxPrice == null || criteria.maxPrice <= 0
                    ? ''
                    : String(criteria.maxPrice)
                }
                onChange={(e) => {
                  const raw = e.target.value
                  patch({
                    maxPrice: raw === '' ? null : Number(raw),
                  })
                }}
                data-testid="professional-catalog-max-price"
                className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 text-sm text-[#191E1B] outline-none focus:ring-2 focus:ring-[#2C4A3E]/15"
              >
                {CATALOG_MAX_PRICE_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 opacity-60" data-testid="professional-catalog-distance-prepared">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Vzdálenost
              </span>
              <select
                disabled
                aria-disabled="true"
                className="h-10 w-full cursor-not-allowed rounded-xl border border-[#E8E4DC] bg-[#F3F0EA] px-3 text-sm text-[#7D8B82]"
                defaultValue=""
              >
                <option value="">Připravujeme</option>
              </select>
              <p className="text-[10px] text-[#A3AEA7]">
                Filtr vzdálenosti bude dostupný po doplnění bezpečných veřejných souřadnic.
              </p>
            </div>
            <div className="space-y-1 opacity-60" data-testid="professional-catalog-species-prepared">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Pes / kočka
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  className="h-10 flex-1 cursor-not-allowed rounded-xl border border-[#E8E4DC] bg-[#F3F0EA] text-xs font-semibold text-[#7D8B82]"
                >
                  Pes
                </button>
                <button
                  type="button"
                  disabled
                  className="h-10 flex-1 cursor-not-allowed rounded-xl border border-[#E8E4DC] bg-[#F3F0EA] text-xs font-semibold text-[#7D8B82]"
                >
                  Kočka
                </button>
              </div>
              <p className="text-[10px] text-[#A3AEA7]">Připravujeme — zatím není v modelu.</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
