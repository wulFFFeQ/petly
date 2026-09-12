import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  resolveClinicalStampContext,
} from '../../lib/health/clinicalProvenance'
import {
  buildAppClinicalAdapter,
  createAppClinicalService,
  isClinicalError,
} from '../../lib/clinical'
import {
  getWeightMeasurementsForPet,
  persistWeightMeasurement,
} from '../../lib/badges/badgeData'
import {
  computeWeightTrend,
  formatWeightKg,
} from '../../lib/healthDashboard'
import { parseCzechDate, todayIsoDate, formatIsoDateToCzech } from '../../lib/petProfileUtils'
import { useAuthorizedHealthScope } from '../../lib/security/useAuthorizedHealthScope'
import { useApp } from '../../context/AppContext'
import type { Pet, WeightMeasurement } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { cn } from '../../lib/utils'

function getYDomain(data: { weight: number }[]): [number, number] {
  const weights = data.map((d) => d.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const spread = max - min
  const padding = spread > 0 ? Math.max(spread * 0.25, 0.4) : 1

  return [
    Math.floor((min - padding) * 10) / 10,
    Math.ceil((max + padding) * 10) / 10,
  ]
}

function chartLabel(date: string): string {
  const match = date.match(/(\d+)\.\s*(\d+)/)
  if (!match) return date
  const months = [
    'Led',
    'Úno',
    'Bře',
    'Dub',
    'Kvě',
    'Čvn',
    'Čvc',
    'Srp',
    'Zář',
    'Říj',
    'Lis',
    'Pro',
  ]
  const monthIdx = Number(match[2]) - 1
  return months[monthIdx] ?? match[2]
}

function usePetMeasurements(petId: string | undefined) {
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!petId) {
      setMeasurements([])
      return
    }
    setMeasurements(getWeightMeasurementsForPet(petId))
  }, [petId, tick])

  const reload = () => setTick((n) => n + 1)
  return { measurements, reload }
}

type WeightChartProps = {
  variant?: 'overview' | 'detail'
  /** Main page pet filter: when unset, show multi-pet compact summary. */
  lockedPetId?: string
  /** Called when user picks a pet from the all-pets summary. */
  onSelectPet?: (petId: string) => void
  className?: string
}

