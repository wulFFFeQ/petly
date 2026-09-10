import type { EventType } from '../types'

/** Which optional sections/fields the calendar event form shows for a given type. */
export type EventFormFieldKey =
  | 'title'
  | 'visitReason'
  | 'vaccineName'
  | 'productName'
  | 'medicationName'
  | 'dosage'
  | 'examType'
  | 'trainingType'
  | 'discipline'
  | 'showClass'
  | 'partnerName'
  | 'litterCount'
  | 'dateTime'
  | 'pregnancyDates'
  | 'heatDates'
  | 'location'
  | 'nextBoosterDate'
  | 'treatmentEndDate'
  | 'recurrence'
  | 'reminder'
  | 'notes'

const ALL_COMMON: EventFormFieldKey[] = ['title', 'dateTime', 'reminder', 'notes']

const CARE_BASIC: EventFormFieldKey[] = [
  'title',
  'dateTime',
  'recurrence',
  'reminder',
  'notes',
]

const CARE_WITH_PLACE: EventFormFieldKey[] = [
  'title',
  'dateTime',
  'location',
  'recurrence',
  'reminder',
  'notes',
]

/** Explicit field sets — unspecified types fall back to a sensible default. */
const FIELD_SETS: Partial<Record<EventType, EventFormFieldKey[]>> = {
  vet: [
    'title',
    'visitReason',
    'dateTime',
    'location',
    'recurrence',
    'reminder',
    'notes',
  ],
  medication: [
    'title',
    'medicationName',
    'dosage',
    'dateTime',
    'treatmentEndDate',
    'recurrence',
    'reminder',
    'notes',
  ],
  vaccination: [
    'title',
    'vaccineName',
    'dateTime',
    'location',
    'nextBoosterDate',
    'reminder',
    'notes',
  ],
  deworming: [
    'title',
    'productName',
    'dateTime',
    'dosage',
    'recurrence',
    'reminder',
    'notes',
  ],
  antiparasitic: [
    'title',
    'productName',
    'dateTime',
    'dosage',
    'recurrence',
    'reminder',
    'notes',
  ],
  examination: [
    'title',
    'examType',
    'visitReason',
    'dateTime',
    'location',
    'reminder',
    'notes',
  ],
  checkup: [
    'title',
    'visitReason',
    'dateTime',
    'location',
    'reminder',
    'notes',
  ],
  lab: ['title', 'examType', 'dateTime', 'location', 'reminder', 'notes'],
  surgery: ['title', 'visitReason', 'dateTime', 'location', 'reminder', 'notes'],
  rehab: ['title', 'dateTime', 'location', 'recurrence', 'reminder', 'notes'],
  health_other: [...ALL_COMMON, 'location', 'recurrence'],

  coat_care: CARE_WITH_PLACE,
  bathing: CARE_BASIC,
  nail_trim: CARE_BASIC,
  dental: CARE_BASIC,
  grooming: CARE_WITH_PLACE,
  teeth_cleaning: CARE_BASIC,
  ear_cleaning: CARE_BASIC,
  care_other: CARE_WITH_PLACE,

  training: [
    'title',
    'dateTime',
    'location',
    'trainingType',
    'recurrence',
    'reminder',
    'notes',
  ],
  walk: ['title', 'dateTime', 'location', 'notes'],
  trip: ['title', 'dateTime', 'location', 'notes'],
  sport: ['title', 'dateTime', 'location', 'trainingType', 'notes'],
  course: [
    'title',
    'dateTime',
    'location',
    'trainingType',
    'recurrence',
    'reminder',
    'notes',
  ],
  swimming: ['title', 'dateTime', 'location', 'notes'],
  socialization: ['title', 'dateTime', 'location', 'recurrence', 'notes'],
  agility: [
    'title',
    'dateTime',
    'location',
    'trainingType',
    'recurrence',
    'reminder',
    'notes',
  ],
  doggy_daycare: ['title', 'dateTime', 'location', 'recurrence', 'notes'],
  activity_other: ['title', 'dateTime', 'location', 'recurrence', 'reminder', 'notes'],

  exhibition: [
    'title',
    'dateTime',
    'location',
    'showClass',
    'reminder',
    'notes',
  ],
  competition: [
    'title',
    'dateTime',
    'location',
    'discipline',
    'reminder',
    'notes',
  ],
  exam: ['title', 'dateTime', 'location', 'discipline', 'reminder', 'notes'],
  judging: ['title', 'dateTime', 'location', 'showClass', 'reminder', 'notes'],
  show_entry: ['title', 'dateTime', 'location', 'reminder', 'notes'],
  show_other: ['title', 'dateTime', 'location', 'reminder', 'notes'],

  heat: ['title', 'heatDates', 'notes'],
  mating: ['title', 'dateTime', 'location', 'partnerName', 'notes'],
  pregnancy: ['title', 'pregnancyDates', 'notes'],
  pregnancy_check: ['title', 'dateTime', 'location', 'reminder', 'notes'],
  birth: ['title', 'dateTime', 'litterCount', 'notes'],
  litter_check: ['title', 'dateTime', 'litterCount', 'notes'],
  weaning: ['title', 'dateTime', 'notes'],
  breeding_other: ['title', 'dateTime', 'location', 'notes'],

  birthday: ['title', 'dateTime', 'recurrence', 'reminder', 'notes'],
  adoption_anniversary: ['title', 'dateTime', 'recurrence', 'reminder', 'notes'],
  travel: ['title', 'dateTime', 'location', 'notes'],
  pet_sitting: ['title', 'dateTime', 'location', 'notes'],
  custom: ['title', 'dateTime', 'location', 'recurrence', 'reminder', 'notes'],
}

const DEFAULT_FIELDS: EventFormFieldKey[] = [
  'title',
  'dateTime',
  'location',
  'recurrence',
  'reminder',
  'notes',
]

export function getEventFormFields(type: EventType): Set<EventFormFieldKey> {
  return new Set(FIELD_SETS[type] ?? DEFAULT_FIELDS)
}

export function eventFormShows(type: EventType, field: EventFormFieldKey): boolean {
  return getEventFormFields(type).has(field)
}
