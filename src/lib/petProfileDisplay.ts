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

export function formatOptionalAge(age?: number | null): string {
  if (age == null || age <= 0) return EMPTY_PROFILE_LABEL
  const stage = age >= 7 ? 'Starší' : 'Dospělý'
  return `${age} let (${stage})`
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
