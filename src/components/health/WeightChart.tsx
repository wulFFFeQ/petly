import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo, useState } from 'react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { TrendingUp } from 'lucide-react'

const petWeightDatasets = {
  luna: [
    { month: 'Bře', weight: 27.2, ideal: 28.0 },
    { month: 'Dub', weight: 27.5, ideal: 28.0 },
    { month: 'Kvě', weight: 27.8, ideal: 28.0 },
    { month: 'Čvn', weight: 28.0, ideal: 28.0 },
    { month: 'Čvc', weight: 28.2, ideal: 28.0 },
    { month: 'Srp', weight: 28.0, ideal: 28.0 },
  ],
  milo: [
    { month: 'Bře', weight: 4.8, ideal: 5.0 },
    { month: 'Dub', weight: 4.9, ideal: 5.0 },
    { month: 'Kvě', weight: 5.0, ideal: 5.0 },
    { month: 'Čvn', weight: 5.1, ideal: 5.0 },
    { month: 'Čvc', weight: 5.2, ideal: 5.0 },
    { month: 'Srp', weight: 5.2, ideal: 5.0 },
  ],
  bella: [
    { month: 'Bře', weight: 17.6, ideal: 18.0 },
    { month: 'Dub', weight: 17.8, ideal: 18.0 },
    { month: 'Kvě', weight: 17.9, ideal: 18.0 },
    { month: 'Čvn', weight: 18.0, ideal: 18.0 },
    { month: 'Čvc', weight: 18.0, ideal: 18.0 },
    { month: 'Srp', weight: 18.0, ideal: 18.0 },
  ],
} satisfies Record<'luna' | 'milo' | 'bella', { month: string; weight: number; ideal: number }[]>

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

export function WeightChart() {
  const [selectedPet, setSelectedPet] = useState<'luna' | 'milo' | 'bella'>('luna')

  const currentData = petWeightDatasets[selectedPet]
  const idealWeight = currentData[0]?.ideal ?? 28
  const yDomain = useMemo(() => getYDomain(currentData), [currentData])

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="gold" size="sm">
              <TrendingUp size={11} className="mr-0.5" />
              Stabilní trend
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-[#191E1B]">Vývoj hmotnosti</h3>
          <p className="mt-0.5 text-xs text-[#5A6660]">
            Měsíční záznamy a ideální cíl pro vybraného mazlíčka
          </p>
        </div>

        <div className="inline-flex self-start gap-1 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-1 sm:self-auto">
          {[
            { id: 'luna' as const, label: 'Luna (28 kg)' },
            { id: 'milo' as const, label: 'Milo (5.2 kg)' },
            { id: 'bella' as const, label: 'Bella (18 kg)' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedPet(item.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                selectedPet === item.id
                  ? 'bg-white text-[#234B54] shadow-xs'
                  : 'text-[#7D8B82] hover:text-[#191E1B]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            key={selectedPet}
            data={currentData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-[#E8E4DC] bg-white p-3 shadow-lg text-xs">
                      <p className="font-bold text-[#191E1B]">{label} 2026</p>
                      <p className="mt-1 font-semibold text-[#234B54]">
                        Zaznamenaná hmotnost: {payload[0].value} kg
                      </p>
                      <p className="text-[11px] text-[#7D8B82]">
                        Ideální cíl: {idealWeight.toFixed(1).replace('.', ',')} kg
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
              fill="url(#weightGradient)"
              dot={{ fill: '#234B54', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 6, fill: '#B8934A', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
