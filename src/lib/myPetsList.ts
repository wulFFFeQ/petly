import type { CalendarEvent, HealthRecord, HealthStatus, Pet } from '../types'
import type { LostPetAnnouncement, LostPetReport } from '../types/lostPet'
import { getEventCategory, getEventTypeLabel } from './calendarEventTypes'
import {
  APP_TODAY,
  daysUntil,
  parseCzechDate,
  parseEventDate,
} from './dashboardDates'
import { findActiveAnnouncementForPet } from './lostPet'

export type PetListSort =
  | 'recent'
  | 'name'
  | 'age'
  | 'health'
  | 'next_event'

export const PET_LIST_SORT_OPTIONS: { value: PetListSort; label: string }[] = [
  { value: 'recent', label: 'Naposledy upravené' },
  { value: 'name', label: 'Jméno' },
  { value: 'age', label: 'Věk' },
  { value: 'health', label: 'Zdravotní stav' },
  { value: 'next_event', label: 'Nejbližší důležitá událost' },
]

/** Brief card labels — 4 stavů, bez diagnóz. */
export function formatHealthStatusBrief(status?: HealthStatus): string {
  if (!status) return 'Zatím nevyplněno'
  switch (status) {
    case 'excellent':
      return 'Výborný stav'
    case 'good':
      return 'Dobrý stav'
    case 'attention':
      return 'Sledovat'
    case 'vet_check':
    case 'urgent':
      return 'Vyžaduje pozornost'
  }
}

export function healthStatusSortRank(status?: HealthStatus): number {
  switch (status) {
    case 'urgent':
      return 0
    case 'vet_check':
      return 1
    case 'attention':
      return 2
    case 'good':
      return 3
    case 'excellent':
      return 4
    default:
      return 5
  }
}

function petAgeMonths(pet: Pet): number {
  const years = pet.age != null && pet.age >= 0 ? Math.floor(pet.age) : 0
  const months =
    pet.ageMonths != null && pet.ageMonths > 0 ? Math.min(11, Math.floor(pet.ageMonths)) : 0
  if (pet.age == null && months <= 0) return Number.POSITIVE_INFINITY
  return years * 12 + months
}

export type NextHealthTerm = {
  label: string
  dateLabel: string
  daysAway: number
  sortKey: string
}

