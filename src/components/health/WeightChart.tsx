import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { TrendingUp } from 'lucide-react'

export function WeightChart() {
  const [selectedPet, setSelectedPet] = useState<'luna' | 'milo' | 'bella'>('luna')

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
  }

  const currentData = petWeightDatasets[selectedPet]
  const idealWeight = currentData[0]?.ideal ?? 28

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Body Mass Index a růst
            </span>
            <Badge variant="success" size="sm">
              <TrendingUp size={11} className="mr-0.5" />
              Stabilní cíl
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-[#191E1B]">Vývoj hmotnosti a vitální funkce</h3>
        </div>

        {/* Companion Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] self-start sm:self-auto gap-1">
          {[
            { id: 'luna', label: 'Luna (28 kg)' },
            { id: 'milo', label: 'Milo (5.2 kg)' },
            { id: 'bella', label: 'Bella (18 kg)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedPet(item.id as any)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPet === item.id
                  ? 'bg-white text-[#2C4A3E] shadow-xs'
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
          <AreaChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2C4A3E" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2C4A3E" stopOpacity={0.0} />
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
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tick={{ fontSize: 12, fill: '#7D8B82', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              unit=" kg"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-[#E8E4DC] bg-white p-3 shadow-lg text-xs">
                      <p className="font-bold text-[#191E1B]">{label} 2026</p>
                      <p className="mt-1 font-semibold text-[#2C4A3E]">
                        Zaznamenaná hmotnost: {payload[0].value} kg
                      </p>
                      <p className="text-[11px] text-[#7D8B82]">
                        Ideální cíl: {idealWeight.toFixed(1).replace('.', ',')} kg (optimální rozsah)
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
              stroke="#2C4A3E"
              strokeWidth={2.5}
              fill="url(#weightGradient)"
              dot={{ fill: '#2C4A3E', r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
              activeDot={{ r: 6, fill: '#B8934A', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
