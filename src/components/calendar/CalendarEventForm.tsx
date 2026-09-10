import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  eventSupportsReminder,
  getAvailableCategories,
  getDefaultEventLocation,
  getDefaultEventTitle,
  getEventCategory,
  getEventTypesForCategory,
  getLocationFieldLabel,
  HEAT_DURATION_HINT,
  suggestHeatEndDate,
  suggestPregnancyDueDate,
} from '../../lib/calendarEventTypes'
import { isRecurring, RECURRENCE_SCOPE_LABELS } from '../../lib/calendarRecurrence'
import { isFemalePetGender } from '../../lib/petTypes'
import { todayIsoDate } from '../../lib/petProfileUtils'
import type {
  CalendarEvent,
  CalendarEventCategory,
  EventRecurrence,
  EventType,
  RecurrenceEditScope,
  RecurrenceFrequency,
  ReminderOffset,
} from '../../types'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'
import { OptionSelect } from '../ui/OptionSelect'

export type EventFormState = {
  category: CalendarEventCategory
  type: EventType
  title: string
  petId: string
  petName: string
  date: string
  time: string
  location: string
  notes: string
  reminderEnabled: boolean
  reminderOffset: ReminderOffset
  reminderCustomMinutes: string
  recurrenceFrequency: RecurrenceFrequency
  recurrenceInterval: string
  recurrenceWeekDays: number[]
  recurrenceEndDate: string
  recurrenceNoEnd: boolean
  expectedBirthDate: string
  expectedEndDate: string
  actualEndDate: string
  dosage: string
  medicationName: string
  vaccineName: string
  nextBoosterDate: string
  partnerName: string
  showClass: string
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Po' },
  { value: 1, label: 'Út' },
  { value: 2, label: 'St' },
  { value: 3, label: 'Čt' },
  { value: 4, label: 'Pá' },
  { value: 5, label: 'So' },
  { value: 6, label: 'Ne' },
]

const REMINDER_OFFSET_OPTIONS: { value: ReminderOffset; label: string }[] = [
  { value: '15m', label: '15 minut předem' },
  { value: '1h', label: '1 hodinu předem' },
  { value: '1d', label: '1 den předem' },
  { value: '2d', label: '2 dny předem' },
  { value: 'custom', label: 'Vlastní' },
]

function defaultRecurrenceForType(type: EventType): RecurrenceFrequency {
  if (type === 'birthday' || type === 'adoption_anniversary') return 'yearly'
  return 'none'
}

export function getDefaultEventForm(
  petName = 'Luna',
  type: EventType = 'vet',
  petId = '',
  datePrefill?: string,
): EventFormState {
  const isPregnancy = type === 'pregnancy'
  const isHeat = type === 'heat'
  const start = datePrefill || todayIsoDate()
  return {
    category: getEventCategory(type),
    type,
    title: getDefaultEventTitle(type),
    petId,
    petName,
    date: start,
    time: isPregnancy || isHeat ? '' : '14:30',
    location: getDefaultEventLocation(type),
    notes: '',
    reminderEnabled: false,
    reminderOffset: '1d',
    reminderCustomMinutes: '60',
    recurrenceFrequency: defaultRecurrenceForType(type),
    recurrenceInterval: '1',
    recurrenceWeekDays: [],
    recurrenceEndDate: '',
    recurrenceNoEnd: true,
    expectedBirthDate: isPregnancy ? suggestPregnancyDueDate(start) : '',
    expectedEndDate: isHeat ? suggestHeatEndDate(start) : '',
    actualEndDate: '',
    dosage: '',
    medicationName: '',
    vaccineName: '',
    nextBoosterDate: '',
    partnerName: '',
    showClass: '',
  }
}

