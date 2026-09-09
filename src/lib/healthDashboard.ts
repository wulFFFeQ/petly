import { FileText, Pill, Scale, Stethoscope, Syringe, type LucideIcon } from 'lucide-react'
import type { CalendarEvent, HealthRecord, Pet, WeightMeasurement } from '../types'
import { getEventCategory } from './calendarEventTypes'
import { APP_TODAY, daysUntil, parseEventDate } from './dashboardDates'
import { parseCzechDate } from './petProfileUtils'

export type HealthDashboardDetail =
  | 'vaccination'
  | 'medication'
  | 'vet'
  | 'weight'
  | 'records'

export type HealthPetFilter = 'all' | string

export const healthDashboardCopy: Record<
  HealthDashboardDetail,
  { title: string; subtitle: string }
> = {
  vaccination: {
    title: 'Očkování',
    subtitle: 'Kompletní historie očkování vybraných mazlíčků',
  },
  medication: {
    title: 'Léky',
    subtitle: 'Aktivní i ukončená medikace',
  },
  vet: {
    title: 'Návštěvy veterináře',
    subtitle: 'Historie návštěv a kontrol',
  },
  weight: {
    title: 'Sledování hmotnosti',
    subtitle: 'Měření, vývoj a časová osa',
  },
  records: {
    title: 'Zdravotní historie',
    subtitle: 'Kompletní přehled zdravotních záznamů',
  },
}

export function filterRecordsByPet(
  records: HealthRecord[],
  petFilter: HealthPetFilter,
): HealthRecord[] {
  if (petFilter === 'all') return records
  return records.filter((record) => record.petId === petFilter)
}

export function sortHealthRecordsNewestFirst(records: HealthRecord[]): HealthRecord[] {
  return [...records].sort((a, b) => {
    const aTs = parseCzechDate(a.date)
    const bTs = parseCzechDate(b.date)
    if (aTs !== bTs) return bTs - aTs
    return b.id.localeCompare(a.id)
  })
}

export function recordsForCategory(
  records: HealthRecord[],
  detail: Exclude<HealthDashboardDetail, 'weight' | 'records'>,
): HealthRecord[] {
  return sortHealthRecordsNewestFirst(records.filter((record) => record.type === detail))
}

export type HealthSummaryCardDef = {
  key: HealthDashboardDetail
  label: string
  value: string
  subtext: string
  icon: LucideIcon
  color: string
  tint: string
  accent: string
}

export function buildDashboardSummaryCards(
  records: HealthRecord[],
  pets: Pet[],
  petFilter: HealthPetFilter,
  avgWeightLabel: { value: string; subtext: string },
): HealthSummaryCardDef[] {
  const scoped = filterRecordsByPet(records, petFilter)
  const vaccinations = scoped.filter((r) => r.type === 'vaccination')
  const medications = scoped.filter((r) => r.type === 'medication')
  const activeMeds = medications.filter((r) => r.status === 'active')
  const vetVisits = scoped.filter((r) => r.type === 'vet')

  const nextVaccination = vaccinations
    .map((r) => r.nextDueDate)
    .filter(Boolean)
    .map((date) => ({ date: date!, ts: parseCzechDate(date!) }))
    .filter((item) => item.ts >= APP_TODAY.getTime())
    .sort((a, b) => a.ts - b.ts)[0]

  const doctors = [
    ...new Set(vetVisits.map((r) => r.doctor).filter(Boolean) as string[]),
  ]

  return [
    {
      key: 'vaccination',
      label: 'Očkování',
      value:
        vaccinations.length === 0
          ? 'Žádné'
          : `${vaccinations.length} ${vaccinations.length === 1 ? 'záznam' : 'záznamy'}`,
      subtext: nextVaccination
        ? `Další: ${nextVaccination.date}`
        : vaccinations.length > 0
          ? 'Bez naplánovaného termínu'
          : 'Zatím bez záznamů',
      icon: Syringe,
      color: 'text-[#234B54] bg-[#E0EAEC] border-[#C5D5D9]/70',
      tint: 'from-[#EEF4F5]/90 to-white',
      accent: 'bg-[#234B54]',
    },
    {
      key: 'medication',
      label: 'Léky',
      value:
        activeMeds.length > 0
          ? `${activeMeds.length} aktivní`
          : medications.length === 0
            ? 'Žádné'
            : `${medications.length}`,
      subtext:
        activeMeds.length > 0
          ? activeMeds[0].subtitle
          : medications.length > 0
            ? 'Bez aktivních receptů'
            : 'Zatím bez záznamů',
      icon: Pill,
      color: 'text-amber-900 bg-amber-100 border-amber-200/60',
      tint: 'from-amber-50/70 to-white',
      accent: 'bg-[#B8934A]',
    },
    {
      key: 'vet',
      label: 'Návštěvy veterináře',
      value:
        vetVisits.length === 0
          ? 'Žádné'
          : `${vetVisits.length} ${vetVisits.length === 1 ? 'zaznamenaná' : 'zaznamenané'}`,
      subtext:
        doctors.length > 0
          ? doctors.slice(0, 2).join(' a ')
          : vetVisits[0]?.subtitle ?? 'Zatím bez návštěv',
      icon: Stethoscope,
      color: 'text-sky-800 bg-sky-100 border-sky-200/60',
      tint: 'from-sky-50/70 to-white',
      accent: 'bg-sky-600',
    },
    {
      key: 'weight',
      label: 'Prům. hmotnost',
      value: avgWeightLabel.value,
      subtext: avgWeightLabel.subtext,
      icon: Scale,
      color: 'text-[#234B54] bg-[#FAF4E6] border-[#E8D8B5]/70',
      tint: 'from-[#FAF4E6]/80 to-white',
      accent: 'bg-[#B8934A]',
    },
    {
      key: 'records',
      label: 'Zdravotní záznamy',
      value:
        scoped.length === 0
          ? 'Žádné'
          : `${scoped.length} ${scoped.length === 1 ? 'záznam' : 'záznamů'}`,
      subtext:
        petFilter === 'all'
          ? `${pets.length} mazlíčci v přehledu`
          : pets.find((p) => p.id === petFilter)?.name ?? 'Vybraný mazlíček',
      icon: FileText,
      color: 'text-purple-800 bg-purple-100 border-purple-200/60',
      tint: 'from-purple-50/60 to-white',
      accent: 'bg-purple-500',
    },
  ]
}

