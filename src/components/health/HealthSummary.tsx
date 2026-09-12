import { Heart, Pill, Plus, Stethoscope, Syringe } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getWeightMeasurementsForPet } from '../../lib/badges/badgeData'
import {
  averageWeightLabel,
  buildDashboardSummaryCards,
  buildUpcomingHealthEvents,
  sortHealthRecordsNewestFirst,
  type HealthDashboardDetail,
  type HealthPetFilter,
} from '../../lib/healthDashboard'
import { useAuthorizedHealthScope } from '../../lib/security/useAuthorizedHealthScope'
import { cn } from '../../lib/utils'
import type { HealthRecord } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { HealthRecordDetailBody } from './HealthRecordDetailBody'

const upcomingAccent = [
  {
    types: ['vaccination', 'deworming', 'antiparasitic'],
    icon: Syringe,
    iconClass: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
    rowTint: 'bg-[#EEF4F5]/50',
  },
  {
    types: ['vet', 'examination', 'lab', 'surgery', 'dental', 'rehab'],
    icon: Stethoscope,
    iconClass: 'text-sky-800 bg-sky-100 border-sky-200/60',
    rowTint: 'bg-sky-50/40',
  },
  {
    types: ['medication'],
    icon: Pill,
    iconClass: 'text-amber-900 bg-amber-100 border-amber-200/60',
    rowTint: 'bg-amber-50/40',
  },
  {
    types: [] as string[],
    icon: Heart,
    iconClass: 'text-purple-800 bg-purple-100 border-purple-200/60',
    rowTint: 'bg-purple-50/30',
  },
] as const

function accentForType(type: string) {
  return (
    upcomingAccent.find((item) => item.types.includes(type)) ??
    upcomingAccent[upcomingAccent.length - 1]
  )
}

const recordTypeLabel: Record<HealthRecord['type'], string> = {
  vaccination: 'Očkování',
  medication: 'Léky',
  vet: 'Veterinář',
  examination: 'Vyšetření',
  assessment: 'Hodnocení',
}

type HealthSummaryProps = {
  petFilter: HealthPetFilter
  onOpenDetail: (detail: HealthDashboardDetail) => void
}

export function HealthSummary({ petFilter, onOpenDetail }: HealthSummaryProps) {
  const { allowedPets: pets, allowedRecords: healthRecords } = useAuthorizedHealthScope()

  const measurementsByPet = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getWeightMeasurementsForPet>>()
    for (const pet of pets) {
      map.set(pet.id, getWeightMeasurementsForPet(pet.id))
    }
    return map
  }, [pets])

  const avgWeight = useMemo(
    () => averageWeightLabel(pets, petFilter, measurementsByPet),
    [pets, petFilter, measurementsByPet],
  )

  const summaries = useMemo(
    () => buildDashboardSummaryCards(healthRecords, pets, petFilter, avgWeight),
    [healthRecords, pets, petFilter, avgWeight],
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {summaries.map(({ key, label, value, subtext, icon: Icon, color, tint, accent }) => (
        <button
          key={key}
          type="button"
          onClick={() => onOpenDetail(key)}
          className="group cursor-pointer text-left"
        >
          <Card
            variant="elevated"
            padding="none"
            hoverable
            className="h-full overflow-hidden border-[#E8E4DC]/80 transition-shadow group-hover:shadow-[0_8px_24px_-4px_rgba(25,30,27,0.08)]"
          >
            <div className={cn('h-0.5 w-full', accent)} aria-hidden />
            <div className={cn('relative bg-gradient-to-br p-4', tint)}>
              <div
                className={cn(
                  'absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-30',
                  accent,
                )}
                aria-hidden
              />
              <div className="relative flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-105',
                    color,
                  )}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]/80">
                    {label}
                  </p>
                  <p className="mt-0.5 text-base font-bold text-[#191E1B]">{value}</p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-[#5A6660]">
                    {subtext}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </button>
      ))}
    </div>
  )
}

type UpcomingHealthEventsProps = {
  petFilter: HealthPetFilter
}

