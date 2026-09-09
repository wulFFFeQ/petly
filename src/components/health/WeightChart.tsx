import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getWeightMeasurementsForPet,
  persistWeightMeasurement,
} from '../../lib/badges/badgeData'
import {
  computeWeightTrend,
  formatWeightKg,
} from '../../lib/healthDashboard'
import { parseCzechDate, todayIsoDate, formatIsoDateToCzech } from '../../lib/petProfileUtils'
import { useApp } from '../../context/AppContext'
import type { WeightMeasurement } from '../../types'
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

type WeightChartProps = {
  variant?: 'overview' | 'detail'
  /** When set, hide pet switcher and lock to this pet. */
  lockedPetId?: string
  onPetChange?: (petId: string) => void
  className?: string
}

export function WeightChart({
  variant = 'overview',
  lockedPetId,
  onPetChange,
  className,
}: WeightChartProps) {
  const { pets, refreshBadges } = useApp()
  const [selectedPetId, setSelectedPetId] = useState(
    () => lockedPetId ?? pets[0]?.id ?? 'luna',
  )
  const [measurements, setMeasurements] = useState<WeightMeasurement[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [newWeightNote, setNewWeightNote] = useState('')

  useEffect(() => {
    if (lockedPetId) setSelectedPetId(lockedPetId)
  }, [lockedPetId])

  useEffect(() => {
    if (!pets.some((pet) => pet.id === selectedPetId) && pets[0]) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  const reloadMeasurements = () => {
    setMeasurements(getWeightMeasurementsForPet(selectedPetId))
  }

  useEffect(() => {
    reloadMeasurements()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when pet changes
  }, [selectedPetId])

  const selectedPet = pets.find((pet) => pet.id === selectedPetId)
  const sortedAsc = useMemo(
    () => [...measurements].sort((a, b) => parseCzechDate(a.date) - parseCzechDate(b.date)),
    [measurements],
  )
  const sortedDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc])
  const latest = sortedDesc[0]
  const trend = computeWeightTrend(measurements)
  const hasEnoughForTrend = measurements.length >= 2

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

  const handleSelectPet = (petId: string) => {
    setSelectedPetId(petId)
    onPetChange?.(petId)
  }

  const handleAddWeight = () => {
    const normalized = newWeight.trim().replace(',', '.')
    const value = Number(normalized)
    if (!Number.isFinite(value) || value <= 0) return

    const entry: WeightMeasurement = {
      id: `wm_${selectedPetId}_${Date.now()}`,
      petId: selectedPetId,
      date: formatIsoDateToCzech(todayIsoDate()),
      weight: Math.round(value * 10) / 10,
      note: newWeightNote.trim() || undefined,
    }
    persistWeightMeasurement(entry)
    refreshBadges()
    setNewWeight('')
    setNewWeightNote('')
    reloadMeasurements()
  }

  const showPetSwitcher = !lockedPetId && pets.length > 0
  const measurementLimit = variant === 'detail' ? 12 : 5

  const inner = (
    <>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          {variant === 'overview' && (
            <>
              <h3 className="text-lg font-bold text-[#191E1B]">Vývoj hmotnosti</h3>
              <p className="mt-0.5 text-xs text-[#5A6660]">
                Měření a trend pro vybraného mazlíčka
              </p>
            </>
          )}

          {hasEnoughForTrend && latest ? (
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
                  {trend.label}
                </div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-4',
                variant === 'overview' ? 'mt-4' : 'mt-2',
              )}
            >
              <p className="text-sm font-semibold text-[#191E1B]">
                Zatím nemáme dost měření pro zobrazení trendu.
              </p>
              <p className="mt-1 text-xs text-[#5A6660]">
                Přidejte alespoň dvě měření pro {selectedPet?.name ?? 'mazlíčka'}.
              </p>
              {variant === 'overview' && (
                <div className="mt-3 flex flex-wrap gap-2">
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
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleAddWeight}
                    disabled={!newWeight.trim()}
                  >
                    <Plus size={14} />
                    Přidat měření
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {showPetSwitcher && (
          <div className="inline-flex max-w-full flex-wrap self-start gap-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-1">
            {pets.map((pet) => {
              const latestForPet = getWeightMeasurementsForPet(pet.id).sort(
                (a, b) => parseCzechDate(b.date) - parseCzechDate(a.date),
              )[0]
              const weightLabel =
                latestForPet?.weight ?? pet.weight
              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => handleSelectPet(pet.id)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                    selectedPetId === pet.id
                      ? 'bg-white text-[#234B54] shadow-xs'
                      : 'text-[#7D8B82] hover:text-[#191E1B]',
                  )}
                >
                  {pet.name}
                  {weightLabel != null ? ` (${formatWeightKg(weightLabel).replace(' kg', '')} kg)` : ''}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {hasEnoughForTrend && (
        <div className="h-64 w-full pt-1 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              key={selectedPetId}
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

      {(variant === 'detail' || hasEnoughForTrend) && (
        <div className="mt-5 border-t border-[#F0EDE6] pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Časová osa měření
            </p>
            {hasEnoughForTrend && (
              <Badge variant="gold" size="sm">
                {trend.label}
              </Badge>
            )}
          </div>

          {variant === 'detail' && (
            <div className="mb-3 flex flex-wrap gap-2">
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
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddWeight}
                disabled={!newWeight.trim()}
              >
                <Plus size={14} />
                Přidat měření
              </Button>
            </div>
          )}

          {sortedDesc.length === 0 ? (
            <p className="py-2 text-sm text-[#7D8B82]">Zatím žádná měření.</p>
          ) : (
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
          )}
        </div>
      )}
    </>
  )

  if (variant === 'detail') {
    return <div className={className}>{inner}</div>
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      {inner}
    </Card>
  )
}
