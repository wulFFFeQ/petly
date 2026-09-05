import {
  Activity,
  Check,
  ChevronRight,
  Clock,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  Utensils,
} from 'lucide-react'
import { formatTodayHeader } from '../../../lib/dashboardDates'
import {
  formatHealthStatus,
  formatOptionalText,
  formatOptionalWeight,
} from '../../../lib/petProfileDisplay'
import { formatIsoDateToCzech } from '../../../lib/petProfileUtils'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/Badge'
import { Card } from '../../ui/Card'
import type { PetProfileTabState } from './usePetProfileTabState'

type OverviewTabProps = PetProfileTabState['overview']

export function OverviewTab({
  pet,
  onTabChange,
  weightData,
  idealWeightHint,
  showLastHeatCard,
  lastHeatEvent,
  lastHeatLabel,
  lastHeatSubtext,
  overviewLastVetVisit,
  setAssessmentOpen,
  openNewHealthRecord,
  openEditCalendarEvent,
  openNewCalendarEvent,
  dailyCareTasks,
  dailyCareDoneSet,
  dailyCarePercent,
  toggleDailyCareTask,
  openDailyCareTaskDetail,
  setLifestyleEdit,
  setLifestyleValue,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div
        className={`grid gap-4 sm:grid-cols-2 ${
          showLastHeatCard ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        <Card variant="elevated" padding="md" hoverable onClick={() => setAssessmentOpen(true)}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Zdravotní stav
            </span>
            <ShieldCheck size={16} className="text-[#234B54]" />
          </div>
          <div className="mt-2 flex min-h-[1.75rem] items-center gap-2">
            {pet.healthStatus && (
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full shadow-sm',
                  pet.healthStatus === 'excellent' || pet.healthStatus === 'good'
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/25'
                    : pet.healthStatus === 'attention'
                      ? 'bg-amber-400 ring-2 ring-amber-400/25'
                      : pet.healthStatus === 'vet_check'
                        ? 'bg-orange-500 ring-2 ring-orange-500/25'
                        : 'bg-red-500 ring-2 ring-red-500/25',
                )}
                aria-hidden
              />
            )}
            <p
              className={cn(
                'text-[22px] font-semibold leading-snug tracking-normal',
                pet.healthStatus === 'excellent' || pet.healthStatus === 'good'
                  ? 'text-[#2C4A3E]'
                  : pet.healthStatus === 'attention'
                    ? 'text-amber-900'
                    : pet.healthStatus === 'vet_check'
                      ? 'text-orange-900'
                      : pet.healthStatus === 'urgent'
                        ? 'text-red-900'
                        : 'text-[#191E1B]',
              )}
            >
              {formatHealthStatus(pet.healthStatus)}
            </p>
          </div>
          <p className="text-xs text-[#234B54] font-medium mt-1">
            {pet.healthAssessment
              ? `Aktualizováno ${formatIsoDateToCzech(pet.healthAssessment.assessedAt)}`
              : 'Klepnutím vyplníte orientační přehled'}
          </p>
        </Card>

        <Card variant="elevated" padding="md" hoverable onClick={() => onTabChange('health')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Tělesná hmotnost
            </span>
            <Activity size={16} className="text-emerald-700" />
          </div>
          <p className="mt-2 text-xl font-bold text-[#191E1B]">
            {weightData.length > 0
              ? formatOptionalWeight(weightData[weightData.length - 1]?.weight)
              : formatOptionalWeight(pet.weight)}
          </p>
          <p className="text-xs text-[#7D8B82] font-medium mt-1">
            {idealWeightHint ? (
              <span className="inline-flex rounded-full border border-[#D1E0D8] bg-[#EBF2EE] px-2 py-0.5 text-[11px] font-semibold text-[#2C4A3E]">
                {idealWeightHint}
              </span>
            ) : (
              'Sledujte vývoj a přidávejte měření'
            )}
          </p>
        </Card>

        <Card
          variant="elevated"
          padding="md"
          hoverable
          onClick={() => openNewHealthRecord({ petId: pet.id, type: 'vet' })}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Poslední návštěva veterináře
            </span>
            <Stethoscope size={16} className="text-sky-700" />
          </div>
          <p className="mt-2 text-xl font-bold text-[#191E1B]">
            {formatOptionalText(overviewLastVetVisit)}
          </p>
          <p className="text-xs text-[#7D8B82] font-medium mt-1">Zapsat návštěvu a údaje</p>
        </Card>

        {showLastHeatCard && (
          <Card
            variant="elevated"
            padding="md"
            hoverable
            onClick={() => {
              if (lastHeatEvent) {
                openEditCalendarEvent(lastHeatEvent.id)
                return
              }
              openNewCalendarEvent({ petId: pet.id, type: 'heat' })
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Poslední hárání
              </span>
              <HeartHandshake size={16} className="text-rose-700" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#191E1B]">
              {formatOptionalText(lastHeatLabel)}
            </p>
            <p className="text-xs text-rose-800/80 font-medium mt-1">{lastHeatSubtext}</p>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="elevated">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#FAF4E6] text-[#B8934A] flex items-center justify-center">
              <Utensils size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191E1B]">Výživa a stravovací režim</h3>
              <p className="text-xs text-[#7D8B82]">Doporučený krmný plán a doplňky stravy</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {(
              [
                {
                  key: 'diet' as const,
                  label: 'Hlavní výživa',
                  value: pet.diet,
                  placeholder: 'např. Royal Canin Adult, BARF…',
                },
                {
                  key: 'supplements' as const,
                  label: 'Denní doplňky stravy',
                  value: pet.supplements,
                  placeholder: 'např. omega-3, kloubní výživa…',
                },
                {
                  key: 'favoriteToy' as const,
                  label: 'Oblíbené hračky a stimulace',
                  value: pet.favoriteToy,
                  placeholder: 'např. míček, peříčko, čichací kobereček…',
                },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setLifestyleEdit(item.key)
                  setLifestyleValue(item.value ?? '')
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 text-left transition-colors hover:border-[#D1E0D8] hover:bg-white cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    {item.label}
                  </span>
                  <p className="mt-0.5 font-semibold text-[#191E1B]">
                    {formatOptionalText(item.value)}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[#A3AEA7]" />
              </button>
            ))}
          </div>
        </Card>

        <Card variant="elevated">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#EBF2EE] text-[#234B54] flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191E1B]">Denní péče – kontrolní seznam</h3>
                <p className="text-xs text-[#7D8B82]">
                  Dnes · {formatTodayHeader().toLowerCase()} · léky a naplánované události
                </p>
              </div>
            </div>
            {dailyCareTasks.length > 0 && (
              <Badge
                variant={
                  dailyCarePercent === 100
                    ? 'success'
                    : dailyCarePercent >= 50
                      ? 'primary'
                      : 'warning'
                }
                size="sm"
              >
                {dailyCarePercent} % splněno
              </Badge>
            )}
          </div>
          {dailyCareTasks.length === 0 ? (
            <p className="text-sm text-[#7D8B82] py-6 text-center">
              Dnes nemáte žádné úkoly péče. Přidejte léky nebo událost v kalendáři.
            </p>
          ) : (
            <div className="space-y-2.5">
              {dailyCareTasks.map((task) => {
                const done = dailyCareDoneSet.has(task.id)
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 transition-colors',
                      done ? 'border-[#D1E0D8] bg-[#EBF2EE]/60' : 'border-[#E8E4DC] bg-white',
                    )}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={done ? `Odškrtnout: ${task.title}` : `Splnit: ${task.title}`}
                      onClick={() => toggleDailyCareTask(task.id)}
                      className={cn(
                        'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors',
                        done
                          ? 'border-[#2C4A3E] bg-[#2C4A3E] text-white'
                          : 'border-[#D1D9D4] bg-white text-transparent hover:border-[#2C4A3E]',
                      )}
                    >
                      <Check size={12} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDailyCareTaskDetail(task.id, task.kind)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p
                        className={cn(
                          'text-xs font-semibold truncate',
                          done ? 'text-[#5A6660] line-through' : 'text-[#191E1B]',
                        )}
                      >
                        {task.title}
                        {task.time ? ` · ${task.time}` : ''}
                      </p>
                      {task.detail && (
                        <p className="mt-0.5 text-[11px] text-[#7D8B82] truncate">{task.detail}</p>
                      )}
                    </button>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                      {task.kind === 'medication' ? 'Lék' : 'Událost'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
