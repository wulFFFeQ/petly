import type { PetType } from './petTypes'
import type { CalendarEventCategory, EventType } from '../types'

export type CalendarEventTypeOption = {
  value: EventType
  label: string
}

export type CalendarCategoryOption = {
  value: CalendarEventCategory
  label: string
  breedingOnly?: boolean
}

/** Categories offered in the calendar event modal (feeding / daily chores excluded). */
export const CALENDAR_CATEGORY_OPTIONS: CalendarCategoryOption[] = [
  { value: 'health', label: 'Zdraví' },
  { value: 'care', label: 'Péče' },
  { value: 'activity', label: 'Aktivity' },
  { value: 'show', label: 'Výstavy a soutěže' },
  { value: 'breeding', label: 'Chov', breedingOnly: true },
  { value: 'other', label: 'Ostatní' },
]

export const EVENT_TYPES_BY_CATEGORY: Record<
  CalendarEventCategory,
  CalendarEventTypeOption[]
> = {
  health: [
    { value: 'vet', label: 'Veterinář / preventivní prohlídka' },
    { value: 'vaccination', label: 'Očkování' },
    { value: 'deworming', label: 'Odčervení' },
    { value: 'antiparasitic', label: 'Antiparazitární ochrana' },
    { value: 'medication', label: 'Léky / léčba' },
    { value: 'examination', label: 'Vyšetření' },
    { value: 'checkup', label: 'Kontrola' },
    { value: 'lab', label: 'Odběr / laboratorní vyšetření' },
    { value: 'rehab', label: 'Rehabilitace' },
    { value: 'surgery', label: 'Operace / zákrok' },
    { value: 'health_other', label: 'Jiná zdravotní událost' },
  ],
  care: [
    { value: 'coat_care', label: 'Péče o srst' },
    { value: 'bathing', label: 'Hygiena' },
    { value: 'nail_trim', label: 'Drápky' },
    { value: 'dental', label: 'Dentální péče' },
    { value: 'grooming', label: 'Grooming / stříhání' },
    { value: 'teeth_cleaning', label: 'Čištění zubů' },
    { value: 'ear_cleaning', label: 'Čištění uší' },
    { value: 'care_other', label: 'Jiná péče' },
  ],
  activity: [
    { value: 'training', label: 'Trénink' },
    { value: 'walk', label: 'Procházka' },
    { value: 'trip', label: 'Výlet' },
    { value: 'sport', label: 'Sport' },
    { value: 'course', label: 'Výcvik' },
    { value: 'swimming', label: 'Plavání' },
    { value: 'socialization', label: 'Socializace' },
    { value: 'agility', label: 'Agility' },
    { value: 'doggy_daycare', label: 'Psí školka' },
    { value: 'activity_other', label: 'Jiná aktivita' },
  ],
  show: [
    { value: 'exhibition', label: 'Výstava' },
    { value: 'competition', label: 'Soutěž' },
    { value: 'exam', label: 'Závod' },
    { value: 'judging', label: 'Posuzování' },
    { value: 'show_entry', label: 'Přihláška' },
    { value: 'show_other', label: 'Jiná výstavní událost' },
  ],
  breeding: [
    { value: 'heat', label: 'Hárání' },
    { value: 'mating', label: 'Krytí' },
    { value: 'pregnancy', label: 'Březost' },
    { value: 'pregnancy_check', label: 'Kontrola březosti' },
    { value: 'birth', label: 'Porod' },
    { value: 'litter_check', label: 'Vrh' },
    { value: 'weaning', label: 'Odstav' },
    { value: 'breeding_other', label: 'Jiná chovatelská událost' },
  ],
  other: [
    { value: 'birthday', label: 'Narozeniny' },
    { value: 'adoption_anniversary', label: 'Výročí adopce' },
    { value: 'travel', label: 'Cestování' },
    { value: 'pet_sitting', label: 'Hlídání' },
    { value: 'roadtrip', label: 'Roadtrip' },
    { value: 'foreign_travel', label: 'Zahraniční cesta' },
    { value: 'pet_friend', label: 'Nový zvířecí kamarád' },
    { value: 'community_meetup', label: 'Setkání komunity' },
    { value: 'document_expiry', label: 'Expirace dokumentu' },
    { value: 'booking', label: 'Rezervace' },
    { value: 'custom', label: 'Jiná událost' },
  ],
}

