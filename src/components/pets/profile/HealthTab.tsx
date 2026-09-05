import { Bell, BellOff, Check, ChevronLeft, Plus, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { parseCzechDate } from '../../../lib/petProfileUtils'
import { formatMedicationRemainingLabel } from '../../../lib/medicationReminders'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { healthCategoryCopy, recordTypeMeta } from './healthHelpers'
import type { PetProfileTabState } from './usePetProfileTabState'

type HealthTabProps = PetProfileTabState['health']

export function HealthTab({
  pet,
  healthCategoryView,
  setHealthCategoryView,
  returnToHealthOverview,
  healthOverviewRef,
  filteredPetRecords,
  categoryActiveMedications,
  healthSummaryCards,
  healthActionItems,
  openRecordDetail,
  openNewHealthRecord,
  setActiveModal,
  toggleMedicationReminder,
  weightData,
  idealWeightHint,
  chartData,
  yDomain,
  newWeight,
  setNewWeight,
  newWeightNote,
  setNewWeightNote,
  handleAddWeight,
}: HealthTabProps) {
  return (
    <div className="space-y-6">
      {healthCategoryView ? (
        <Card variant="elevated">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={returnToHealthOverview}
                className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
              >
                <ChevronLeft size={14} />
                Zpět k přehledu
              </button>
              <h3 className="text-lg font-bold text-[#191E1B]">
                {healthCategoryCopy[healthCategoryView].title}
              </h3>
              <p className="mt-0.5 text-xs text-[#7D8B82]">
                {healthCategoryCopy[healthCategoryView].subtitle}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#7D8B82]">
                {filteredPetRecords.length}{' '}
                {filteredPetRecords.length === 1 ? 'záznam' : 'záznamů'} · chronologicky
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => openNewHealthRecord({ petId: pet.id, type: healthCategoryView })}
              className="shrink-0"
            >
              <Plus size={15} />
              <span>Přidat záznam</span>
            </Button>
          </div>

          {healthCategoryView === 'medication' && categoryActiveMedications.length > 0 && (
            <div className="mb-5 rounded-2xl border border-[#E8D8B5] bg-[#FAF4E6]/50 p-3.5">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8A6B2E]">
                Aktivní léčba
              </p>
              <ul className="space-y-2">
                {categoryActiveMedications.map((record) => (
                  <li
                    key={record.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8E4DC] bg-white/90 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => openRecordDetail(record)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p className="text-sm font-bold text-[#191E1B] truncate">
                        {record.subtitle || record.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#5A6660]">
                        {[record.dosage || 'dle předpisu', record.scheduleTime]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#2C4A3E]">
                        {formatMedicationRemainingLabel(record)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMedicationReminder(record.id)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                        record.reminderEnabled
                          ? 'border border-[#D1E0D8] bg-[#EBF2EE] text-[#2C4A3E]'
                          : 'border border-[#E8D8B5] bg-[#FAF4E6] text-[#8A6B2E]',
                      )}
                    >
                      {record.reminderEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                      {record.reminderEnabled ? 'Aktivní' : 'Připomínka'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Historie
            </p>
            <ul className="divide-y divide-[#F0EDE6]">
              {filteredPetRecords.length === 0 ? (
                <li className="py-8 text-center text-sm text-[#7D8B82]">
                  V této kategorii zatím nejsou žádné záznamy.
                </li>
              ) : (
                filteredPetRecords.map((record) => {
                  const meta = recordTypeMeta(record.type)
                  const Icon = meta.icon
                  return (
                    <li key={record.id}>
                      <button
                        type="button"
                        onClick={() => openRecordDetail(record)}
                        className="w-full py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-xl transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={cn(
                              'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center',
                              meta.className,
                            )}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-[#191E1B]">{record.title}</p>
                              <Badge
                                variant={
                                  record.status === 'completed'
                                    ? 'success'
                                    : record.status === 'active'
                                      ? 'primary'
                                      : 'default'
                                }
                                size="sm"
                              >
                                {record.status === 'completed'
                                  ? 'Dokončeno'
                                  : record.status === 'active'
                                    ? 'Aktivní'
                                    : 'Naplánováno'}
                              </Badge>
                            </div>
                            <p className="text-xs text-[#4A564F] font-medium mt-0.5 truncate">
                              {record.subtitle}
                            </p>
                            {(record.doctor || record.nextDueDate || record.clinic) && (
                              <p className="text-[11px] text-[#7D8B82] mt-0.5">
                                {[
                                  record.doctor,
                                  record.clinic,
                                  record.nextDueDate && `Další: ${record.nextDueDate}`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          size="sm"
                          className="font-mono self-end sm:self-center shrink-0"
                        >
                          {record.date}
                        </Badge>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </Card>
      ) : (
        <>
          <div ref={healthOverviewRef} className="space-y-6 scroll-mt-4">
            <Card variant="elevated">
              <div className="space-y-8">
                <section>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                        1 · Rychlý stav
                      </p>
                      <h3 className="mt-0.5 text-lg font-bold text-[#191E1B]">
                        Rychlý zdravotní přehled
                      </h3>
                      <p className="mt-0.5 text-xs text-[#7D8B82]">
                        Klepnutím otevřete historii vybrané kategorie
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setActiveModal('addHealthRecord', pet.id)}
                      className="shrink-0"
                    >
                      <Plus size={15} />
                      <span>Přidat záznam</span>
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {healthSummaryCards.map(({ key, label, value, subtext, icon: Icon, color, accent }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setHealthCategoryView(key)}
                        className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5 text-left transition-all cursor-pointer hover:bg-white hover:border-[#D1E0D8] hover:shadow-sm"
                      >
                        <div className={cn('mb-2.5 h-0.5 w-8 rounded-full', accent)} aria-hidden />
                        <div className="flex items-start gap-2.5">
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                              color,
                            )}
                          >
                            <Icon size={16} strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]/80">
                              {label}
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-[#191E1B]">{value}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#5A6660]">{subtext}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="border-t border-[#F0EDE6] pt-8">
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                      2 · Aktuální úkoly
                    </p>
                    <h3 className="mt-0.5 text-lg font-bold text-[#191E1B]">Co je potřeba řešit</h3>
                    <p className="mt-0.5 text-xs text-[#7D8B82]">
                      Aktivní léčba, blížící se očkování a naplánované kontroly
                    </p>
                  </div>

                  {healthActionItems.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#D1E0D8] bg-[#EBF2EE]/50 px-4 py-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2C4A3E] border border-[#D1E0D8]">
                        <Check size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#2C4A3E]">
                          Vše je aktuálně v pořádku
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#5A6660]">
                          Nemáte žádné blížící se zdravotní úkoly.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {healthActionItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => openRecordDetail(item.record)}
                            className="min-w-0 flex-1 cursor-pointer text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                                {item.kind === 'medication'
                                  ? 'Lék'
                                  : item.kind === 'vaccination'
                                    ? 'Očkování'
                                    : item.kind === 'examination'
                                      ? 'Vyšetření'
                                      : 'Kontrola'}
                              </span>
                              <p className="text-sm font-bold text-[#191E1B] truncate">
                                {item.label}
                              </p>
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#5A6660]">{item.detail}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-[#2C4A3E]">
                              {item.meta}
                            </p>
                          </button>
                          {item.kind === 'medication' && (
                            <button
                              type="button"
                              onClick={() => toggleMedicationReminder(item.record.id)}
                              className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                                item.record.reminderEnabled
                                  ? 'border border-[#D1E0D8] bg-[#EBF2EE] text-[#2C4A3E]'
                                  : 'border border-[#E8D8B5] bg-[#FAF4E6] text-[#8A6B2E]',
                              )}
                            >
                              {item.record.reminderEnabled ? (
                                <Bell size={12} />
                              ) : (
                                <BellOff size={12} />
                              )}
                              {item.record.reminderEnabled ? 'Aktivní' : 'Připomínka'}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </Card>

            <Card variant="elevated">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#191E1B] flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#234B54]" />
                    Vývoj hmotnosti
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-[#7D8B82]">
                      Aktuálně {weightData[weightData.length - 1]?.weight ?? pet.weight ?? '—'} kg
                    </p>
                    {idealWeightHint && (
                      <span className="inline-flex items-center rounded-full border border-[#D1E0D8] bg-[#EBF2EE] px-2.5 py-0.5 text-[11px] font-semibold tracking-tight text-[#2C4A3E]">
                        {idealWeightHint}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {chartData.length > 0 && (
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7D8B82' }} />
                      <YAxis domain={yDomain} tick={{ fontSize: 10, fill: '#7D8B82' }} width={36} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#234B54"
                        fill="#E0EAEC"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-[#F0EDE6] pt-4">
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
                  className="h-9 flex-1 min-w-[140px] rounded-xl border border-[#E8E4DC] px-3 text-xs outline-none focus:border-[#234B54]"
                />
                <Button size="sm" variant="primary" onClick={handleAddWeight} disabled={!newWeight.trim()}>
                  <Plus size={14} />
                  Přidat měření
                </Button>
              </div>
              <ul className="mt-3 space-y-1.5">
                {[...weightData]
                  .sort((a, b) => parseCzechDate(b.date) - parseCzechDate(a.date))
                  .slice(0, 4)
                  .map((w) => (
                    <li key={w.id} className="flex justify-between text-[11px] text-[#5A6660] px-1">
                      <span>
                        {w.date}
                        {w.note ? ` · ${w.note}` : ''}
                      </span>
                      <span className="font-bold text-[#191E1B] tabular-nums">{w.weight} kg</span>
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