export type WeightTrend = {
  label: string
  arrow: 'up' | 'down' | 'stable' | 'none'
}

function formatSignedKg(delta: number): string {
  const rounded = Math.round(delta * 10) / 10
  const abs = String(Math.abs(rounded)).replace('.', ',')
  if (rounded > 0) return `+${abs} kg`
  if (rounded < 0) return `−${abs} kg`
  return `0 kg`
}

function formatPeriodBetween(fromTs: number, toTs: number): string {
  if (!fromTs || !toTs || toTs <= fromTs) return ''
  const from = new Date(fromTs)
  const to = new Date(toTs)
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (months >= 1) {
    if (months === 1) return 'za 1 měsíc'
    if (months >= 2 && months <= 4) return `za ${months} měsíce`
    return `za ${months} měsíců`
  }
  const days = Math.max(1, Math.round((toTs - fromTs) / (1000 * 60 * 60 * 24)))
  if (days === 1) return 'za 1 den'
  if (days >= 2 && days <= 4) return `za ${days} dny`
  return `za ${days} dní`
}

function formatPeriodShort(fromTs: number, toTs: number): string {
  if (!fromTs || !toTs || toTs <= fromTs) return ''
  const from = new Date(fromTs)
  const to = new Date(toTs)
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  if (months >= 1) {
    if (months === 1) return '1 měsíc'
    if (months >= 2 && months <= 4) return `${months} měsíce`
    return `${months} měsíců`
  }
  const days = Math.max(1, Math.round((toTs - fromTs) / (1000 * 60 * 60 * 24)))
  if (days === 1) return '1 den'
  if (days >= 2 && days <= 4) return `${days} dny`
  return `${days} dní`
}

/** Neutral statistical change only — no veterinary diagnosis. */
export function computeWeightTrend(measurements: WeightMeasurement[]): WeightTrend {
  const sorted = [...measurements].sort(
    (a, b) => parseCzechDate(a.date) - parseCzechDate(b.date),
  )
  if (sorted.length < 2) {
    return { label: 'Málo měření', arrow: 'none' }
  }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const delta = last.weight - first.weight
  const fromTs = parseCzechDate(first.date)
  const toTs = parseCzechDate(last.date)
  const period = formatPeriodBetween(fromTs, toTs)
  const periodShort = formatPeriodShort(fromTs, toTs)

  if (Math.abs(delta) < 0.3) {
    return {
      label: periodShort ? `→ Stabilní · ${periodShort}` : '→ Stabilní',
      arrow: 'stable',
    }
  }

  if (delta > 0) {
    return {
      label: period
        ? `↗ ${formatSignedKg(delta)} ${period}`
        : `↗ ${formatSignedKg(delta)}`,
      arrow: 'up',
    }
  }

  return {
    label: period
      ? `↘ ${formatSignedKg(delta)} ${period}`
      : `↘ ${formatSignedKg(delta)}`,
    arrow: 'down',
  }
}

