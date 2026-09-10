import type { CalendarEvent, Pet } from '../types'
import {
  getDefaultEventLocation,
  getDefaultEventTitle,
  getHeatPeriodEndDate,
  suggestHeatEndDate,
} from './calendarEventTypes'
import { APP_TODAY } from './dashboardDates'
import { isDogType, isFemalePetGender } from './petTypes'
import { todayIsoDate } from './petProfileUtils'

/** Confirmed castration / neuter status. Unknown (`undefined`) is not treated as neutered. */
export function isPetNeutered(pet: Pick<Pet, 'neutered'>): boolean {
  return pet.neutered === true
}

/**
 * Breeding profile is available only for animals that are not neutered.
 * Intact (`neutered === false`) and unknown status may enable it; neutered must not.
 */
export function canHaveBreedingProfile(pet: Pick<Pet, 'neutered'>): boolean {
  return !isPetNeutered(pet)
}

/** Effective breeding profile flag after applying eligibility rules. */
export function hasActiveBreedingProfile(
  pet: Pick<Pet, 'neutered' | 'breedingProfile'>,
): boolean {
  return Boolean(pet.breedingProfile) && canHaveBreedingProfile(pet)
}

/**
 * Auto “Hárání” only for an intact female dog with an active breeding profile.
 */
export function canAutoGenerateHeat(
  pet: Pick<Pet, 'type' | 'gender' | 'neutered' | 'breedingProfile'>,
): boolean {
  return (
    hasActiveBreedingProfile(pet) &&
    isDogType(pet.type) &&
    isFemalePetGender(pet.gender) &&
    !isPetNeutered(pet)
  )
}

function eventBelongsToPet(
  event: Pick<CalendarEvent, 'petId' | 'petName'>,
  pet: Pick<Pet, 'id' | 'name'>,
): boolean {
  if (event.petId && event.petId === pet.id) return true
  return event.petName === pet.name
}

/** Open / ongoing heat: no actual end, and period end is today or in the future. */
export function isActiveHeatEvent(
  event: Pick<CalendarEvent, 'type' | 'date' | 'expectedEndDate' | 'actualEndDate'>,
  today = APP_TODAY,
): boolean {
  if (event.type !== 'heat') return false
  if (event.actualEndDate) return false
  const endIso = getHeatPeriodEndDate(event)
  const end = new Date(`${endIso}T12:00:00`)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return end.getTime() >= startOfToday.getTime()
}

export function hasActiveHeatForPet(
  events: CalendarEvent[],
  pet: Pick<Pet, 'id' | 'name'>,
): boolean {
  return events.some(
    (event) => event.type === 'heat' && eventBelongsToPet(event, pet) && isActiveHeatEvent(event),
  )
}

export function buildAutoHeatEvent(
  pet: Pick<Pet, 'id' | 'name'>,
  startIso = todayIsoDate(),
): Omit<CalendarEvent, 'id'> {
  return {
    title: getDefaultEventTitle('heat'),
    petName: pet.name,
    petId: pet.id,
    type: 'heat',
    date: startIso,
    location: getDefaultEventLocation('heat'),
    expectedEndDate: suggestHeatEndDate(startIso),
  }
}

/**
 * Normalize pet updates so neutered animals never keep/activate a breeding profile.
 * Returns the pet after applying `updates` plus breeding eligibility rules.
 */
export function applyBreedingProfileRules(
  pet: Pet,
  updates: Partial<Pet>,
): { next: Pet; breedingJustEnabled: boolean } {
  const next: Pet = { ...pet, ...updates }

  if ('neutered' in updates && updates.neutered === undefined) {
    delete next.neutered
  }

  if (isPetNeutered(next)) {
    next.breedingProfile = false
  } else if ('breedingProfile' in updates) {
    next.breedingProfile = Boolean(updates.breedingProfile)
  }

  if (!canHaveBreedingProfile(next)) {
    next.breedingProfile = false
  }

  const wasActive = hasActiveBreedingProfile(pet)
  const isActive = hasActiveBreedingProfile(next)
  const breedingJustEnabled = isActive && !wasActive

  return { next, breedingJustEnabled }
}

/** Correct stored / seed pets that incorrectly have breeding profile while neutered. */
export function sanitizePetBreedingProfile<T extends Pet>(pet: T): T {
  if (!isPetNeutered(pet) || !pet.breedingProfile) return pet
  return { ...pet, breedingProfile: false }
}