export function WeightChart({
  variant = 'overview',
  lockedPetId,
  onSelectPet,
  className,
}: WeightChartProps) {
  const { pets: allPets, refreshBadges, showToast } = useApp()
  const { allowedPets: pets, canWritePet, canReadPet } = useAuthorizedHealthScope()
  const deniedLocked = Boolean(lockedPetId && !canReadPet(lockedPetId))
  const petId = lockedPetId && canReadPet(lockedPetId) ? lockedPetId : undefined
  const writeAllowed = Boolean(petId && canWritePet(petId))
  const { measurements, reload } = usePetMeasurements(petId)
  const [newWeight, setNewWeight] = useState('')
  const [newWeightNote, setNewWeightNote] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    setNewWeight('')
    setNewWeightNote('')
    setShowAddForm(false)
  }, [petId])

  const selectedPet = pets.find((pet) => pet.id === petId)
  const sortedAsc = useMemo(
    () => [...measurements].sort((a, b) => parseCzechDate(a.date) - parseCzechDate(b.date)),
    [measurements],
  )
  const sortedDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc])
  const latest = sortedDesc[0]
  const trend = computeWeightTrend(measurements)
  const hasChart = measurements.length >= 2
  const hasAnyMeasurement = measurements.length > 0
  const measurementLimit = variant === 'detail' ? 12 : 5

  const chartData = useMemo(
    () =>
      sortedAsc.map((item) => ({
        month: chartLabel(item.date),
        weight: item.weight,
        date: item.date,
      })),
    [sortedAsc],
  )

  const yDomain = useMemo(
    () => (chartData.length > 0 ? getYDomain(chartData) : ([0, 1] as [number, number])),
    [chartData],
  )

  if (deniedLocked) {
    return (
      <p
        className={cn('text-sm text-[#5A6660]', className)}
        data-testid="weight-chart-denied"
      >
        Nemáte oprávnění zobrazit hmotnost tohoto mazlíčka.
      </p>
    )
  }

  const handleAddWeight = () => {
    if (!petId) return
    const normalized = newWeight.trim().replace(',', '.')
    const value = Number(normalized)
    if (!Number.isFinite(value) || value <= 0) return

    const adapter = buildAppClinicalAdapter({
      getHealthRecords: () => [],
      setHealthRecords: () => undefined,
      persistWeightMeasurement,
    })
    const service = createAppClinicalService(adapter, { store: { pets: allPets } })

    try {
      service.createWeightMeasurement({
        context: resolveClinicalStampContext(),
        pets: allPets,
        input: {
          id: `wm_${petId}_${Date.now()}`,
          petId,
          date: formatIsoDateToCzech(todayIsoDate()),
          weight: Math.round(value * 10) / 10,
          note: newWeightNote.trim() || undefined,
        },
      })
      refreshBadges()
      setNewWeight('')
      setNewWeightNote('')
      setShowAddForm(false)
      reload()
    } catch (err) {
      if (isClinicalError(err)) {
        showToast('Bez oprávnění', 'Nemáte oprávnění zapisovat hmotnost.', 'info')
        return
      }
      throw err
    }
  }

  const addForm = (
    <div className="flex flex-wrap gap-2">
      <input
        type="text"
        inputMode="decimal"
        placeholder="Hmotnost (kg)"
        value={newWeight}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, '')
          const sepMatch = raw.match(/[.,]/)
          if (!sepMatch) {
            setNewWeight(raw)
            return
          }
          const sep = sepMatch[0]
          const [whole, ...fractionParts] = raw.split(/[.,]/)
          setNewWeight(`${whole}${sep}${fractionParts.join('')}`)
        }}
        className="h-9 w-28 rounded-xl border border-[#E8E4DC] px-3 text-xs outline-none focus:border-[#234B54]"
      />
      <input
        type="text"
        placeholder="Poznámka (volitelné)"
        value={newWeightNote}
        onChange={(e) => setNewWeightNote(e.target.value)}
        className="h-9 min-w-[140px] flex-1 rounded-xl border border-[#E8E4DC] px-3 text-xs outline-none focus:border-[#234B54]"
      />
      <Button size="sm" variant="primary" onClick={handleAddWeight} disabled={!newWeight.trim()}>
        <Plus size={14} />
        Přidat měření
      </Button>
    </div>
  )

  // —— All pets: compact summary (no chart) ——
  if (!petId) {
    const content = (
      <>
        {variant === 'overview' && (
          <div className="mb-3">
            <h3 className="text-lg font-bold text-[#191E1B]">Vývoj hmotnosti</h3>
            <p className="mt-0.5 text-xs text-[#5A6660]">
              Přehled posledních měření všech mazlíčků
            </p>
          </div>
        )}

        <ul className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
          {pets.map((pet) => (
            <AllPetsWeightRow
              key={pet.id}
              pet={pet}
              onSelect={() => onSelectPet?.(pet.id)}
            />
          ))}
        </ul>
      </>
    )

    if (variant === 'detail') {
      return <div className={className}>{content}</div>
    }

    return (
      <Card variant="elevated" padding="md" className={className}>
        {content}
      </Card>
    )
  }

  // —— Single pet: empty state (no measurements) ——
  if (!hasAnyMeasurement) {
    const empty = (
      <>
        {variant === 'overview' && (
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#191E1B]">Vývoj hmotnosti</h3>
            <p className="mt-0.5 text-xs text-[#5A6660]">
              {selectedPet ? `Měření · ${selectedPet.name}` : 'Měření hmotnosti'}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-5">
          <p className="text-sm font-semibold text-[#191E1B]">Zatím nemáme žádné měření</p>
          <p className="mt-1 text-xs leading-relaxed text-[#5A6660]">
            Přidejte první hodnotu hmotnosti a začněte sledovat vývoj.
          </p>
          {writeAllowed &&
            (showAddForm ? (
              <div className="mt-3">{addForm}</div>
            ) : (
              <Button
                size="sm"
                variant="primary"
                className="mt-3"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={14} />
                Přidat měření
              </Button>
            ))}
        </div>
      </>
    )

    if (variant === 'detail') {
      return <div className={className}>{empty}</div>
    }

    return (
      <Card variant="elevated" padding="lg" className={className}>
        {empty}
      </Card>
    )
  }

  // —— Single pet: full chart (or compact stats if only 1 measurement) ——
  const single = (
    <>
      <div className="mb-5">
        {variant === 'overview' && (
          <>
            <h3 className="text-lg font-bold text-[#191E1B]">Vývoj hmotnosti</h3>
            <p className="mt-0.5 text-xs text-[#5A6660]">
              {selectedPet
                ? `Měření a trend · ${selectedPet.name}`
                : 'Měření a trend pro vybraného mazlíčka'}
            </p>
          </>
        )}

        {latest && (
          <div
            className={cn(
              'flex flex-wrap items-end gap-x-5 gap-y-2',
              variant === 'overview' ? 'mt-4' : 'mt-1',
            )}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Aktuální hmotnost
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-[#191E1B]">
                {formatWeightKg(latest.weight)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Poslední měření
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#234B54]">
                měřeno {latest.date}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Trend
              </p>
              <div className="mt-0.5 text-sm font-semibold text-[#234B54]">
                {hasChart ? trend.label : '→ Potřeba dalšího měření'}
              </div>
            </div>
          </div>
        )}
      </div>

      {hasChart && (
        <div className="h-64 w-full pt-1 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={petId}
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="healthWeightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#234B54" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#234B54" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: '#7D8B82', fontWeight: 500 }}
                axisLine={{ stroke: '#E8E4DC' }}
                tickLine={false}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 12, fill: '#7D8B82', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v} kg`}
                width={52}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as { date: string; weight: number }
                    return (
                      <div className="rounded-xl border border-[#E8E4DC] bg-white p-3 text-xs shadow-lg">
                        <p className="font-bold text-[#191E1B]">{point.date}</p>
                        <p className="mt-1 font-semibold text-[#234B54]">
                          {formatWeightKg(point.weight)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#234B54"
                strokeWidth={2.5}
                fill="url(#healthWeightGradient)"
                dot={{ fill: '#234B54', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 6, fill: '#B8934A', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasChart && (
        <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-4">
          <p className="text-sm font-semibold text-[#191E1B]">
            Zatím nemáme dost měření pro zobrazení grafu.
          </p>
          <p className="mt-1 text-xs text-[#5A6660]">
            Přidejte další měření pro zobrazení vývoje.
          </p>
          <div className="mt-3">{addForm}</div>
        </div>
      )}

      <div className="mt-5 border-t border-[#F0EDE6] pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
            Časová osa měření
          </p>
          {hasChart && (
            <Badge variant="gold" size="sm">
              {trend.label}
            </Badge>
          )}
        </div>

        {(variant === 'detail') && (
          <div className="mb-3">{addForm}</div>
        )}

        <ul className="space-y-1.5">
          {sortedDesc.slice(0, measurementLimit).map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-[12px] text-[#5A6660]"
            >
              <span className="min-w-0 truncate">
                {item.date}
                {item.note ? ` · ${item.note}` : ''}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-[#191E1B]">
                {formatWeightKg(item.weight)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )

  if (variant === 'detail') {
    return <div className={className}>{single}</div>
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      {single}
    </Card>
  )
}

function AllPetsWeightRow({ pet, onSelect }: { pet: Pet; onSelect: () => void }) {
  const list = getWeightMeasurementsForPet(pet.id)
  const sorted = [...list].sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))
  const latest = sorted[0]
  const trend = computeWeightTrend(list)
  const hasData = list.length > 0

  const valueLabel = hasData && latest ? formatWeightKg(latest.weight) : 'Bez měření'
  const metaLabel =
    hasData && latest
      ? list.length >= 2
        ? `měřeno ${latest.date} · ${trend.label}`
        : `měřeno ${latest.date}`
      : 'Přidejte první měření'

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        className="flex h-full w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 text-left transition-colors hover:border-[#D8D3CA] hover:bg-[#FAF8F5]"
      >
        <img
          src={pet.image}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[#E8E4DC]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-[#191E1B]">{pet.name}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-[#5A6660] sm:text-[11px]">
            {metaLabel}
          </p>
        </div>
        <p
          className={cn(
            'w-[5.75rem] shrink-0 text-right text-sm font-bold tabular-nums leading-none',
            hasData ? 'text-[#234B54]' : 'text-[#5A6660]',
          )}
        >
          {valueLabel}
        </p>
        <ChevronRight size={14} className="shrink-0 text-[#D0D5D2]" aria-hidden />
      </button>
    </li>
  )
}
