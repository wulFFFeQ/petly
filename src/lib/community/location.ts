import { roundPublicCoords, toSafePublicLabel } from '../lostPet/privacy'

/** Public-safe location fields for a community post (no house numbers; rounded coords). */
export function toCommunityPublicLocation(
  label: string,
  latitude?: number,
  longitude?: number,
): {
  location: string
  locationLat?: number
  locationLng?: number
} {
  const location = toSafePublicLabel(label)
  if (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const { publicLat, publicLng } = roundPublicCoords(latitude, longitude)
    return { location, locationLat: publicLat, locationLng: publicLng }
  }
  return { location }
}