export function formatWeightKg(weight: number): string {
  return `${String(weight).replace('.', ',')} kg`
}

export function formatDueInLabel(daysAway: number): string {
  if (daysAway < 0) return 'Proběhlo'
  if (daysAway === 0) return 'Dnes'
  if (daysAway === 1) return 'Zítra'
  return `Za ${daysAway} dní`
}

export function formatEventDateLabel(dateStr: string, time?: string): string {
  const date = parseEventDate(dateStr)
  const tomorrow = new Date(APP_TODAY)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const sameDay =
    date.getFullYear() === APP_TODAY.getFullYear() &&
    date.getMonth() === APP_TODAY.getMonth() &&
    date.getDate() === APP_TODAY.getDate()
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()

  if (sameDay) return time ? `Dnes · ${time}` : 'Dnes'
  if (isTomorrow) return time ? `Zítra · ${time}` : 'Zítra'

  const months = [
    'led',
    'úno',
    'bře',
    'dub',
    'kvě',
    'čvn',
    'čvc',
    'srp',
    'zář',
    'říj',
    'lis',
    'pro',
  ]
  const base = `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`
  return time ? `${base} · ${time}` : base
}

export type UpcomingHealthItem = {
  id: string
  petName: string
  title: string
  location: string
  dateLabel: string
  dueIn: string
  type: CalendarEvent['type']
  event: CalendarEvent
}

export function buildUpcomingHealthEvents(
  calendarEvents: CalendarEvent[],
  pets: Pet[],
  petFilter: HealthPetFilter,
  limit = 6,
): UpcomingHealthItem[] {
  const petNames =
    petFilter === 'all'
      ? new Set(pets.map((p) => p.name))
      : new Set(pets.filter((p) => p.id === petFilter).map((p) => p.name))

  return calendarEvents
    .filter((event) => {
      if (!petNames.has(event.petName)) return false
      if (getEventCategory(event.type) !== 'health') return false
      const date = parseEventDate(event.date)
      return date >= APP_TODAY
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
    .slice(0, limit)
    .map((event) => {
      const daysAway = daysUntil(APP_TODAY, parseEventDate(event.date))
      return {
        id: event.id,
        petName: event.petName,
        title: event.title,
        location: event.location ?? 'Místo neuvedeno',
        dateLabel: formatEventDateLabel(event.date, event.time),
        dueIn: formatDueInLabel(daysAway),
        type: event.type,
        event,
      }
    })
}

function trackedPetsLabel(count: number): string {
  if (count === 1) return '1 mazlíček sledován'
  if (count >= 2 && count <= 4) return `${count} mazlíčci sledováni`
  return `${count} mazlíčků sledováno`
}

export function averageWeightLabel(
  pets: Pet[],
  petFilter: HealthPetFilter,
  measurementsByPet: Map<string, WeightMeasurement[]>,
): { value: string; subtext: string } {
  const scopedPets =
    petFilter === 'all' ? pets : pets.filter((pet) => pet.id === petFilter)

  const petsWithWeight = scopedPets.filter((pet) => {
    const list = measurementsByPet.get(pet.id) ?? []
    return list.length > 0 || typeof pet.weight === 'number'
  })

  if (petFilter === 'all') {
    if (petsWithWeight.length === 0) {
      return { value: '—', subtext: 'Zatím bez měření' }
    }
    return {
      value: trackedPetsLabel(petsWithWeight.length),
      subtext: 'Hmotnost dle měření',
    }
  }

  const pet = scopedPets[0]
  if (!pet) return { value: '—', subtext: 'Zatím bez měření' }

  const list = measurementsByPet.get(pet.id) ?? []
  if (list.length > 0) {
    const latest = [...list].sort(
      (a, b) => parseCzechDate(b.date) - parseCzechDate(a.date),
    )[0]
    return {
      value: formatWeightKg(latest.weight),
      subtext: `Poslední měření ${latest.date}`,
    }
  }

  if (typeof pet.weight === 'number') {
    return {
      value: formatWeightKg(pet.weight),
      subtext: 'Aktuální hmotnost',
    }
  }

  return { value: '—', subtext: 'Zatím bez měření' }
}
