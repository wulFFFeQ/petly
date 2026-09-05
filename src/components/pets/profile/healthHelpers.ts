import {
  ClipboardList,
  FlaskConical,
  Heart,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { APP_TODAY } from '../../../lib/dashboardDates'
import { formatMedicationRemainingLabel } from '../../../lib/medicationReminders'
import { parseCzechDate } from '../../../lib/petProfileUtils'
import type { HealthRecord, HealthRecordType } from '../../../types'

export type HealthCategoryKey = 'vaccination' | 'medication' | 'vet' | 'examination'

export const healthCategoryCopy: Record<
  HealthCategoryKey,
  { title: string; subtitle: string }
> = {
  vaccination: {
    title: 'Očkování',
    subtitle: 'Kompletní historie očkování, termíny, stav a veterinář',
  },
  medication: {
    title: 'Léky',
    subtitle: 'Aktivní léčba a kompletní historie léků',
  },
  vet: {
    title: 'Návštěvy veterináře',
    subtitle: 'Historie návštěv, diagnózy a doporučení',
  },
  examination: {
    title: 'Vyšetření',
    subtitle: 'Výsledky a historie vyšetření',
  },
}

export function recordTypeMeta(type: HealthRecordType) {
  if (type === 'vaccination') {
    return {
      icon: Syringe,
      className: 'bg-[#E0EAEC] text-[#234B54]',
    }
  }
  if (type === 'medication') {
    return {
      icon: Heart,
      className: 'bg-amber-50 text-amber-700',
    }
  }
  if (type === 'examination') {
    return {
      icon: FlaskConical,
      className: 'bg-emerald-50 text-emerald-700',
    }
  }
  if (type === 'assessment') {
    return {
      icon: ClipboardList,
      className: 'bg-[#EBF2EE] text-[#2C4A3E]',
    }
  }
  return {
    icon: Stethoscope,
    className: 'bg-sky-50 text-sky-700',
  }
}

export function buildHealthActionItems(
  activeMedications: HealthRecord[],
  vaccinations: HealthRecord[],
  vetVisits: HealthRecord[],
  examinations: HealthRecord[],
) {
  const items: Array<{
    id: string
    record: HealthRecord
    kind: 'medication' | 'vaccination' | 'vet' | 'examination'
    label: string
    detail: string
    meta: string
  }> = []

  for (const record of activeMedications) {
    items.push({
      id: `med-${record.id}`,
      record,
      kind: 'medication',
      label: record.subtitle || record.title,
      detail: [record.dosage || 'dle předpisu', record.scheduleTime]
        .filter(Boolean)
        .join(' · '),
      meta: formatMedicationRemainingLabel(record),
    })
  }

  const seen = new Set(items.map((item) => item.record.id))

  for (const record of vaccinations) {
    if (seen.has(record.id)) continue
    const due = record.nextDueDate
    const dueTs = due ? parseCzechDate(due) : 0
    const daysToDue = dueTs
      ? Math.round((dueTs - APP_TODAY.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const upcomingDue = daysToDue != null && daysToDue >= 0 && daysToDue <= 45
    if (record.status === 'scheduled' || upcomingDue) {
      seen.add(record.id)
      items.push({
        id: `vax-${record.id}`,
        record,
        kind: 'vaccination',
        label: record.subtitle || record.title,
        detail: due ? `Termín: ${due}` : 'Naplánované očkování',
        meta:
          daysToDue == null
            ? 'Ke kontrole'
            : daysToDue === 0
              ? 'Dnes'
              : daysToDue === 1
                ? 'Zítra'
                : `Za ${daysToDue} dní`,
      })
    }
  }

  for (const record of [...vetVisits, ...examinations]) {
    if (seen.has(record.id)) continue
    if (record.status !== 'scheduled') continue
    seen.add(record.id)
    items.push({
      id: `sched-${record.id}`,
      record,
      kind: record.type === 'examination' ? 'examination' : 'vet',
      label: record.subtitle || record.title,
      detail: record.doctor || record.clinic || 'Naplánovaná kontrola',
      meta: record.date,
    })
  }

  return items
}

export function buildHealthSummaryCards(
  vaccinations: HealthRecord[],
  medications: HealthRecord[],
  activeMedications: HealthRecord[],
  vetVisits: HealthRecord[],
  examinations: HealthRecord[],
  nextVaccinationDue: string | undefined,
  latestVetVisit: HealthRecord | undefined,
  latestExamination: HealthRecord | undefined,
) {
  return [
    {
      key: 'vaccination' as const,
      label: 'Očkování',
      value: vaccinations.length === 0 ? 'Žádné' : `${vaccinations.length}`,
      subtext: nextVaccinationDue
        ? `Další: ${nextVaccinationDue}`
        : vaccinations.length > 0
          ? 'Bez naplánovaného termínu'
          : 'Zatím bez záznamů',
      icon: Syringe,
      color: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
      accent: 'bg-[#234B54]',
    },
    {
      key: 'medication' as const,
      label: 'Léky',
      value:
        activeMedications.length > 0
          ? `${activeMedications.length} aktivní`
          : medications.length === 0
            ? 'Žádné'
            : `${medications.length}`,
      subtext:
        activeMedications.length > 0
          ? activeMedications[0].subtitle
          : medications.length > 0
            ? 'Bez aktivních receptů'
            : 'Zatím bez záznamů',
      icon: Heart,
      color: 'text-amber-900 bg-amber-100 border-amber-200/60',
      accent: 'bg-[#B8934A]',
    },
    {
      key: 'vet' as const,
      label: 'Návštěvy veterináře',
      value: vetVisits.length === 0 ? 'Žádné' : `${vetVisits.length}`,
      subtext: latestVetVisit?.subtitle ?? 'Zatím bez návštěv',
      icon: Stethoscope,
      color: 'text-sky-800 bg-sky-100 border-sky-200/60',
      accent: 'bg-sky-600',
    },
    {
      key: 'examination' as const,
      label: 'Vyšetření',
      value: examinations.length === 0 ? 'Žádné' : `${examinations.length}`,
      subtext: latestExamination?.subtitle ?? 'Zatím bez výsledků',
      icon: FlaskConical,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200/60',
      accent: 'bg-emerald-600',
    },
  ]
}
