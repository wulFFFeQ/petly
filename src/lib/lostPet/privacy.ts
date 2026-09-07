import type { ApproxLocation } from '../../types/lostPet'
import { reverseGeocodeLabel } from '../geolocation'

/** Round coordinates to ~3 decimal places (~100 m). */
export function roundPublicCoords(lat: number, lng: number): { publicLat: number; publicLng: number } {
  return {
    publicLat: Math.round(lat * 1000) / 1000,
    publicLng: Math.round(lng * 1000) / 1000,
  }
}

/**
 * Strip house numbers and overly precise street addresses from a label.
 * Keeps city / district style labels for public display.
 */
export function toSafePublicLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return 'Přibližná lokalita'

  // Remove patterns like "12", "12a", "12/3" after street-like segments.
  const withoutNumber = trimmed
    .replace(/\b\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*,\s*,/g, ',')
    .replace(/^,\s*|,\s*$/g, '')
    .trim()

  const parts = withoutNumber
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return 'Přibližná lokalita'
  if (parts.length === 1) return parts[0]

  // Prefer "City – District" or last two meaningful parts.
  const city = parts[parts.length - 1]
  const area = parts[0]
  if (area.toLowerCase() === city.toLowerCase()) return city
  return `${city} – ${area}`
}

export async function buildApproxLocation(
  lat: number,
  lng: number,
  privateLabel?: string,
): Promise<ApproxLocation> {
  const { publicLat, publicLng } = roundPublicCoords(lat, lng)
  let resolvedLabel = privateLabel?.trim()
  if (!resolvedLabel) {
    try {
      resolvedLabel = await reverseGeocodeLabel(lat, lng)
    } catch {
      resolvedLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  return {
    publicLabel: toSafePublicLabel(resolvedLabel),
    privateLabel: resolvedLabel,
    lat,
    lng,
    publicLat,
    publicLng,
  }
}

export function buildApproxLocationSync(
  lat: number,
  lng: number,
  privateLabel: string,
): ApproxLocation {
  const { publicLat, publicLng } = roundPublicCoords(lat, lng)
  return {
    publicLabel: toSafePublicLabel(privateLabel),
    privateLabel,
    lat,
    lng,
    publicLat,
    publicLng,
  }
}
