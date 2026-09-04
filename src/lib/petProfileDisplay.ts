import type { HealthStatus } from '../types'
import { healthStatusLabel } from '../data/mockData'
import { isFemalePetGender } from './petTypes'

export const EMPTY_PROFILE_LABEL = 'Zatím nevyplněno'

export function formatOptionalText(value?: string | null): string {
  if (value == null || value.trim() === '') return EMPTY_PROFILE_LABEL
  return value
}

export function formatOptionalWeight(weight?: number | null): string {
  if (weight == null || weight <= 0) return EMPTY_PROFILE_LABEL
  return `${String(weight).replace('.', ',')} kg`
}

function czechYearsLabel(years: number): string {
  if (years === 1) return '1 rok'
  if (years >= 2 && years <= 4) return `${years} roky`
  return `${years} let`
}

function czechMonthsLabel(months: number): string {
  if (months === 1) return '1 měsíc'
  if (months >= 2 && months <= 4) return `${months} měsíce`
  return `${months} měsíců`
}

export function formatOptionalAge(
  age?: number | null,
  ageMonths?: number | null,
): string {
  const years = age != null && age >= 0 ? Math.floor(age) : null
  const months =
    ageMonths != null && ageMonths > 0 ? Math.min(11, Math.floor(ageMonths)) : 0

  if (years == null && months <= 0) return EMPTY_PROFILE_LABEL
  if ((years ?? 0) <= 0 && months <= 0) return EMPTY_PROFILE_LABEL

  const y = years ?? 0
  const totalMonths = y * 12 + months
  const stage = totalMonths < 12 ? 'Mláďě' : y >= 7 ? 'Starší' : 'Dospělý'

  if (y <= 0) return `${czechMonthsLabel(months)} (${stage})`
  if (months <= 0) return `${czechYearsLabel(y)} (${stage})`
  return `${czechYearsLabel(y)} ${czechMonthsLabel(months)} (${stage})`
}

export function formatNeuteredStatus(
  neutered?: boolean,
  gender?: string | null,
): string {
  if (neutered == null) return EMPTY_PROFILE_LABEL
  const female = isFemalePetGender(gender ?? undefined)
  if (neutered) return female ? 'Kastrovaná' : 'Kastrovaný'
  return female ? 'Nekastrovaná' : 'Nekastrovaný'
}

export function formatHealthStatus(status?: HealthStatus): string {
  if (!status) return EMPTY_PROFILE_LABEL
  return healthStatusLabel[status] ?? EMPTY_PROFILE_LABEL
}

export function hasMicrochip(microchip?: string): boolean {
  return microchip != null && microchip.trim() !== ''
}

export function isEmptyProfileField(value?: string | number | boolean | null): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return value <= 0
  return false
}