export function calendarEventToForm(
  event: CalendarEvent,
  occurrenceDate?: string | null,
): EventFormState {
  const isPregnancy = event.type === 'pregnancy'
  const isHeat = event.type === 'heat'
  const recurrence = event.recurrence
  const freq = recurrence?.frequency && recurrence.frequency !== 'none'
    ? recurrence.frequency
    : 'none'
  return {
    category: getEventCategory(event.type),
    type: event.type,
    title: event.title,
    petId: event.petId || '',
    petName: event.petName,
    date: occurrenceDate || event.date,
    time: isPregnancy || isHeat ? '' : event.time || '14:30',
    location: event.location || '',
    notes: event.notes || '',
    reminderEnabled: Boolean(event.reminderEnabled),
    reminderOffset: event.reminderOffset || '1d',
    reminderCustomMinutes: String(event.reminderCustomMinutes ?? 60),
    recurrenceFrequency: freq,
    recurrenceInterval: String(recurrence?.interval ?? 1),
    recurrenceWeekDays: recurrence?.weekDays ?? [],
    recurrenceEndDate: recurrence?.endDate || '',
    recurrenceNoEnd: !recurrence?.endDate,
    expectedBirthDate: event.expectedBirthDate || '',
    expectedEndDate: event.expectedEndDate || '',
    actualEndDate: event.actualEndDate || '',
    dosage: event.dosage || '',
    medicationName: event.medicationName || '',
    vaccineName: event.vaccineName || '',
    nextBoosterDate: event.nextBoosterDate || '',
    partnerName: event.partnerName || '',
    showClass: event.showClass || '',
  }
}

function buildRecurrenceFromForm(form: EventFormState): EventRecurrence | undefined {
  if (form.recurrenceFrequency === 'none') return undefined
  return {
    frequency: form.recurrenceFrequency,
    interval: Math.max(1, Number(form.recurrenceInterval) || 1),
    weekDays:
      form.recurrenceFrequency === 'weekly' && form.recurrenceWeekDays.length
        ? form.recurrenceWeekDays
        : undefined,
    endDate: form.recurrenceNoEnd ? undefined : form.recurrenceEndDate || undefined,
  }
}

function formToPayload(form: EventFormState): Omit<CalendarEvent, 'id'> {
  const usesPeriodDates = form.type === 'pregnancy' || form.type === 'heat'
  const title =
    form.type === 'medication' && form.medicationName.trim()
      ? `Lék – ${form.medicationName.trim()}`
      : form.type === 'vaccination' && form.vaccineName.trim()
        ? form.vaccineName.trim()
        : form.title.trim() || getDefaultEventTitle(form.type)

  return {
    title,
    petName: form.petName,
    petId: form.petId || undefined,
    type: form.type,
    date: form.date,
    time: usesPeriodDates ? undefined : form.time || undefined,
    location: form.location.trim() || undefined,
    notes: form.notes.trim() || undefined,
    reminderEnabled: form.reminderEnabled || undefined,
    reminderOffset: form.reminderEnabled ? form.reminderOffset : undefined,
    reminderCustomMinutes:
      form.reminderEnabled && form.reminderOffset === 'custom'
        ? Math.max(1, Number(form.reminderCustomMinutes) || 60)
        : undefined,
    recurrence: buildRecurrenceFromForm(form),
    expectedBirthDate:
      form.type === 'pregnancy' && form.expectedBirthDate
        ? form.expectedBirthDate
        : undefined,
    expectedEndDate:
      form.type === 'heat' && form.expectedEndDate ? form.expectedEndDate : undefined,
    actualEndDate:
      form.type === 'heat' && form.actualEndDate ? form.actualEndDate : undefined,
    dosage: form.dosage.trim() || undefined,
    medicationName: form.medicationName.trim() || undefined,
    vaccineName: form.vaccineName.trim() || undefined,
    nextBoosterDate: form.nextBoosterDate || undefined,
    partnerName: form.partnerName.trim() || undefined,
    showClass: form.showClass.trim() || undefined,
  }
}

function showsDosage(type: EventType) {
  return type === 'medication' || type === 'deworming' || type === 'antiparasitic'
}

function showsMedicationName(type: EventType) {
  return type === 'medication'
}

function showsVaccineFields(type: EventType) {
  return type === 'vaccination'
}

function showsPartner(type: EventType) {
  return type === 'mating'
}

function showsShowClass(type: EventType) {
  return type === 'exhibition' || type === 'competition' || type === 'judging'
}

function showsLocation(type: EventType) {
  return type !== 'birthday' && type !== 'adoption_anniversary'
}

