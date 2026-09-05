export type GeolocationErrorCode =
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'lookup_failed'

export class GeolocationRequestError extends Error {
  code: GeolocationErrorCode

  constructor(code: GeolocationErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'GeolocationRequestError'
    this.code = code
  }
}

export interface ResolvedLocation {
  label: string
  latitude: number
  longitude: number
}

export interface PlaceSuggestion {
  id: string
  label: string
  latitude: number
  longitude: number
}

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    street?: string
    housenumber?: string
    city?: string
    locality?: string
    district?: string
    county?: string
    state?: string
    country?: string
    type?: string
  }
}

interface PhotonSearchResponse {
  features?: PhotonFeature[]
}

function buildPlaceLabel(properties: NonNullable<PhotonFeature['properties']>): string | null {
  const name = properties.name?.trim()
  const street = [properties.street?.trim(), properties.housenumber?.trim()]
    .filter(Boolean)
    .join(' ')
  const primary = name || street
  if (!primary) return null

  const city =
    properties.city?.trim() ||
    properties.locality?.trim() ||
    properties.district?.trim() ||
    properties.county?.trim()
  const region = properties.state?.trim()

  const parts = [primary]
  if (city && city !== primary) parts.push(city)
  else if (region && region !== primary) parts.push(region)

  return parts.join(', ')
}

interface ReverseGeocodeResponse {
  locality?: string
  city?: string
  principalSubdivision?: string
  countryName?: string
  localityInfo?: {
    informative?: Array<{ name?: string; description?: string }>
  }
}

function formatLocationLabel(data: ReverseGeocodeResponse, latitude: number, longitude: number): string {
  const city = data.city?.trim() || data.locality?.trim()
  const region = data.principalSubdivision?.trim()
  const country = data.countryName?.trim()

  const parkHint = data.localityInfo?.informative?.find((item) => {
    const description = item.description?.toLowerCase() ?? ''
    const name = item.name?.toLowerCase() ?? ''
    return (
      description.includes('park') ||
      name.includes('park') ||
      description.includes('dog') ||
      name.includes('psí')
    )
  })?.name?.trim()

  if (parkHint && city) return `${parkHint}, ${city}`
  if (parkHint) return parkHint
  if (city && region && city !== region) return `${city}, ${region}`
  if (city) return city
  if (region) return region
  if (country) return country

  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
}

export function getCurrentPositionCoords(): Promise<GeolocationCoordinates> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new GeolocationRequestError('unsupported'))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new GeolocationRequestError('permission_denied'))
          return
        }
        if (error.code === error.TIMEOUT) {
          reject(new GeolocationRequestError('timeout'))
          return
        }
        reject(new GeolocationRequestError('position_unavailable'))
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      },
    )
  })
}

export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
): Promise<string> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('localityLanguage', 'cs')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new GeolocationRequestError('lookup_failed')
  }

  const data = (await response.json()) as ReverseGeocodeResponse
  return formatLocationLabel(data, latitude, longitude)
}

export async function resolveCurrentLocation(): Promise<ResolvedLocation> {
  const coords = await getCurrentPositionCoords()
  const { latitude, longitude } = coords

  try {
    const label = await reverseGeocodeLabel(latitude, longitude)
    return { label, latitude, longitude }
  } catch {
    return {
      label: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
    }
  }
}

/** Search real places via Photon (OpenStreetMap). Returns only existing map matches. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('lang', 'cs')
  url.searchParams.set('limit', '6')
  // Bias results toward Czechia without blocking nearby border places entirely.
  url.searchParams.set('lat', '49.8')
  url.searchParams.set('lon', '15.5')

  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new GeolocationRequestError('lookup_failed')
  }

  const data = (await response.json()) as PhotonSearchResponse
  const seen = new Set<string>()
  const suggestions: PlaceSuggestion[] = []

  for (const feature of data.features ?? []) {
    const coords = feature.geometry?.coordinates
    const properties = feature.properties
    if (!coords || !properties) continue

    const [longitude, latitude] = coords
    const label = buildPlaceLabel(properties)
    if (!label) continue

    const id =
      properties.osm_type && properties.osm_id != null
        ? `${properties.osm_type}:${properties.osm_id}`
        : `${label}:${latitude}:${longitude}`

    if (seen.has(id) || seen.has(label)) continue
    seen.add(id)
    seen.add(label)

    suggestions.push({ id, label, latitude, longitude })
  }

  return suggestions
}

export function geolocationErrorMessage(code: GeolocationErrorCode): {
  title: string
  description: string
} {
  switch (code) {
    case 'unsupported':
      return {
        title: 'Poloha není dostupná',
        description: 'Tento prohlížeč nepodporuje zjištění aktuální polohy.',
      }
    case 'permission_denied':
      return {
        title: 'Přístup k poloze zamítnut',
        description: 'Povolte přístup k poloze v nastavení prohlížeče a zkuste to znovu.',
      }
    case 'timeout':
      return {
        title: 'Načítání polohy vypršelo',
        description: 'Zkuste to prosím znovu na místě s lepším signálem.',
      }
    case 'lookup_failed':
      return {
        title: 'Lokalitu se nepodařilo určit',
        description: 'Polohu jsme získali, ale název místa se nepodařilo načíst.',
      }
    default:
      return {
        title: 'Polohu se nepodařilo zjistit',
        description: 'Zkuste to prosím znovu za chvíli.',
      }
  }
}
