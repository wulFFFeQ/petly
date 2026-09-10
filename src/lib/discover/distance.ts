import {
  coordsForCityName,
  haversineKm,
} from '../discoverCriteria'
import { getUserHomeCity } from '../userProfile'

/** Default radius for the „V okolí“ chip (city-center mock geo). */
export const NEARBY_RADIUS_KM = 30

/**
 * Distance between two named cities using known city-center coordinates.
 * Returns null when either city lacks coordinates (ready for real GPS later).
 */
export function distanceKmBetweenCities(
  fromCity: string,
  toCity: string,
): number | null {
  const from = coordsForCityName(fromCity)
  const to = coordsForCityName(toCity)
  if (!from || !to) return null
  return haversineKm(from, to)
}

/** Distance from the signed-in user's home city to a pet's public city. */
export function distanceKmFromHome(petLocation: string): number | null {
  return distanceKmBetweenCities(getUserHomeCity(), petLocation)
}

/** Czech-style display: „1,4 km“, „12 km“. Never returns a street address. */
export function formatDiscoverDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return ''
  if (km < 10) {
    const rounded = Math.round(km * 10) / 10
    return `${String(rounded).replace('.', ',')} km`
  }
  return `${Math.round(km)} km`
}

export function formatDiscoverDistance(petLocation: string): string | undefined {
  const km = distanceKmFromHome(petLocation)
  if (km == null) return undefined
  const label = formatDiscoverDistanceKm(km)
  return label || undefined
}

/** True when pet's city center is within NEARBY_RADIUS_KM of home city. */
export function isPetNearby(petLocation: string, radiusKm = NEARBY_RADIUS_KM): boolean {
  const km = distanceKmFromHome(petLocation)
  if (km == null) return false
  return km <= radiusKm + 0.05
}
