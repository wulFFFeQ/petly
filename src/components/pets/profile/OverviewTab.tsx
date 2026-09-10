import {
  Activity,
  Check,
  ChevronRight,
  Clock,
  Heart,
  HeartHandshake,
  Pencil,
  Search,
  ShieldCheck,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  Utensils,
} from 'lucide-react'
import { BadgesSection } from '../../badges/BadgesSection'
import { useApp } from '../../../context/AppContext'
import {
  buildConnectionPreferencesUpdate,
  CONNECTION_ACTIVITY_REGISTRY,
  type ConnectionActivityId,
} from '../../../lib/connections'
import { formatTodayHeader } from '../../../lib/dashboardDates'
import {
  formatHealthStatus,
  formatLifestyleList,
  formatOptionalText,
  formatOptionalWeight,
} from '../../../lib/petProfileDisplay'
import { formatIsoDateToCzech } from '../../../lib/petProfileUtils'
import {
  applyPublicDiscoverMigration,
  loadPrivacySettings,
  savePrivacySettings,
} from '../../../lib/privacy'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { PetFoundQrCard } from '../found/PetFoundQrCard'
import { LostPetOwnerPanel } from '../lost/LostPetOwnerPanel'
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
  openLifestyleEditor,
  openAboutEditor,
}: OverviewTabProps) {
  const { earnedBadges, updatePet, showToast } = useApp()

  const togglePublicDiscover = () => {
    const next = !pet.publicDiscover
    updatePet(pet.id, { publicDiscover: next })
    if (next) {
      // Elevate Discover identity + tagging fields if unset (safe publicDiscover migration).
      const settings = loadPrivacySettings([pet])
      const migrated = applyPublicDiscoverMigration(settings, [{ ...pet, publicDiscover: true }])
      savePrivacySettings(migrated)
    }
    showToast(
      next ? 'Profil je veřejný v Objevovat' : 'Profil skryt z Objevovat',
      next
        ? 'Ostatní vás mohou najít. Vy sami sebe ve výsledcích neuvidíte.'
        : 'Mazlíček se v Objevovat nezobrazí.',
      next ? 'gold' : 'success',
    )
  }

  const connectionEnabled = Boolean(pet.connectionPreferences?.enabled)
  const connectionLookingFor = pet.connectionPreferences?.lookingFor ?? []

  const toggleConnectionOffer = () => {
    const nextEnabled = !connectionEnabled
    const lookingFor = connectionLookingFor
    updatePet(pet.id, {
      connectionPreferences: buildConnectionPreferencesUpdate({
        enabled: nextEnabled,
        lookingFor,
      }),
    })
    if (nextEnabled && !pet.publicDiscover) {
      showToast(
        'Propojení zapnuto',
        'Aby se mazlíček objevil v Objevovat, zapněte také veřejný profil.',
        'info',
      )
    } else {
      showToast(
        nextEnabled ? 'Nabízíme k propojení' : 'Propojení vypnuto',
        nextEnabled
          ? 'Ostatní mohou vidět, že hledáte pet parťáka.'
          : 'Mazlíček se v návrzích propojení nezobrazí.',
        nextEnabled ? 'gold' : 'success',
      )
    }
  }

  const toggleConnectionActivity = (id: ConnectionActivityId) => {
    const nextLooking = connectionLookingFor.includes(id)
      ? connectionLookingFor.filter((item) => item !== id)
      : [...connectionLookingFor, id]
    updatePet(pet.id, {
      connectionPreferences: buildConnectionPreferencesUpdate({
        enabled: connectionEnabled,
        lookingFor: nextLooking,
      }),
    })
  }

  return (
    <div className="space-y-6">
      {(pet.lostStatus || pet.activeLostAnnouncementId) && <LostPetOwnerPanel pet={pet} />}

      <PetFoundQrCard pet={pet} />

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

      <Card variant="elevated">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF4E6] text-[#B8934A]">
              <Heart size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191E1B]">O mazlíčkovi</h3>
              <p className="text-xs text-[#7D8B82]">
                Veřejný popis, povaha a to, co hledá — vhodné i pro Objevovat
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={openAboutEditor}>
            <Pencil size={13} />
            Upravit
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#191E1B]">Veřejný profil v Objevovat</p>
            <p className="mt-0.5 text-[11px] text-[#7D8B82]">
              {pet.publicDiscover
                ? 'Zapnuto — bez zdravotních údajů, mikročipu a kontaktů.'
                : 'Vypnuto — mazlíček se v Objevovat nezobrazí.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(pet.publicDiscover)}
            aria-label="Veřejný profil v Objevovat"
            onClick={togglePublicDiscover}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer',
              pet.publicDiscover ? 'bg-[#2C4A3E]' : 'bg-[#D1D5D0]',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
                pet.publicDiscover && 'translate-x-5',
              )}
            />
          </button>
        </div>

        <div className="mb-4 space-y-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#191E1B]">Propojení</p>
              <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                Najděte svého pet parťáka — bez dating / swipe.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={connectionEnabled}
              aria-label="Nabízet tohoto mazlíčka k propojení"
              onClick={toggleConnectionOffer}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer',
                connectionEnabled ? 'bg-[#2C4A3E]' : 'bg-[#D1D5D0]',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
                  connectionEnabled && 'translate-x-5',
                )}
              />
            </button>
          </div>
          <p className="text-[11px] font-medium text-[#4A564F]">
            {connectionEnabled
              ? 'Nabízet tohoto mazlíčka k propojení'
              : 'Nabízení k propojení je vypnuté'}
          </p>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
              Hledáme
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CONNECTION_ACTIVITY_REGISTRY.map((item) => {
                const active = connectionLookingFor.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleConnectionActivity(item.id)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors',
                      active
                        ? 'bg-[#EBF2EE] text-[#2C4A3E] ring-1 ring-[#2C4A3E]/25'
                        : 'bg-white text-[#5A6660] ring-1 ring-[#E8E4DC] hover:bg-[#EBF2EE]',
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {pet.bio ||
        pet.personality ||
        (pet.likes && pet.likes.length > 0) ||
        (pet.dislikes && pet.dislikes.length > 0) ||
        pet.lookingFor ? (
          <div className="space-y-4">
            {pet.bio && (
              <p className="text-sm leading-relaxed text-[#4A564F]">{pet.bio}</p>
            )}

            {pet.personality && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                  Povaha
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[#191E1B]">{pet.personality}</p>
              </div>
            )}

            {pet.likes && pet.likes.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                  <ThumbsUp size={11} className="text-[#2C4A3E]" />
                  Má rád
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pet.likes.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[#EBF2EE] px-2.5 py-1 text-xs font-medium text-[#2C4A3E]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pet.dislikes && pet.dislikes.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A3AEA7]">
                  <ThumbsDown size={11} className="text-[#7D8B82]" />
                  Nemá rád
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pet.dislikes.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-[#F3F0EA] px-2.5 py-1 text-xs font-medium text-[#5A6660]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {pet.lookingFor && (
              <div className="rounded-xl border border-[#E8D8B5]/70 bg-[#FAF4E6]/60 px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B8934A]">
                  <Search size={11} />
                  Hledá
                </p>
                <p className="mt-1 text-sm font-medium text-[#191E1B]">{pet.lookingFor}</p>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={openAboutEditor}
            className="w-full rounded-xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] px-4 py-5 text-left transition-colors hover:border-[#D1E0D8] hover:bg-white cursor-pointer"
          >
            <p className="text-sm font-semibold text-[#191E1B]">Zatím nevyplněno</p>
            <p className="mt-1 text-xs text-[#7D8B82] leading-relaxed">
              Přidejte krátký popis, povahu, co má rád a co hledá — stejně jako na veřejném
              profilu v Objevovat.
            </p>
          </button>
        )}
      </Card>

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
                },
                {
                  key: 'supplements' as const,
                  label: 'Denní doplňky stravy',
                  value: pet.supplements,
                },
                {
                  key: 'favoriteToy' as const,
                  label: 'Oblíbené hračky a stimulace',
                  value: pet.favoriteToy,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openLifestyleEditor(item.key)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 text-left transition-colors hover:border-[#D1E0D8] hover:bg-white cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    {item.label}
                  </span>
                  <p className="mt-0.5 font-semibold text-[#191E1B]">
                    {formatLifestyleList(item.value)}
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

      <BadgesSection scope="pet" petId={pet.id} earnedBadges={earnedBadges} />
    </div>
  )
}