export function UpcomingHealthEvents({ petFilter }: UpcomingHealthEventsProps) {
  const { setActiveModal, calendarEvents, openEditCalendarEvent } = useApp()
  const { allowedPets: pets } = useAuthorizedHealthScope()

  const upcoming = useMemo(
    () => buildUpcomingHealthEvents(calendarEvents, pets, petFilter),
    [calendarEvents, pets, petFilter],
  )

  const petImageByName = useMemo(
    () => new Map(pets.map((pet) => [pet.name, pet.image])),
    [pets],
  )

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="border-b border-[#F0EDE6] bg-gradient-to-r from-[#FBF7F0] to-white px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
              Nadcházející
            </p>
            <h3 className="mt-1 text-base font-bold text-[#191E1B]">Zdravotní události</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActiveModal('bookVet')}
            className="shrink-0 font-semibold text-[#234B54]"
          >
            <Plus size={15} />
            <span>Rezervovat</span>
          </Button>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[#7D8B82] sm:px-6">
          Žádné nadcházející zdravotní události.
        </p>
      ) : (
        <ul className="divide-y divide-[#F0EDE6]/80 px-3 py-2 sm:px-4">
          {upcoming.map((item) => {
            const accent = accentForType(item.type)
            const Icon = accent.icon
            const petImage = petImageByName.get(item.petName)

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openEditCalendarEvent(item.id)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition-all duration-200 sm:px-3',
                    accent.rowTint,
                    'hover:bg-white hover:shadow-[0_2px_12px_rgba(21,35,42,0.05)]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      {petImage ? (
                        <img
                          src={petImage}
                          alt={item.petName}
                          className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-white"
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full border',
                            accent.iconClass,
                          )}
                        >
                          <Icon size={17} strokeWidth={1.75} />
                        </div>
                      )}
                      {petImage && (
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white shadow-sm',
                            accent.iconClass,
                          )}
                        >
                          <Icon size={9} strokeWidth={2} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#191E1B]">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-[#5A6660]">
                        {item.petName} · {item.location}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="gold" size="sm">
                      {item.dueIn}
                    </Badge>
                    <p className="mt-1 text-[11px] font-medium tabular-nums text-[#234B54]">
                      {item.dateLabel}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

type HealthRecordsListProps = {
  petFilter: HealthPetFilter
  onViewFullHistory: () => void
}

export function HealthRecordsList({ petFilter, onViewFullHistory }: HealthRecordsListProps) {
  const {
    setActiveModal,
    updateHealthRecord,
    deleteHealthRecord,
    toggleMedicationReminder,
    setMedicationReminderTime,
    setMedicationReminderDays,
  } = useApp()
  const {
    allowedPets: pets,
    allowedRecords: healthRecords,
    canWritePet,
  } = useAuthorizedHealthScope()
  const anyWrite = pets.some((p) => canWritePet(p.id))
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const liveRecord = selectedRecord
    ? healthRecords.find((r) => r.id === selectedRecord.id) ?? null
    : null

  const recentRecords = useMemo(() => {
    const scoped =
      petFilter === 'all'
        ? healthRecords
        : healthRecords.filter((record) => record.petId === petFilter)
    return sortHealthRecordsNewestFirst(scoped).slice(0, 5)
  }, [healthRecords, petFilter])

  return (
    <>
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="border-b border-[#F0EDE6] bg-gradient-to-r from-[#FAF4E6]/70 to-[#FBF7F0] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
                Historie
              </p>
              <h3 className="mt-1 text-base font-bold text-[#191E1B]">
                Nedávné klinické záznamy
              </h3>
            </div>
            {anyWrite ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveModal('addHealthRecord')}
                className="shrink-0"
              >
                <Plus size={15} />
                <span>Přidat</span>
              </Button>
            ) : null}
          </div>
        </div>

        {recentRecords.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#7D8B82] sm:px-6">
            Zatím žádné zdravotní záznamy.
          </p>
        ) : (
          <ul className="divide-y divide-[#F0EDE6]/80 px-3 py-2 sm:px-4">
            {recentRecords.map((record) => {
              const petName = pets.find((p) => p.id === record.petId)?.name ?? record.petId
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(record)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-[#FAF8F5] sm:px-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" size="sm">
                          {recordTypeLabel[record.type]}
                        </Badge>
                        <Badge variant="gold" size="sm">
                          {petName}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm font-bold text-[#191E1B]">
                        {record.subtitle || record.title}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-[#234B54]">
                      {record.date}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t border-[#F0EDE6] px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={onViewFullHistory}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#234B54] hover:text-[#1a3a42] cursor-pointer"
          >
            Zobrazit celou historii
            <span aria-hidden>→</span>
          </button>
        </div>
      </Card>

      <Modal
        open={!!liveRecord}
        onClose={() => setSelectedRecord(null)}
        title={liveRecord?.title ?? ''}
        subtitle={liveRecord?.subtitle}
        maxWidth="lg"
      >
        {liveRecord && (
          <HealthRecordDetailBody
            record={liveRecord}
            onToggleReminder={toggleMedicationReminder}
            onSetReminderTime={setMedicationReminderTime}
            onSetReminderDays={setMedicationReminderDays}
            onUpdate={updateHealthRecord}
            onDelete={deleteHealthRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </Modal>
    </>
  )
}
