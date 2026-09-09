import { Bell, BellOff, ChevronLeft, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { formatMedicationRemainingLabel } from '../../lib/medicationReminders'
import {
  filterRecordsByPet,
  healthDashboardCopy,
  recordsForCategory,
  sortHealthRecordsNewestFirst,
  type HealthDashboardDetail,
  type HealthPetFilter,
} from '../../lib/healthDashboard'
import { cn } from '../../lib/utils'
import { recordTypeMeta } from '../pets/profile/healthHelpers'
import type { HealthRecord } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { HealthRecordDetailBody } from './HealthRecordDetailBody'
import { WeightChart } from './WeightChart'

type HealthCategoryPanelProps = {
  detail: HealthDashboardDetail
  petFilter: HealthPetFilter
  onBack: () => void
  onPetFilterChange?: (filter: HealthPetFilter) => void
}

export function HealthCategoryPanel({
  detail,
  petFilter,
  onBack,
  onPetFilterChange,
}: HealthCategoryPanelProps) {
  const {
    pets,
    healthRecords,
    openNewHealthRecord,
    toggleMedicationReminder,
    updateHealthRecord,
    deleteHealthRecord,
    setMedicationReminderTime,
    setMedicationReminderDays,
  } = useApp()
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)

  const scopedRecords = useMemo(
    () => filterRecordsByPet(healthRecords, petFilter),
    [healthRecords, petFilter],
  )

  const listRecords = useMemo(() => {
    if (detail === 'weight') return []
    if (detail === 'records') return sortHealthRecordsNewestFirst(scopedRecords)
    return recordsForCategory(scopedRecords, detail)
  }, [detail, scopedRecords])

  const activeMedications = useMemo(
    () => listRecords.filter((r) => r.type === 'medication' && r.status === 'active'),
    [listRecords],
  )

  const copy = healthDashboardCopy[detail]
  const liveRecord = selectedRecord
    ? healthRecords.find((r) => r.id === selectedRecord.id) ?? null
    : null

  const addType =
    detail === 'vaccination' || detail === 'medication' || detail === 'vet'
      ? detail
      : 'vet'

  return (
    <>
      <Card variant="elevated">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
            >
              <ChevronLeft size={14} />
              Zpět k přehledu
            </button>
            <h3 className="text-lg font-bold text-[#191E1B]">{copy.title}</h3>
            <p className="mt-0.5 text-xs text-[#7D8B82]">{copy.subtitle}</p>
            {detail !== 'weight' && (
              <p className="mt-1 text-[11px] font-medium text-[#7D8B82]">
                {listRecords.length}{' '}
                {listRecords.length === 1 ? 'záznam' : 'záznamů'} · chronologicky
              </p>
            )}
          </div>
          {detail !== 'weight' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                openNewHealthRecord({
                  petId: petFilter === 'all' ? undefined : petFilter,
                  type: addType,
                })
              }
              className="shrink-0"
            >
              <Plus size={15} />
              <span>Přidat záznam</span>
            </Button>
          )}
        </div>

        {detail === 'weight' ? (
          <WeightChart
            variant="detail"
            lockedPetId={petFilter === 'all' ? undefined : petFilter}
            onPetChange={(petId) => onPetFilterChange?.(petId)}
          />
        ) : (
          <>
            {detail === 'medication' && activeMedications.length > 0 && (
              <div className="mb-5 rounded-2xl border border-[#E8D8B5] bg-[#FAF4E6]/50 p-3.5">
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#8A6B2E]">
                  Aktivní léčba
                </p>
                <ul className="space-y-2">
                  {activeMedications.map((record) => (
                    <li
                      key={record.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8E4DC] bg-white/90 px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        className="min-w-0 flex-1 cursor-pointer text-left"
                      >
                        <p className="truncate text-sm font-bold text-[#191E1B]">
                          {record.subtitle || record.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#5A6660]">
                          {[
                            pets.find((p) => p.id === record.petId)?.name,
                            record.dosage || 'dle předpisu',
                            record.scheduleTime,
                          ]
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
                {listRecords.length === 0 ? (
                  <li className="py-8 text-center text-sm text-[#7D8B82]">
                    V této kategorii zatím nejsou žádné záznamy.
                  </li>
                ) : (
                  listRecords.map((record) => {
                    const meta = recordTypeMeta(record.type)
                    const Icon = meta.icon
                    const petName =
                      pets.find((p) => p.id === record.petId)?.name ?? record.petId
                    return (
                      <li key={record.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="flex w-full cursor-pointer flex-col gap-3 rounded-xl py-4 text-left transition-colors hover:bg-[#FAF8F5] sm:flex-row sm:items-center sm:justify-between -mx-1 px-1 sm:mx-0 sm:px-0"
                        >
                          <div className="flex min-w-0 items-start gap-3.5">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                meta.className,
                              )}
                            >
                              <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-[#191E1B]">
                                  {record.title}
                                </p>
                                <Badge variant="outline" size="sm">
                                  {petName}
                                </Badge>
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
                              <p className="mt-0.5 truncate text-xs font-medium text-[#4A564F]">
                                {record.subtitle}
                              </p>
                              {(record.doctor || record.nextDueDate || record.clinic) && (
                                <p className="mt-0.5 text-[11px] text-[#7D8B82]">
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
                            className="shrink-0 self-end font-mono sm:self-center"
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
          </>
        )}
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