/** Nejbližší zdravotní termín (kalendář health + nextVaccination). Běžné péče / aktivity se nepočítají. */
export function getNextImportantHealthTerm(
  pet: Pet,
  calendarEvents: CalendarEvent[],
): NextHealthTerm | null {
  const candidates: { date: Date; label: string; sortKey: string }[] = []

  for (const event of calendarEvents) {
    if (event.petName !== pet.name) continue
    if (getEventCategory(event.type) !== 'health') continue
    const date = parseEventDate(event.date)
    if (date < APP_TODAY) continue
    candidates.push({
      date,
      label: event.title?.trim() || getEventTypeLabel(event.type),
      sortKey: event.date,
    })
  }

  const vaccinationFromField = pet.nextVaccination
    ? parseCzechDate(pet.nextVaccination)
    : null
  if (vaccinationFromField && vaccinationFromField >= APP_TODAY) {
    const already = candidates.some(
      (c) =>
        c.date.getFullYear() === vaccinationFromField.getFullYear() &&
        c.date.getMonth() === vaccinationFromField.getMonth() &&
        c.date.getDate() === vaccinationFromField.getDate() &&
        /očkov/i.test(c.label),
    )
    if (!already) {
      candidates.push({
        date: vaccinationFromField,
        label: 'Očkování',
        sortKey: pet.nextVaccination!,
      })
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime())
  const nearest = candidates[0]
  const daysAway = daysUntil(APP_TODAY, nearest.date)
  const dateLabel =
    daysAway === 0
      ? 'Dnes'
      : daysAway === 1
        ? 'Zítra'
        : `${nearest.date.getDate()}. ${nearest.date.getMonth() + 1}.`

  const y = nearest.date.getFullYear()
  const m = String(nearest.date.getMonth() + 1).padStart(2, '0')
  const d = String(nearest.date.getDate()).padStart(2, '0')

  return {
    label: nearest.label,
    dateLabel,
    daysAway,
    sortKey: `${y}-${m}-${d}`,
  }
}

/** Doplňky stravy / prevence nejsou „aktivní léčba“. */
function isSupplementOrPreventiveMedication(record: HealthRecord): boolean {
  const text = `${record.title} ${record.subtitle} ${record.notes ?? ''}`.toLowerCase()
  return /omega|doplň|vitamin|vitamín|glukosamin|chondroit|probiot|rybí olej|lososov|supplement|prevenc/i.test(
    text,
  )
}

function hasActiveClinicalTreatment(
  petId: string,
  healthRecords: HealthRecord[],
): boolean {
  return healthRecords.some(
    (record) =>
      record.petId === petId &&
      record.type === 'medication' &&
      record.status === 'active' &&
      !isSupplementOrPreventiveMedication(record),
  )
}

/**
 * Jemné zdravotní upozornění pod fotkou.
 * Zobrazí se jen při skutečné aktivní léčbě / blízké kontrole — nikdy jako falešný stav
 * a nikdy v rozporu s badge „Výborný stav“ / „Dobrý stav“.
 */
export function getPetHealthAttentionHint(
  pet: Pet,
  healthRecords: HealthRecord[],
  nextTerm: NextHealthTerm | null,
): string | null {
  const status = pet.healthStatus
  const looksHealthy = status === 'excellent' || status === 'good'

  const activeTreatment = hasActiveClinicalTreatment(pet.id, healthRecords)
  // Neodporuj badge: u výborného/dobrého stavu neukazuj „Probíhá léčba“
  // (doplňky už jsou odfiltrované; zbývající léčba by badge měla zhoršit).
  if (activeTreatment && !looksHealthy) return 'Probíhá léčba'

  if (
    nextTerm &&
    nextTerm.daysAway <= 7 &&
    !looksHealthy &&
    (/kontrol|vyšetř|veterin|prohlíd/i.test(nextTerm.label) ||
      status === 'vet_check' ||
      status === 'attention' ||
      status === 'urgent')
  ) {
    if (nextTerm.daysAway === 0) return 'Kontrola dnes'
    if (nextTerm.daysAway === 1) return 'Kontrola zítra'
    const days = nextTerm.daysAway
    const daysLabel =
      days >= 2 && days <= 4 ? `${days} dny` : `${days} dní`
    return `Kontrola za ${daysLabel}`
  }

  return null
}

export type LostCardSummary = {
  lastSeenLabel: string
  lastSeenAt: string
  newSightingCount: number
}

export function getLostCardSummary(
  pet: Pet,
  announcements: LostPetAnnouncement[],
  reports: LostPetReport[],
): LostCardSummary | null {
  if (pet.lostStatus !== 'lost') return null
  const announcement = findActiveAnnouncementForPet(announcements, pet.id)
  if (!announcement) return null

  const sightings = reports.filter(
    (report) =>
      report.announcementId === announcement.id && report.type === 'sighting',
  )

  return {
    lastSeenLabel: announcement.lastSeen.publicLabel,
    lastSeenAt: announcement.lastSeen.seenAt,
    newSightingCount: sightings.length,
  }
}

function nextEventSortKey(pet: Pet, calendarEvents: CalendarEvent[]): string {
  const term = getNextImportantHealthTerm(pet, calendarEvents)
  return term?.sortKey ?? '9999-99-99'
}

export function sortPetsForList(
  pets: Pet[],
  sort: PetListSort,
  calendarEvents: CalendarEvent[],
): Pet[] {
  const indexed = pets.map((pet, index) => ({ pet, index }))

  indexed.sort((a, b) => {
    const aLost = a.pet.lostStatus === 'lost' ? 0 : 1
    const bLost = b.pet.lostStatus === 'lost' ? 0 : 1
    if (aLost !== bLost) return aLost - bLost

    switch (sort) {
      case 'name':
        return a.pet.name.localeCompare(b.pet.name, 'cs') || a.index - b.index
      case 'age': {
        const ageDiff = petAgeMonths(a.pet) - petAgeMonths(b.pet)
        return ageDiff || a.index - b.index
      }
      case 'health': {
        const healthDiff =
          healthStatusSortRank(a.pet.healthStatus) -
          healthStatusSortRank(b.pet.healthStatus)
        return healthDiff || a.index - b.index
      }
      case 'next_event': {
        const eventDiff = nextEventSortKey(a.pet, calendarEvents).localeCompare(
          nextEventSortKey(b.pet, calendarEvents),
        )
        return eventDiff || a.index - b.index
      }
      case 'recent':
      default: {
        const aTime = a.pet.profileUpdatedAt?.trim() ?? ''
        const bTime = b.pet.profileUpdatedAt?.trim() ?? ''
        if (aTime && bTime) {
          return bTime.localeCompare(aTime) || a.index - b.index
        }
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        // Stabilní fallback: původní pořadí v seznamu
        return a.index - b.index
      }
    }
  })

  return indexed.map((item) => item.pet)
}