const EVENT_TYPE_TO_CATEGORY: Record<EventType, CalendarEventCategory> = {
  vet: 'health',
  vaccination: 'health',
  deworming: 'health',
  antiparasitic: 'health',
  medication: 'health',
  examination: 'health',
  checkup: 'health',
  lab: 'health',
  surgery: 'health',
  rehab: 'health',
  health_other: 'health',
  grooming: 'care',
  bathing: 'care',
  nail_trim: 'care',
  teeth_cleaning: 'care',
  ear_cleaning: 'care',
  coat_care: 'care',
  dental: 'care',
  care_other: 'care',
  training: 'activity',
  agility: 'activity',
  socialization: 'activity',
  course: 'activity',
  doggy_daycare: 'activity',
  walk: 'activity',
  sport: 'activity',
  trip: 'activity',
  swimming: 'activity',
  activity_other: 'activity',
  pet_sitting: 'other',
  travel: 'other',
  roadtrip: 'other',
  foreign_travel: 'other',
  pet_friend: 'other',
  exhibition: 'show',
  competition: 'show',
  exam: 'show',
  seminar: 'show',
  judging: 'show',
  show_entry: 'show',
  show_other: 'show',
  heat: 'breeding',
  mating: 'breeding',
  pregnancy: 'breeding',
  birth: 'breeding',
  litter_check: 'breeding',
  pregnancy_check: 'breeding',
  weaning: 'breeding',
  breeding_other: 'breeding',
  birthday: 'other',
  adoption_anniversary: 'other',
  community_meetup: 'other',
  document_expiry: 'other',
  booking: 'other',
  custom: 'other',
  feeding: 'other',
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  vet: 'Veterinář / preventivní prohlídka',
  vaccination: 'Očkování',
  deworming: 'Odčervení',
  antiparasitic: 'Antiparazitární ochrana',
  medication: 'Léky / léčba',
  examination: 'Vyšetření',
  checkup: 'Kontrola',
  lab: 'Odběr / laboratorní vyšetření',
  surgery: 'Operace / zákrok',
  rehab: 'Rehabilitace',
  dental: 'Dentální péče',
  health_other: 'Jiná zdravotní událost',
  grooming: 'Grooming / stříhání',
  bathing: 'Hygiena',
  nail_trim: 'Drápky',
  teeth_cleaning: 'Čištění zubů',
  ear_cleaning: 'Čištění uší',
  coat_care: 'Péče o srst',
  care_other: 'Jiná péče',
  training: 'Trénink',
  agility: 'Agility',
  socialization: 'Socializace',
  course: 'Výcvik',
  doggy_daycare: 'Psí školka',
  walk: 'Procházka',
  sport: 'Sport',
  activity_other: 'Jiná aktivita',
  pet_sitting: 'Hlídání',
  trip: 'Výlet',
  travel: 'Cestování',
  swimming: 'Plavání',
  roadtrip: 'Roadtrip',
  foreign_travel: 'Zahraniční cesta',
  pet_friend: 'Nový zvířecí kamarád',
  exhibition: 'Výstava',
  competition: 'Soutěž',
  exam: 'Závod',
  seminar: 'Seminář / workshop',
  judging: 'Posuzování',
  show_entry: 'Přihláška',
  show_other: 'Jiná výstavní událost',
  heat: 'Hárání',
  mating: 'Krytí',
  pregnancy: 'Březost',
  birth: 'Porod',
  litter_check: 'Vrh',
  pregnancy_check: 'Kontrola březosti',
  weaning: 'Odstav',
  breeding_other: 'Jiná chovatelská událost',
  birthday: 'Narozeniny',
  adoption_anniversary: 'Výročí adopce',
  community_meetup: 'Setkání komunity',
  document_expiry: 'Expirace dokumentu',
  booking: 'Rezervace',
  custom: 'Jiná událost',
  feeding: 'Krmení',
}

const CATEGORY_LABELS: Record<CalendarEventCategory, string> = {
  health: 'Zdraví',
  care: 'Péče',
  activity: 'Aktivity',
  show: 'Výstavy a soutěže',
  breeding: 'Chov',
  other: 'Ostatní',
}

export function getEventCategory(type: EventType): CalendarEventCategory {
  return EVENT_TYPE_TO_CATEGORY[type]
}

export function getEventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type]
}

