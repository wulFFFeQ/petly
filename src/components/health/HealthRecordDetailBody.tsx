import { Bell, BellOff, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  formatMedicationRemainingLabel,
  formatReminderDaysLabel,
  MAX_REMINDER_DAYS,
  normalizeReminderDays,
  REMINDER_DURATION_PRESETS,
} from '../../lib/medicationReminders'
import {
  formatCzechDateToIso,
  formatIsoDateToCzech,
} from '../../lib/petProfileUtils'
import { cn } from '../../lib/utils'
import type { HealthRecord } from '../../types'
import { Button } from '../ui/Button'

type EditFormState = {
  subtitle: string
  date: string
  doctor: string
  clinic: string
  notes: string
  dosage: string
  vaccineName: string
  nextDueDate: string
}

function toEditForm(record: HealthRecord): EditFormState {
  return {
    subtitle: record.subtitle || '',
    date: formatCzechDateToIso(record.date),
    doctor: record.doctor || '',
    clinic: record.clinic || '',
    notes: record.notes || '',
    dosage: record.dosage || '',
    vaccineName: record.vaccineName || record.subtitle || '',
    nextDueDate: record.nextDueDate
      ? formatCzechDateToIso(record.nextDueDate)
      : '',
  }
}

export function HealthRecordDetailBody({
  record,
  onToggleReminder,
  onSetReminderTime,
  onSetReminderDays,
  onUpdate,
  onDelete,
  onGoTimeline,
  onClose,
}: {
  record: HealthRecord
  onToggleReminder: (id: string) => void
  onSetReminderTime: (id: string, time: string) => void
  onSetReminderDays: (id: string, days: number) => void
  onUpdate: (id: string, updates: Partial<HealthRecord>) => void
  onDelete: (id: string) => void
  onGoTimeline?: () => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditFormState>(() => toEditForm(record))
  const [daysDraft, setDaysDraft] = useState(() =>
    String(normalizeReminderDays(record.reminderDays)),
  )

  const reminderTime =
    record.scheduleTime && /^\d{1,2}:\d{2}$/.test(record.scheduleTime)
      ? record.scheduleTime
      : '09:00'
  const reminderDays = normalizeReminderDays(record.reminderDays)

  useEffect(() => {
    setDaysDraft(String(normalizeReminderDays(record.reminderDays)))
  }, [record.id, record.reminderDays])

  const commitReminderDays = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) {
      setDaysDraft(String(reminderDays))
      return
    }
    const next = normalizeReminderDays(parsed)
    setDaysDraft(String(next))
    if (next !== reminderDays) {
      onSetReminderDays(record.id, next)
    }
  }

  const startEdit = () => {
    setForm(toEditForm(record))
    setEditing(true)
  }

  const handleSave = () => {
    if (!form.subtitle.trim() || !form.date) return

    const updates: Partial<HealthRecord> = {
      subtitle: form.subtitle.trim(),
      date: formatIsoDateToCzech(form.date),
      doctor: form.doctor.trim() || undefined,
      clinic: form.clinic.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (record.type === 'vaccination') {
      updates.vaccineName = form.vaccineName.trim() || form.subtitle.trim()
      updates.nextDueDate = form.nextDueDate
        ? formatIsoDateToCzech(form.nextDueDate)
        : undefined
    }

    if (record.type === 'medication') {
      updates.dosage = form.dosage.trim() || undefined
    }

    onUpdate(record.id, updates)
    setEditing(false)
  }

  const handleDelete = () => {
    const label = record.subtitle || record.title
    if (!window.confirm(`Opravdu smazat záznam „${label}"?`)) return
    onDelete(record.id)
    onClose()
  }

  const fieldClass =
    'h-10 w-full rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm font-semibold text-[#191E1B] outline-none transition-all focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10'

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Název / popis
            </span>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              className={fieldClass}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Datum
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className={fieldClass}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Veterinář
              </span>
              <input
                type="text"
                value={form.doctor}
                onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))}
                className={fieldClass}
                placeholder="např. MUDr. Martin Novák"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Klinika
            </span>
            <input
              type="text"
              value={form.clinic}
              onChange={(e) => setForm((p) => ({ ...p, clinic: e.target.value }))}
              className={fieldClass}
              placeholder="Volitelné"
            />
          </label>

          {record.type === 'vaccination' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Vakcína
                </span>
                <input
                  type="text"
                  value={form.vaccineName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, vaccineName: e.target.value }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Další termín
                </span>
                <input
                  type="date"
                  value={form.nextDueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nextDueDate: e.target.value }))
                  }
                  className={fieldClass}
                />
              </label>
            </div>
          )}

          {record.type === 'medication' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Dávkování
              </span>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
                className={fieldClass}
                placeholder="Dle předpisu"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Poznámky
            </span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-2.5 text-sm text-[#191E1B] outline-none transition-all focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10 resize-none"
              placeholder="Volitelné"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F0EDE6]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            className="mr-auto"
          >
            Zrušit
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!form.subtitle.trim() || !form.date}
          >
            Uložit změny
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Datum</p>
          <p className="text-sm font-bold text-[#191E1B] mt-0.5">{record.date}</p>
        </div>
        {record.doctor && (
          <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Veterinář</p>
            <p className="text-sm font-bold text-[#191E1B] mt-0.5">{record.doctor}</p>
          </div>
        )}
        {record.clinic && (
          <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3 sm:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Klinika</p>
            <p className="text-sm font-bold text-[#191E1B] mt-0.5">{record.clinic}</p>
          </div>
        )}
      </div>

      {record.type === 'vaccination' && (
        <div className="rounded-xl border border-[#E8D8B5] bg-[#FCFBF8] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">Detail očkování</p>
          <p className="text-sm font-bold text-[#191E1B]">
            Vakcína: {record.vaccineName || record.subtitle}
          </p>
          {record.nextDueDate && (
            <p className="text-sm text-[#B8934A] font-semibold">
              Další termín: {record.nextDueDate}
            </p>
          )}
        </div>
      )}

      {record.type === 'medication' && (
        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">Dávkování</p>
          <p className="text-sm font-bold text-[#191E1B]">{record.dosage || 'Dle předpisu'}</p>

          <div className="rounded-xl border border-[#E8E4DC] bg-white p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
              Připomínka
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#4A564F]">Čas upozornění</span>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => onSetReminderTime(record.id, e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm font-semibold text-[#191E1B] outline-none transition-all focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#4A564F]">Počet dní</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={daysDraft}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, '').slice(0, 2)
                    setDaysDraft(next)
                    if (next === '') return
                    const parsed = Number.parseInt(next, 10)
                    if (
                      Number.isFinite(parsed) &&
                      parsed >= 1 &&
                      parsed <= MAX_REMINDER_DAYS
                    ) {
                      onSetReminderDays(record.id, parsed)
                    }
                  }}
                  onBlur={() => commitReminderDays(daysDraft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  placeholder="např. 7"
                  className="h-10 w-full rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm font-semibold text-[#191E1B] outline-none transition-all focus:border-[#2C4A3E] focus:ring-4 focus:ring-[#2C4A3E]/10"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {REMINDER_DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setDaysDraft(String(preset.value))
                    onSetReminderDays(record.id, preset.value)
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                    reminderDays === preset.value
                      ? 'bg-[#234B54] text-white'
                      : 'bg-[#FAF8F5] text-[#4A564F] border border-[#E8E4DC] hover:bg-white',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onToggleReminder(record.id)}
              className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-colors cursor-pointer sm:w-auto',
                record.reminderEnabled
                  ? 'border-[#D1E0D8] bg-[#EBF2EE] text-[#2C4A3E] shadow-[inset_0_0_0_1px_rgba(44,74,62,0.06)] hover:bg-[#E0EAEC]'
                  : 'border-[#E8D8B5] bg-[#FAF4E6] text-[#8A6B2E] hover:bg-[#F5EDD8]',
              )}
            >
              {record.reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              {record.reminderEnabled ? 'Připomínka aktivní' : 'Připomínka neaktivní — zapnout'}
            </button>
            <p className="text-[11px] text-[#7D8B82] leading-relaxed">
              {record.status === 'active'
                ? `${formatMedicationRemainingLabel(record)}. `
                : ''}
              {record.reminderEnabled
                ? `Připomínka denně ve ${reminderTime} po dobu ${formatReminderDaysLabel(reminderDays)} — ve zvonku i v kalendáři.`
                : 'Nastavte čas a délku léčby, pak zapněte připomínku. Délka léčby platí i bez připomínky.'}
            </p>
          </div>
        </div>
      )}

      {record.notes && (
        <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">Poznámky</p>
          <p className="text-sm text-[#4A564F] mt-0.5 leading-relaxed">{record.notes}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
          <Pencil size={14} />
          Upravit
        </Button>
        <Button variant="danger" size="sm" onClick={handleDelete} className="gap-1.5">
          <Trash2 size={14} />
          Smazat
        </Button>
        {onGoTimeline && (
          <Button variant="outline" size="sm" onClick={onGoTimeline}>
            Zobrazit v časové ose
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onClose} className="sm:ml-auto">
          Zavřít
        </Button>
      </div>
    </div>
  )
}
