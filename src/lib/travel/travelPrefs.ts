import type { TravelPrefs, TravelRequirementCheck } from '../../types'

export const TRAVEL_PREFS_STORAGE_KEY = 'lovedandknown.travelPrefs'

export function confirmationKey(
  petId: string,
  destinationId: string,
  check: TravelRequirementCheck,
): string {
  return `${petId}:${destinationId}:${check}`
}

export function normalizeTravelPrefs(raw: unknown): TravelPrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { confirmations: {} }
  }
  const item = raw as Record<string, unknown>
  const confirmations: Record<string, string> = {}
  if (item.confirmations && typeof item.confirmations === 'object' && !Array.isArray(item.confirmations)) {
    for (const [key, value] of Object.entries(item.confirmations as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) confirmations[key] = value.trim()
    }
  }
  return {
    lastPetId: typeof item.lastPetId === 'string' ? item.lastPetId : undefined,
    lastDestinationId: typeof item.lastDestinationId === 'string' ? item.lastDestinationId : undefined,
    confirmations,
  }
}

export function loadTravelPrefs(): TravelPrefs {
  if (typeof window === 'undefined') return { confirmations: {} }
  try {
    const raw = window.localStorage.getItem(TRAVEL_PREFS_STORAGE_KEY)
    if (!raw) return { confirmations: {} }
    return normalizeTravelPrefs(JSON.parse(raw))
  } catch {
    return { confirmations: {} }
  }
}

export function saveTravelPrefs(prefs: TravelPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TRAVEL_PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore quota */
  }
}
