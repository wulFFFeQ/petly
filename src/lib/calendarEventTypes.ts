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
    { value: 'antiparasitic', label: 'Antiparazitní ochrana' },
    { value: 'medication', label: 'Léky / léčba' },
    { value: 'examination', label: 'Vyšetření' },
    { value: 'lab', label: 'Laboratorní vyšetření' },
    { value: 'surgery', label: 'Operace / zákrok' },
    { value: 'rehab', label: 'Rehabilitace / fyzioterapie' },
    { value: 'dental', label: 'Dentální péče' },
  ],
  care: [
    { value: 'grooming', label: 'Grooming / stříhání' },
    { value: 'bathing', label: 'Koupání' },
    { value: 'nail_trim', label: 'Stříhání drápků' },
    { value: 'teeth_cleaning', label: 'Čištění zubů' },
    { value: 'ear_cleaning', label: 'Čištění uší' },
    { value: 'coat_care', label: 'Úprava srsti' },
  ],
  activity: [
    { value: 'training', label: 'Výcvik / trénink' },
    { value: 'agility', label: 'Agility / sport' },
    { value: 'socialization', label: 'Socializace' },
    { value: 'course', label: 'Kurz / lekce' },
    { value: 'doggy_daycare', label: 'Psí školka' },
    { value: 'pet_sitting', label: 'Pet-sitting / hlídání' },
    { value: 'trip', label: 'Výlet' },
    { value: 'travel', label: 'Cestování' },
  ],
  show: [
    { value: 'exhibition', label: 'Výstava' },
    { value: 'competition', label: 'Soutěž / závod' },
    { value: 'exam', label: 'Zkouška / zkoušky' },
    { value: 'seminar', label: 'Seminář / workshop' },
  ],
  breeding: [
    { value: 'heat', label: 'Hárání' },
    { value: 'mating', label: 'Krytí' },
    { value: 'pregnancy', label: 'Březost' },
    { value: 'birth', label: 'Porod / vrh' },
    { value: 'litter_check', label: 'Kontrola vrhu' },
  ],
  other: [
    { value: 'birthday', label: 'Narozeniny' },
    { value: 'adoption_anniversary', label: 'Adopční výročí' },
    { value: 'community_meetup', label: 'Setkání komunity' },
    { value: 'custom', label: 'Vlastní událost' },
  ],
}

const EVENT_TYPE_TO_CATEGORY: Record<EventType, CalendarEventCategory> = {
  vet: 'health',
  vaccination: 'health',
  deworming: 'health',
  antiparasitic: 'health',
  medication: 'health',
  examination: 'health',
  lab: 'health',
  surgery: 'health',
  rehab: 'health',
  dental: 'health',
  grooming: 'care',
  bathing: 'care',
  nail_trim: 'care',
  teeth_cleaning: 'care',
  ear_cleaning: 'care',
  coat_care: 'care',
  training: 'activity',
  agility: 'activity',
  socialization: 'activity',
  course: 'activity',
  doggy_daycare: 'activity',
  pet_sitting: 'activity',
  trip: 'activity',
  travel: 'activity',
  exhibition: 'show',
  competition: 'show',
  exam: 'show',
  seminar: 'show',
  heat: 'breeding',
  mating: 'breeding',
  pregnancy: 'breeding',
  birth: 'breeding',
  litter_check: 'breeding',
  birthday: 'other',
  adoption_anniversary: 'other',
  community_meetup: 'other',
  custom: 'other',
  feeding: 'other',
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  vet: 'Veterinář / preventivní prohlídka',
  vaccination: 'Očkování',
  deworming: 'Odčervení',
  antiparasitic: 'Antiparazitní ochrana',
  medication: 'Léky / léčba',
  examination: 'Vyšetření',
  lab: 'Laboratorní vyšetření',
  surgery: 'Operace / zákrok',
  rehab: 'Rehabilitace / fyzioterapie',
  dental: 'Dentální péče',
  grooming: 'Grooming / stříhání',
  bathing: 'Koupání',
  nail_trim: 'Stříhání drápků',
  teeth_cleaning: 'Čištění zubů',
  ear_cleaning: 'Čištění uší',
  coat_care: 'Úprava srsti',
  training: 'Výcvik / trénink',
  agility: 'Agility / sport',
  socialization: 'Socializace',
  course: 'Kurz / lekce',
  doggy_daycare: 'Psí školka',
  pet_sitting: 'Pet-sitting / hlídání',
  trip: 'Výlet',
  travel: 'Cestování',
  exhibition: 'Výstava',
  competition: 'Soutěž / závod',
  exam: 'Zkouška / zkoušky',
  seminar: 'Seminář / workshop',
  heat: 'Hárání',
  mating: 'Krytí',
  pregnancy: 'Březost',
  birth: 'Porod / vrh',
  litter_check: 'Kontrola vrhu',
  birthday: 'Narozeniny',
  adoption_anniversary: 'Adopční výročí',
  community_meetup: 'Setkání komunity',
  custom: 'Vlastní událost',
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
  if (type === 'exhibition' || type === 'competition' || type === 'seminar') {
    return 'Místo konání'
  }
  if (type === 'vet' || type === 'vaccination' || type === 'surgery' || type === 'lab') {
    return 'Místo (klinika)'
  }
  if (type === 'trip' || type === 'travel') return 'Destinace'
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

export function eventSupportsReminder(type: EventType): boolean {
  return type === 'medication' || type === 'deworming' || type === 'antiparasitic'
}

export function getAvailableCategories(hasBreedingProfile: boolean): CalendarCategoryOption[] {
  return CALENDAR_CATEGORY_OPTIONS.filter(
    (option) => !option.breedingOnly || hasBreedingProfile,
  )
}

export function getEventTypesForCategory(
  category: CalendarEventCategory,
): CalendarEventTypeOption[] {
  return EVENT_TYPES_BY_CATEGORY[category]
}

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
  const categoryStyle = getEventCategoryStyle(getEventCategory(type))
  return { ...categoryStyle, label: getEventTypeLabel(type) }
}