export function getCategoryLabel(category: CalendarEventCategory): string {
  return CATEGORY_LABELS[category]
}

export function getDefaultEventTitle(type: EventType): string {
  if (type === 'custom') return ''
  return EVENT_TYPE_LABELS[type]
}

export function getLocationFieldLabel(type: EventType): string {
  if (
    type === 'exhibition' ||
    type === 'competition' ||
    type === 'seminar' ||
    type === 'judging' ||
    type === 'show_entry'
  ) {
    return 'Místo konání'
  }
  if (
    type === 'vet' ||
    type === 'vaccination' ||
    type === 'surgery' ||
    type === 'lab' ||
    type === 'checkup' ||
    type === 'examination'
  ) {
    return 'Klinika / veterinář'
  }
  if (type === 'grooming' || type === 'bathing' || type === 'coat_care') {
    return 'Místo / salon'
  }
  if (type === 'mating') return 'Místo'
  if (type === 'trip' || type === 'travel' || type === 'roadtrip' || type === 'foreign_travel') {
    return 'Destinace'
  }
  if (type === 'swimming') return 'Místo (voda)'
  if (type === 'pet_friend') return 'Kde jste se potkali'
  return 'Místo'
}

export function getDefaultEventLocation(type: EventType): string {
  switch (type) {
    case 'vet':
    case 'vaccination':
    case 'examination':
    case 'lab':
    case 'surgery':
    case 'dental':
      return 'PetCare Central Praha'
    case 'grooming':
    case 'bathing':
    case 'coat_care':
      return 'Grooming studio'
    case 'exhibition':
    case 'competition':
    case 'exam':
      return ''
    case 'medication':
    case 'deworming':
    case 'antiparasitic':
    case 'heat':
    case 'birthday':
    case 'adoption_anniversary':
      return 'Doma'
    default:
      return ''
  }
}

/** Reminder is available for virtually all calendar event types. */
export function eventSupportsReminder(_type: EventType): boolean {
  return true
}

/** Compact label for month-grid chips — prefer short readable names over truncated long titles. */
export function getCalendarChipTitle(event: {
  type: EventType
  title: string
  medicationName?: string
  vaccineName?: string
  partnerName?: string
}): string {
  if (event.type === 'medication') {
    const name = event.medicationName?.trim()
    if (name) return name.length > 18 ? `Lék – ${name.slice(0, 16)}…` : `Lék – ${name}`
    const fromTitle = event.title.replace(/^Lék\s*[·–-]\s*/i, '').trim()
    if (fromTitle && fromTitle !== event.title) {
      return fromTitle.length > 16 ? `Lék – ${fromTitle.slice(0, 14)}…` : `Lék – ${fromTitle}`
    }
    return 'Lék'
  }
  if (event.type === 'vaccination' && event.vaccineName?.trim()) {
    const v = event.vaccineName.trim()
    return v.length > 18 ? v.slice(0, 17) + '…' : v
  }
  if (event.type === 'mating' && event.partnerName?.trim()) {
    return `Krytí · ${event.partnerName.trim()}`
  }
  const shortType = getEventTypeLabel(event.type)
  if (!event.title || event.title === shortType) {
    // Prefer shorter chip for long type labels
    if (event.type === 'vet') return 'Veterinář'
    if (event.type === 'antiparasitic') return 'Antiparazitika'
    if (event.type === 'deworming') return 'Odčervení'
    if (event.type === 'grooming') return 'Grooming'
    if (event.type === 'birthday') return 'Narozeniny'
    return shortType.length > 20 ? shortType.slice(0, 18) + '…' : shortType
  }
  if (event.title.length <= 22) return event.title
  return event.title.slice(0, 20) + '…'
}

export function getAvailableCategories(hasBreedingProfile: boolean): CalendarCategoryOption[] {
  return CALENDAR_CATEGORY_OPTIONS.filter(
    (option) => !option.breedingOnly || hasBreedingProfile,
  )
}

export function getEventTypesForCategory(
  category: CalendarEventCategory,
  options?: { isFemale?: boolean; petType?: PetType; neutered?: boolean },
): CalendarEventTypeOption[] {
  const types = EVENT_TYPES_BY_CATEGORY[category]
  if (category !== 'breeding') return types

  const isFemale = options?.isFemale !== false
  const petType = options?.petType
  const neutered = options?.neutered === true

  return types.filter((option) => {
    // Males: only mating remains relevant among breeding events.
    if (!isFemale) {
      return option.value === 'mating' || option.value === 'breeding_other'
    }

    // Hárání only for intact female dogs with breeding context.
    if (option.value === 'heat') {
      if (neutered) return false
      return !petType || petType === 'dog'
    }

    return true
  })
}

