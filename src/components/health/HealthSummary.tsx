import {
  FileText,
  Heart,
  Pill,
  Plus,
  Scale,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { HealthRecord } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'
import { HealthRecordDetailBody } from './HealthRecordDetailBody'

const summaries = [
  {
    label: 'Očkování',
    value: '3 aktivní',
    subtext: 'Další za 12 dní',
    icon: Syringe,
    color: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
    tint: 'from-[#EEF4F5]/90 to-white',
    accent: 'bg-[#234B54]',
  },
  {
    label: 'Léky',
    value: '2 recepty',
    subtext: 'Denní režim aktivní',
    icon: Pill,
    color: 'text-amber-900 bg-amber-100 border-amber-200/60',
    tint: 'from-amber-50/70 to-white',
    accent: 'bg-[#B8934A]',
  },
  {
    label: 'Návštěvy veterináře',
    value: '4 zaznamenané',
    subtext: 'MUDr. Novák a MUDr. Králová',
    icon: Stethoscope,
    color: 'text-sky-800 bg-sky-100 border-sky-200/60',
    tint: 'from-sky-50/70 to-white',
    accent: 'bg-sky-600',
  },
  {
    label: 'Prům. hmotnost',
    value: 'Optimální',
    subtext: '100 % shoda s cílem',
    icon: Scale,
    color: 'text-[#234B54] bg-[#FAF4E6] border-[#E8D8B5]/70',
    tint: 'from-[#FAF4E6]/80 to-white',
    accent: 'bg-[#B8934A]',
  },
  {
    label: 'Zdravotní záznamy',
    value: '12 ověřených',
    subtext: 'Oficiální pasy synchronizovány',
    icon: FileText,
    color: 'text-purple-800 bg-purple-100 border-purple-200/60',
    tint: 'from-purple-50/60 to-white',
    accent: 'bg-purple-500',
  },
]

const upcomingAccent = [
  {
    icon: Syringe,
    iconClass: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
    rowTint: 'bg-[#EEF4F5]/50',
  },
  {
    icon: Stethoscope,
    iconClass: 'text-sky-800 bg-sky-100 border-sky-200/60',
    rowTint: 'bg-sky-50/40',
  },
  {
    icon: Pill,
    iconClass: 'text-amber-900 bg-amber-100 border-amber-200/60',
    rowTint: 'bg-amber-50/40',
  },
  {
    icon: Heart,
    iconClass: 'text-purple-800 bg-purple-100 border-purple-200/60',
    rowTint: 'bg-purple-50/30',
  },
] as const

export function HealthSummary() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {summaries.map(({ label, value, subtext, icon: Icon, color, tint, accent }) => (
        <Card
          key={label}
          variant="elevated"
          padding="none"
          hoverable
          className="group overflow-hidden border-[#E8E4DC]/80"
        >
          <div className={cn('h-0.5 w-full', accent)} aria-hidden />
          <div className={cn('relative p-4 bg-gradient-to-br', tint)}>
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
      ))}
    </div>
  )
}

export function UpcomingHealthEvents() {
  const { setActiveModal, pets } = useApp()

  const upcoming = [
    {
      pet: 'Luna',
      event: 'Posilovací očkování proti vzteklině',
      date: '24. zář 2026',
      dueIn: 'Za 12 dní',
      clinic: 'PetCare Central Praha',
    },
    {
      pet: 'Milo',
      event: 'Rutinní prohlídka a dentální péče',
      date: 'Zítra · 14:30',
      dueIn: 'Zítra',
      clinic: 'Feline Care Studio Praha',
    },
    {
      pet: 'Bella',
      event: 'Dávka glukosaminu na klouby',
      date: 'Dnes · 20:00',
      dueIn: 'Dnes večer',
      clinic: 'Domácí podání',
    },
    {
      pet: 'Luna',
      event: 'Stříhání a odstraňování podsady',
      date: '5. zář 2026',
      dueIn: 'Za 4 dny',
      clinic: 'Maison Dog Spa Kolín',
    },
  ]

  const petImageByName = new Map(pets.map((pet) => [pet.name, pet.image]))

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="border-b border-[#F0EDE6] bg-gradient-to-r from-[#FBF7F0] to-white px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#234B54]">
              Nadcházející
            </p>
            <h3 className="mt-1 text-base font-bold text-[#191E1B]">
              Zdravotní události
            </h3>
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

      <ul className="divide-y divide-[#F0EDE6]/80 px-3 py-2 sm:px-4">
        {upcoming.map((item, i) => {
          const accent = upcomingAccent[i % upcomingAccent.length]
          const Icon = accent.icon
          const petImage = petImageByName.get(item.pet)

          return (
            <li
              key={i}
              className={cn(
                'flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-all duration-200 sm:px-3',
                accent.rowTint,
                'hover:bg-white hover:shadow-[0_2px_12px_rgba(21,35,42,0.05)]',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  {petImage ? (
                    <img
                      src={petImage}
                      alt={item.pet}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
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
                  <p className="truncate text-sm font-bold text-[#191E1B]">{item.event}</p>
                  <p className="mt-0.5 truncate text-xs font-medium text-[#5A6660]">
                    {item.pet} · {item.clinic}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Badge variant="gold" size="sm">
                  {item.dueIn}
                </Badge>
                <p className="mt-1 text-[11px] font-medium tabular-nums text-[#234B54]">
                  {item.date}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function HealthRecordsList() {
  const {
    setActiveModal,
    healthRecords,
    pets,
    updateHealthRecord,
    deleteHealthRecord,
    toggleMedicationReminder,
    setMedicationReminderTime,
    setMedicationReminderDays,
  } = useApp()
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const liveRecord = selectedRecord
    ? healthRecords.find((r) => r.id === selectedRecord.id) ?? null
    : null

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveModal('addHealthRecord')}
              className="shrink-0"
            >
              <Plus size={15} />
              <span>Přidat</span>
            </Button>
          </div>
        </div>

        <ul className="divide-y divide-[#F0EDE6]/80 px-3 py-2 sm:px-4">
          {healthRecords.slice(0, 5).map((record) => {
            const petName = pets.find((p) => p.id === record.petId)?.name ?? record.petId
            return (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(record)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-[#FAF8F5] cursor-pointer sm:px-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#191E1B]">{record.title}</p>
                      <Badge variant="outline" size="sm">
                        {petName}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-[#5A6660]">
                      {record.subtitle}
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