export function CalendarEventForm() {
  const {
    activeModal,
    setActiveModal,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    updateCalendarOccurrence,
    deleteCalendarOccurrence,
    editingCalendarEventId,
    editingOccurrenceDate,
    calendarEventPrefillType,
    calendarEventPrefillDate,
    pets,
    calendarEvents,
    modalPetId,
  } = useApp()
  const location = useLocation()
  const [eventForm, setEventForm] = useState(() => getDefaultEventForm())
  const [editScope, setEditScope] = useState<RecurrenceEditScope>('series')
  const [scopePromptOpen, setScopePromptOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | null>(null)

  const routePetId = location.pathname.match(/^\/pets\/([^/]+)/)?.[1]
  const isEditingEvent = Boolean(editingCalendarEventId)
  const editingEvent = editingCalendarEventId
    ? calendarEvents.find((item) => item.id === editingCalendarEventId)
    : undefined
  const editingIsRecurring = Boolean(editingEvent && isRecurring(editingEvent))

  useEffect(() => {
    if (activeModal !== 'bookVet') return
    if (editingCalendarEventId) {
      const event = calendarEvents.find((item) => item.id === editingCalendarEventId)
      if (event) {
        setEventForm(calendarEventToForm(event, editingOccurrenceDate))
        setEditScope('series')
        setScopePromptOpen(false)
        setPendingAction(null)
        return
      }
    }
    const preferredId = modalPetId || routePetId || pets[0]?.id || ''
    const pet = pets.find((item) => item.id === preferredId) ?? pets[0]
    setEventForm(
      getDefaultEventForm(
        pet?.name ?? pets[0]?.name ?? 'Luna',
        calendarEventPrefillType ?? 'vet',
        pet?.id ?? '',
        calendarEventPrefillDate ?? undefined,
      ),
    )
    setEditScope('series')
    setScopePromptOpen(false)
    setPendingAction(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeModal,
    editingCalendarEventId,
    editingOccurrenceDate,
    calendarEventPrefillType,
    calendarEventPrefillDate,
  ])

  const selectedEventPet = useMemo(
    () =>
      pets.find((pet) => pet.id === eventForm.petId) ??
      pets.find((pet) => pet.name === eventForm.petName) ??
      pets[0],
    [pets, eventForm.petId, eventForm.petName],
  )

  const hasBreedingProfile = Boolean(selectedEventPet?.breedingProfile)
  const isFemalePet = isFemalePetGender(selectedEventPet?.gender)
  const breedingTypeOptions = useMemo(
    () => ({ isFemale: isFemalePet, petType: selectedEventPet?.type }),
    [isFemalePet, selectedEventPet?.type],
  )

  const categoryOptions = useMemo(
    () =>
      getAvailableCategories(hasBreedingProfile).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [hasBreedingProfile],
  )

  const typeOptions = useMemo(
    () =>
      getEventTypesForCategory(eventForm.category, breedingTypeOptions).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [eventForm.category, breedingTypeOptions],
  )

  const petOptions = useMemo(
    () => pets.map((pet) => ({ value: pet.id, label: pet.name })),
    [pets],
  )

  useEffect(() => {
    if (activeModal !== 'bookVet') return
    if (hasBreedingProfile) return
    if (eventForm.category !== 'breeding') return
    setEventForm((prev) => ({
      ...getDefaultEventForm(prev.petName, 'vet', prev.petId, prev.date),
      reminderEnabled: prev.reminderEnabled,
    }))
  }, [activeModal, hasBreedingProfile, eventForm.category])

  useEffect(() => {
    if (activeModal !== 'bookVet') return
    if (eventForm.category !== 'breeding') return
    const allowed = getEventTypesForCategory('breeding', breedingTypeOptions).some(
      (option) => option.value === eventForm.type,
    )
    if (allowed) return
    const fallback =
      getEventTypesForCategory('breeding', breedingTypeOptions)[0]?.value ?? 'mating'
    applyEventType(fallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal, breedingTypeOptions, eventForm.category, eventForm.type])

  const applyEventType = (type: EventType) => {
    setEventForm((prev) => {
      const isPregnancy = type === 'pregnancy'
      const isHeat = type === 'heat'
      const start = prev.date || todayIsoDate()
      return {
        ...prev,
        type,
        title: type === 'custom' || type.endsWith('_other') ? '' : getDefaultEventTitle(type),
        location: getDefaultEventLocation(type),
        recurrenceFrequency: defaultRecurrenceForType(type),
        expectedBirthDate: isPregnancy ? suggestPregnancyDueDate(start) : '',
        expectedEndDate: isHeat ? suggestHeatEndDate(start) : '',
        actualEndDate: '',
        time: isPregnancy || isHeat ? '' : prev.time || '14:30',
        medicationName: type === 'medication' ? prev.medicationName : '',
        vaccineName: type === 'vaccination' ? prev.vaccineName : '',
        dosage: showsDosage(type) ? prev.dosage : '',
        nextBoosterDate: type === 'vaccination' ? prev.nextBoosterDate : '',
        partnerName: type === 'mating' ? prev.partnerName : '',
        showClass: showsShowClass(type) ? prev.showClass : '',
      }
    })
  }

  const commitSave = (scope: RecurrenceEditScope) => {
    const payload = formToPayload(eventForm)
    if (editingCalendarEventId && editingIsRecurring && editingOccurrenceDate) {
      updateCalendarOccurrence(
        editingCalendarEventId,
        editingOccurrenceDate,
        scope,
        payload,
      )
    } else if (editingCalendarEventId) {
      updateCalendarEvent(editingCalendarEventId, payload)
    } else {
      addCalendarEvent(payload)
    }
  }

  const commitDelete = (scope: RecurrenceEditScope) => {
    if (!editingCalendarEventId) return
    if (editingIsRecurring && editingOccurrenceDate) {
      deleteCalendarOccurrence(editingCalendarEventId, editingOccurrenceDate, scope)
    } else {
      deleteCalendarEvent(editingCalendarEventId)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventForm.date || !eventForm.petName || !eventForm.type) return
    if (
      (eventForm.type === 'custom' || eventForm.type.endsWith('_other')) &&
      !eventForm.title.trim() &&
      !(eventForm.type === 'medication' && eventForm.medicationName.trim())
    ) {
      return
    }
    if (eventForm.type === 'medication' && !eventForm.medicationName.trim() && !eventForm.title.trim()) {
      return
    }
    if (eventForm.type === 'pregnancy' && !eventForm.expectedBirthDate) return
    if (eventForm.type === 'heat' && !eventForm.expectedEndDate) return
    if (
      eventForm.recurrenceFrequency !== 'none' &&
      !eventForm.recurrenceNoEnd &&
      !eventForm.recurrenceEndDate
    ) {
      return
    }

    const allowedTypes = getEventTypesForCategory('breeding', breedingTypeOptions).map(
      (option) => option.value,
    )
    if (eventForm.category === 'breeding' && !allowedTypes.includes(eventForm.type)) {
      return
    }

    if (isEditingEvent && editingIsRecurring && editingOccurrenceDate) {
      setPendingAction('save')
      setScopePromptOpen(true)
      return
    }
    commitSave('series')
  }

  const handleDeleteClick = () => {
    if (!editingCalendarEventId) return
    if (editingIsRecurring && editingOccurrenceDate) {
      setPendingAction('delete')
      setScopePromptOpen(true)
      return
    }
    deleteCalendarEvent(editingCalendarEventId)
  }

  const confirmScope = () => {
    if (pendingAction === 'save') commitSave(editScope)
    if (pendingAction === 'delete') commitDelete(editScope)
    setScopePromptOpen(false)
    setPendingAction(null)
  }

  if (activeModal !== 'bookVet') return null

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <OptionSelect
          id="event-pet"
          label="Mazlíček"
          value={eventForm.petId || selectedEventPet?.id || ''}
          onChange={(petId) => {
            const pet = pets.find((item) => item.id === petId)
            setEventForm((prev) => ({
              ...prev,
              petId,
              petName: pet?.name ?? prev.petName,
            }))
          }}
          options={petOptions.length ? petOptions : [{ value: 'luna', label: 'Luna' }]}
        />

        <OptionSelect
          id="event-category"
          label="Kategorie"
          value={eventForm.category}
          onChange={(categoryValue) => {
            const category = categoryValue as CalendarEventCategory
            const firstType =
              getEventTypesForCategory(category, breedingTypeOptions)[0]?.value ?? 'custom'
            setEventForm((prev) => {
              const start = prev.date || todayIsoDate()
              const isPregnancy = firstType === 'pregnancy'
              const isHeat = firstType === 'heat'
              return {
                ...prev,
                category,
                type: firstType,
                title: getDefaultEventTitle(firstType),
                location: getDefaultEventLocation(firstType),
                recurrenceFrequency: defaultRecurrenceForType(firstType),
                expectedBirthDate: isPregnancy ? suggestPregnancyDueDate(start) : '',
                expectedEndDate: isHeat ? suggestHeatEndDate(start) : '',
                actualEndDate: '',
                time: isPregnancy || isHeat ? '' : prev.time || '14:30',
                medicationName: '',
                vaccineName: '',
                dosage: '',
                nextBoosterDate: '',
                partnerName: '',
                showClass: '',
              }
            })
          }}
          options={categoryOptions}
        />

        <OptionSelect
          id="event-type"
          label="Typ události"
          value={eventForm.type}
          onChange={(typeValue) => applyEventType(typeValue as EventType)}
          options={typeOptions}
          maxListHeightClassName="max-h-64"
        />

        {showsMedicationName(eventForm.type) ? (
          <Input
            id="event-med-name"
            label="Název léku"
            value={eventForm.medicationName}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                medicationName: e.target.value,
                title: e.target.value ? `Lék – ${e.target.value}` : eventForm.title,
              })
            }
            placeholder="např. Glukosamin"
            required
          />
        ) : showsVaccineFields(eventForm.type) ? (
          <Input
            id="event-vaccine"
            label="Název vakcíny"
            value={eventForm.vaccineName}
            onChange={(e) =>
              setEventForm({
                ...eventForm,
                vaccineName: e.target.value,
                title: e.target.value || getDefaultEventTitle('vaccination'),
              })
            }
            placeholder="např. Vzteklina"
          />
        ) : (
          <Input
            id="event-title"
            label="Název události"
            value={eventForm.title}
            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
            placeholder={
              eventForm.type === 'custom' || eventForm.type.endsWith('_other')
                ? 'Napište vlastní název události…'
                : 'např. Kontrola zubů, výstava Brno…'
            }
            required={eventForm.type === 'custom' || eventForm.type.endsWith('_other')}
          />
        )}

        {showsDosage(eventForm.type) && (
          <Input
            id="event-dosage"
            label="Dávkování"
            value={eventForm.dosage}
            onChange={(e) => setEventForm({ ...eventForm, dosage: e.target.value })}
            placeholder="např. 1 tableta s jídlem"
          />
        )}

        {showsPartner(eventForm.type) && (
          <Input
            id="event-partner"
            label="Partner"
            value={eventForm.partnerName}
            onChange={(e) => setEventForm({ ...eventForm, partnerName: e.target.value })}
            placeholder="Jméno partnera / kennel"
          />
        )}

        {showsShowClass(eventForm.type) && (
          <Input
            id="event-class"
            label="Kategorie / třída"
            value={eventForm.showClass}
            onChange={(e) => setEventForm({ ...eventForm, showClass: e.target.value })}
            placeholder="např. Open, Junior…"
          />
        )}

        {eventForm.type === 'pregnancy' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
            <Input
              id="event-pregnancy-start"
              label="Od kdy (pravděpodobný začátek)"
              labelClassName="min-h-[2.5rem] flex items-end leading-snug"
              type="date"
              value={eventForm.date}
              onChange={(e) => {
                const start = e.target.value
                setEventForm((prev) => ({
                  ...prev,
                  date: start,
                  expectedBirthDate: start
                    ? suggestPregnancyDueDate(start)
                    : prev.expectedBirthDate,
                }))
              }}
              required
            />
            <Input
              id="event-pregnancy-due"
              label="Předpokládaný porod"
              labelClassName="min-h-[2.5rem] flex items-end leading-snug"
              type="date"
              value={eventForm.expectedBirthDate}
              onChange={(e) =>
                setEventForm({ ...eventForm, expectedBirthDate: e.target.value })
              }
              required
            />
          </div>
        ) : eventForm.type === 'heat' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start">
              <Input
                id="event-heat-start"
                label="Začátek hárání"
                type="date"
                value={eventForm.date}
                onChange={(e) => {
                  const start = e.target.value
                  setEventForm((prev) => ({
                    ...prev,
                    date: start,
                    expectedEndDate: start ? suggestHeatEndDate(start) : prev.expectedEndDate,
                  }))
                }}
                required
              />
              <Input
                id="event-heat-end"
                label="Odhadovaný konec"
                type="date"
                value={eventForm.expectedEndDate}
                onChange={(e) =>
                  setEventForm({ ...eventForm, expectedEndDate: e.target.value })
                }
                required
              />
            </div>
            <Input
              id="event-heat-actual"
              label="Skutečný konec (volitelně)"
              type="date"
              value={eventForm.actualEndDate}
              onChange={(e) => setEventForm({ ...eventForm, actualEndDate: e.target.value })}
            />
            <p className="text-[11px] text-[#7D8B82] leading-relaxed">{HEAT_DURATION_HINT}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="event-date"
              label="Datum"
              type="date"
              value={eventForm.date}
              onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
              required
            />
            <Input
              id="event-time"
              label="Čas"
              type="time"
              value={eventForm.time}
              onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
            />
          </div>
        )}

        {showsVaccineFields(eventForm.type) && (
          <Input
            id="event-booster"
            label="Další přeočkování (volitelně)"
            type="date"
            value={eventForm.nextBoosterDate}
            onChange={(e) => setEventForm({ ...eventForm, nextBoosterDate: e.target.value })}
          />
        )}

        {showsLocation(eventForm.type) && (
          <Input
            id="event-location"
            label={getLocationFieldLabel(eventForm.type)}
            value={eventForm.location}
            onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            placeholder="např. Doma, klinika, výstaviště…"
          />
        )}

        <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5]/80 p-3.5 space-y-3">
          <OptionSelect
            id="event-recurrence"
            label="Opakování"
            value={eventForm.recurrenceFrequency}
            onChange={(value) =>
              setEventForm({
                ...eventForm,
                recurrenceFrequency: value as RecurrenceFrequency,
                recurrenceNoEnd:
                  value === 'none' ? true : eventForm.recurrenceNoEnd,
              })
            }
            options={[
              { value: 'none', label: 'Neopakovat' },
              { value: 'daily', label: 'Denně' },
              { value: 'weekly', label: 'Každý týden' },
              { value: 'monthly', label: 'Každý měsíc' },
              { value: 'yearly', label: 'Každý rok' },
              { value: 'custom', label: 'Vlastní' },
            ]}
          />

          {eventForm.recurrenceFrequency !== 'none' && (
            <>
              {(eventForm.recurrenceFrequency === 'custom' ||
                eventForm.recurrenceFrequency === 'daily' ||
                eventForm.recurrenceFrequency === 'weekly' ||
                eventForm.recurrenceFrequency === 'monthly') && (
                <Input
                  id="event-interval"
                  label={
                    eventForm.recurrenceFrequency === 'custom'
                      ? 'Každý X. den'
                      : eventForm.recurrenceFrequency === 'weekly'
                        ? 'Každý X. týden'
                        : eventForm.recurrenceFrequency === 'monthly'
                          ? 'Každý X. měsíc'
                          : 'Interval (dny)'
                  }
                  type="number"
                  min={1}
                  value={eventForm.recurrenceInterval}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, recurrenceInterval: e.target.value })
                  }
                />
              )}

              {eventForm.recurrenceFrequency === 'weekly' && (
                <div>
                  <p className="text-xs font-semibold tracking-wide uppercase text-[#4A564F] mb-2">
                    Dny v týdnu
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const active = eventForm.recurrenceWeekDays.includes(day.value)
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            setEventForm((prev) => ({
                              ...prev,
                              recurrenceWeekDays: active
                                ? prev.recurrenceWeekDays.filter((d) => d !== day.value)
                                : [...prev.recurrenceWeekDays, day.value].sort(
                                    (a, b) => a - b,
                                  ),
                            }))
                          }
                          className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#2C4A3E] text-white border-[#2C4A3E]'
                              : 'bg-white text-[#4A564F] border-[#E8E4DC] hover:border-[#D1E0D8]'
                          }`}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-[#191E1B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.recurrenceNoEnd}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      recurrenceNoEnd: e.target.checked,
                      recurrenceEndDate: e.target.checked ? '' : eventForm.recurrenceEndDate,
                    })
                  }
                  className="h-4 w-4 rounded border-[#D1E0D8] text-[#2C4A3E] focus:ring-[#2C4A3E]/30 cursor-pointer"
                />
                Bez data ukončení
              </label>

              {!eventForm.recurrenceNoEnd && (
                <Input
                  id="event-recurrence-end"
                  label="Datum ukončení"
                  type="date"
                  value={eventForm.recurrenceEndDate}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, recurrenceEndDate: e.target.value })
                  }
                  required
                />
              )}
            </>
          )}
        </div>

        {eventSupportsReminder(eventForm.type) && (
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5]/80 px-3.5 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={eventForm.reminderEnabled}
                onChange={(e) =>
                  setEventForm({ ...eventForm, reminderEnabled: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-[#D1E0D8] text-[#2C4A3E] focus:ring-[#2C4A3E]/30 cursor-pointer"
              />
              <span>
                <span className="block text-sm font-medium text-[#191E1B]">
                  Nastavit připomínku
                </span>
                <span className="block text-[11px] text-[#7D8B82] mt-0.5 leading-relaxed">
                  U opakovaných událostí platí připomínka pro každý výskyt.
                </span>
              </span>
            </label>

            {eventForm.reminderEnabled && (
              <>
                <OptionSelect
                  id="event-reminder-offset"
                  label="Připomenout"
                  value={eventForm.reminderOffset}
                  onChange={(value) =>
                    setEventForm({
                      ...eventForm,
                      reminderOffset: value as ReminderOffset,
                    })
                  }
                  options={REMINDER_OFFSET_OPTIONS}
                />
                {eventForm.reminderOffset === 'custom' && (
                  <Input
                    id="event-reminder-custom"
                    label="Minut předem"
                    type="number"
                    min={1}
                    value={eventForm.reminderCustomMinutes}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        reminderCustomMinutes: e.target.value,
                      })
                    }
                  />
                )}
              </>
            )}
          </div>
        )}

        <Textarea
          id="event-notes"
          label="Poznámky"
          placeholder="např. dávkování, důvod návštěvy, co vzít s sebou…"
          value={eventForm.notes}
          onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
        />

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-[#F0EDE6]">
          {isEditingEvent && editingCalendarEventId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={handleDeleteClick}
            >
              Smazat událost
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2.5 ml-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal(null)}
            >
              Zrušit
            </Button>
            <Button type="submit" variant="gold" size="sm">
              {isEditingEvent ? 'Uložit změny' : 'Přidat do kalendáře'}
            </Button>
          </div>
        </div>
      </form>

      {scopePromptOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E8E4DC] bg-white p-5 shadow-lg">
            <h3 className="text-base font-bold text-[#191E1B]">Co chcete změnit?</h3>
            <p className="mt-1 text-xs text-[#7D8B82]">
              Tato událost je součástí opakované série.
            </p>
            <div className="mt-4 space-y-2">
              {(Object.keys(RECURRENCE_SCOPE_LABELS) as RecurrenceEditScope[]).map(
                (scope) => (
                  <label
                    key={scope}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      editScope === scope
                        ? 'border-[#2C4A3E] bg-[#EBF2EE] text-[#2C4A3E]'
                        : 'border-[#E8E4DC] text-[#191E1B] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recurrence-scope"
                      checked={editScope === scope}
                      onChange={() => setEditScope(scope)}
                      className="text-[#2C4A3E] focus:ring-[#2C4A3E]/30"
                    />
                    {RECURRENCE_SCOPE_LABELS[scope]}
                  </label>
                ),
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setScopePromptOpen(false)
                  setPendingAction(null)
                }}
              >
                Zrušit
              </Button>
              <Button type="button" variant="gold" size="sm" onClick={confirmScope}>
                Potvrdit
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