function addDaysToIsoDate(startIso: string, days: number): string {
  const match = startIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return startIso
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Inclusive list of ISO dates from start to end (YYYY-MM-DD). */
export function eachIsoDateInclusive(startIso: string, endIso: string): string[] {
  const startMatch = startIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const endMatch = endIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!startMatch || !endMatch) return startMatch ? [startIso] : []

  const cursor = new Date(
    Number(startMatch[1]),
    Number(startMatch[2]) - 1,
    Number(startMatch[3]),
    12,
    0,
    0,
  )
  const end = new Date(
    Number(endMatch[1]),
    Number(endMatch[2]) - 1,
    Number(endMatch[3]),
    12,
    0,
    0,
  )
  if (end.getTime() < cursor.getTime()) return [startIso]

  const dates: string[] = []
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** Active heat ends on actual end when known, otherwise the estimated end. */
export function getHeatPeriodEndDate(event: {
  date: string
  expectedEndDate?: string
  actualEndDate?: string
}): string {
  return event.actualEndDate || event.expectedEndDate || event.date
}

/** Typical gestation length for dogs and cats (~9 weeks). */
export function suggestPregnancyDueDate(startIso: string): string {
  return addDaysToIsoDate(startIso, 63)
}

/**
 * Typical heat (proestrus + estrus) for bitches is about 14–21 days;
 * we use 21 days as a practical default the owner can edit.
 */
export const TYPICAL_HEAT_DAYS = 21

export function suggestHeatEndDate(startIso: string): string {
  return addDaysToIsoDate(startIso, TYPICAL_HEAT_DAYS)
}

export const HEAT_DURATION_HINT =
  'U fen obvykle trvá hárání cca 14–21 dní. Doplnili jsme odhad 21 dní — můžete upravit, nebo později zaznamenat skutečný konec.'

export type EventVisualStyle = {
  bg: string
  text: string
  border: string
  dot: string
  label: string
}

export function getEventCategoryStyle(category: CalendarEventCategory): EventVisualStyle {
  const styles: Record<CalendarEventCategory, EventVisualStyle> = {
    health: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200/60',
      dot: 'bg-sky-500',
      label: CATEGORY_LABELS.health,
    },
    care: {
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-200/60',
      dot: 'bg-purple-500',
      label: CATEGORY_LABELS.care,
    },
    activity: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200/60',
      dot: 'bg-emerald-500',
      label: CATEGORY_LABELS.activity,
    },
    show: {
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      border: 'border-amber-200/60',
      dot: 'bg-amber-500',
      label: CATEGORY_LABELS.show,
    },
    breeding: {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200/60',
      dot: 'bg-rose-500',
      label: CATEGORY_LABELS.breeding,
    },
    other: {
      bg: 'bg-[#FAF8F5]',
      text: 'text-[#4A564F]',
      border: 'border-[#E8E4DC]',
      dot: 'bg-[#7D8B82]',
      label: CATEGORY_LABELS.other,
    },
  }
  return styles[category]
}

export function getEventVisualStyle(type: EventType): EventVisualStyle {
  if (type === 'vaccination') {
    return {
      bg: 'bg-[#EBF2EE]',
      text: 'text-[#2C4A3E]',
      border: 'border-[#D1E0D8]',
      dot: 'bg-[#2C4A3E]',
      label: getEventTypeLabel(type),
    }
  }
  if (type === 'medication') {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200/60',
      dot: 'bg-amber-500',
      label: getEventTypeLabel(type),
    }
  }
  if (type === 'feeding') {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200/60',
      dot: 'bg-emerald-500',
      label: getEventTypeLabel(type),
    }
  }
  if (type === 'booking') {
    return {
      bg: 'bg-[#EBF2EE]',
      text: 'text-[#2C4A3E]',
      border: 'border-[#D1E0D8]',
      dot: 'bg-[#B8934A]',
      label: getEventTypeLabel(type),
    }
  }
  const categoryStyle = getEventCategoryStyle(getEventCategory(type))
  return { ...categoryStyle, label: getEventTypeLabel(type) }
}
