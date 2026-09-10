import type { DiscoverPet } from '../types'
import { isPetNearby } from './discover/distance'
import { getUserHomeCity } from './userProfile'

export type DiscoverSpecies = 'all' | 'dog' | 'cat'

export type DiscoverLocationRadiusKm = 10 | 20 | 30 | 40 | 50

export interface DiscoverLocationAnchor {
  name: string
  latitude: number
  longitude: number
}

export interface DiscoverCriteria {
  species: DiscoverSpecies
  /** Prefer pets in Kolín / Kutná Hora (local network). */
  nearby: boolean
  popular: boolean
  verified: boolean
  breeding: boolean
  /** Selected cities / places (empty = any). */
  locations: string[]
  /** Coordinates for selected places (and known cities). */
  locationAnchors: DiscoverLocationAnchor[]
  /**
   * Radius around selected place(s).
   * null = only exact city match (no surrounding area).
   */
  locationRadiusKm: DiscoverLocationRadiusKm | null
  /** Activity keys the pet should enjoy (level ≥ 4). */
  activities: string[]
  /** Keywords matched against lookingFor / bio / likes (case-insensitive). */
  seeking: string[]
  /**
   * Structured pet-buddy activity IDs (connectionPreferences.lookingFor).
   * Separate from free-text `seeking`.
   */
  connectionActivities: string[]
}

export const DEFAULT_DISCOVER_CRITERIA: DiscoverCriteria = {
  species: 'all',
  nearby: false,
  popular: false,
  verified: false,
  breeding: false,
  locations: [],
  locationAnchors: [],
  locationRadiusKm: null,
  activities: [],
  seeking: [],
  connectionActivities: [],
}

/**
 * @deprecated Nearby filtering uses home-city radius (`isPetNearby`), not this whitelist.
 * Kept for any legacy references / docs.
 */
export const NEARBY_LOCATIONS = ['Kolín', 'Kutná Hora'] as const

/** Approximate city centers for mock pets + common CZ towns. */
export const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Kolín: { latitude: 50.0281, longitude: 15.2006 },
  Praha: { latitude: 50.0755, longitude: 14.4378 },
  'Kutná Hora': { latitude: 49.9484, longitude: 15.2682 },
  Karviná: { latitude: 49.854, longitude: 18.5419 },
  Brno: { latitude: 49.1951, longitude: 16.6068 },
  Ostrava: { latitude: 49.8209, longitude: 18.2625 },
  Plzeň: { latitude: 49.7475, longitude: 13.3776 },
  Liberci: { latitude: 50.7663, longitude: 15.0543 },
  Liberec: { latitude: 50.7663, longitude: 15.0543 },
  Olomouc: { latitude: 49.5938, longitude: 17.2509 },
  Pardubice: { latitude: 50.0343, longitude: 15.7812 },
  Hradec: { latitude: 50.2104, longitude: 15.8252 },
  'Hradec Králové': { latitude: 50.2104, longitude: 15.8252 },
}

export const DISCOVER_ACTIVITY_FILTERS: { key: string; label: string }[] = [
  { key: 'walks', label: 'Procházky' },
  { key: 'play', label: 'Hraní' },
  { key: 'trips', label: 'Výlety' },
  { key: 'water', label: 'Voda / plavání' },
  { key: 'dogs', label: 'Kontakt se psy' },
  { key: 'cats', label: 'Kontakt s kočkami' },
  { key: 'training', label: 'Trénink' },
  { key: 'home', label: 'Odpočinek doma' },
]

export const DISCOVER_SEEKING_FILTERS: { id: string; label: string; match: string[] }[] = [
  {
    id: 'walks',
    label: 'Parťáka na procházky',
    match: ['procház', 'parťák', 'partner'],
  },
  {
    id: 'play',
    label: 'Kamaráda na hraní',
    match: ['hran', 'kamarád', 'společn'],
  },
  {
    id: 'trips',
    label: 'Parťáka na výlety',
    match: ['výlet', 'cest'],
  },
  {
    id: 'water',
    label: 'Společnost u vody',
    match: ['plav', 'vod', 'jezer'],
  },
  {
    id: 'training',
    label: 'Tréninkového partnera',
    match: ['trénink', 'agility'],
  },
  {
    id: 'cats',
    label: 'Setkání s kočkami',
    match: ['kočk'],
  },
]

export const DISCOVER_RADIUS_OPTIONS: {
  value: DiscoverLocationRadiusKm | null
  label: string
}[] = [
  { value: null, label: 'Jen město' },
  { value: 10, label: '+10 km' },
  { value: 20, label: '+20 km' },
  { value: 30, label: '+30 km' },
  { value: 40, label: '+40 km' },
  { value: 50, label: '+50 km' },
]

export function coordsForCityName(
  city: string,
): { latitude: number; longitude: number } | null {
  const trimmed = city.trim()
  if (!trimmed) return null
  const direct = CITY_COORDINATES[trimmed]
  if (direct) return direct
  const key = Object.keys(CITY_COORDINATES).find(
    (name) => name.toLowerCase() === trimmed.toLowerCase(),
  )
  return key ? CITY_COORDINATES[key] : null
}

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthKm = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function countActiveDiscoverCriteria(criteria: DiscoverCriteria): number {
  let count = 0
  if (criteria.species !== 'all') count += 1
  if (criteria.nearby) count += 1
  if (criteria.popular) count += 1
  if (criteria.verified) count += 1
  if (criteria.breeding) count += 1
  if (criteria.locations.length > 0) count += 1
  if (criteria.locationRadiusKm != null) count += 1
  if (criteria.activities.length > 0) count += 1
  if (criteria.seeking.length > 0) count += 1
  if (criteria.connectionActivities.length > 0) count += 1
  return count
}

function petMatchesConnectionActivities(
  pet: DiscoverPet,
  activityIds: string[],
): boolean {
  if (activityIds.length === 0) return true
  const prefs = pet.connectionPreferences
  if (!prefs?.lookingFor?.length) return false
  const offered = new Set<string>([
    ...prefs.lookingFor,
    ...(prefs.activityTypes ?? []),
  ])
  return activityIds.some((id) => offered.has(id))
}

function petMatchesSeeking(pet: DiscoverPet, seekingIds: string[]): boolean {
  if (seekingIds.length === 0) return true
  const haystack = [
    pet.lookingFor,
    pet.bio,
    ...(pet.likes ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return seekingIds.some((id) => {
    const preset = DISCOVER_SEEKING_FILTERS.find((item) => item.id === id)
    if (!preset) return false
    return preset.match.some((token) => haystack.includes(token))
  })
}

function petEnjoysActivity(pet: DiscoverPet, activityKey: string): boolean {
  const entry = pet.activities?.find((item) => item.key === activityKey)
  return Boolean(entry && entry.level >= 4)
}

function resolveAnchors(criteria: DiscoverCriteria): DiscoverLocationAnchor[] {
  if (criteria.locationAnchors.length > 0) {
    return criteria.locationAnchors
  }

  const fromNames = criteria.locations
    .map((name) => {
      const coords = coordsForCityName(name)
      return coords ? { name, ...coords } : null
    })
    .filter((item): item is DiscoverLocationAnchor => item != null)

  if (fromNames.length > 0) return fromNames

  // Radius without an explicit city → use user's home city.
  if (criteria.locationRadiusKm != null) {
    const home = getUserHomeCity()
    const coords = coordsForCityName(home)
    if (coords) return [{ name: home, ...coords }]
  }

  return []
}

function petMatchesLocationFilter(pet: DiscoverPet, criteria: DiscoverCriteria): boolean {
  const radius = criteria.locationRadiusKm
  const hasCities = criteria.locations.length > 0

  if (!hasCities && radius == null) return true

  // Exact city only (no radius expansion).
  if (hasCities && radius == null) {
    return criteria.locations.some((city) => locationMatchesCity(pet.location, city))
  }

  const anchors = resolveAnchors(criteria)
  if (anchors.length === 0) {
    // Fallback: string match if we lack coordinates.
    if (!hasCities) return true
    return criteria.locations.some((city) => locationMatchesCity(pet.location, city))
  }

  const petCoords = coordsForCityName(pet.location)
  if (!petCoords) {
    // Unknown pet city: keep if name matches a selected city.
    return criteria.locations.some((city) => locationMatchesCity(pet.location, city))
  }

  const limit = radius ?? 0
  return anchors.some((anchor) => haversineKm(anchor, petCoords) <= limit + 0.05)
}

export function petMatchesDiscoverCriteria(
  pet: DiscoverPet,
  criteria: DiscoverCriteria,
  search: string,
): boolean {
  const q = search.trim().toLowerCase()
  if (q) {
    const searchable = [
      pet.name,
      pet.breed,
      pet.location,
      pet.ownerName,
      pet.bio,
      pet.personality,
      pet.lookingFor,
      ...(pet.likes ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!searchable.includes(q)) return false
  }

  if (criteria.species === 'dog' && pet.type !== 'dog') return false
  if (criteria.species === 'cat' && pet.type !== 'cat') return false
  if (criteria.nearby && !isPetNearby(pet.location)) {
    return false
  }
  if (criteria.popular && !pet.popular) return false
  if (criteria.verified && !(pet.publicTrustBadges && pet.publicTrustBadges.length > 0)) {
    return false
  }
  if (criteria.breeding && !pet.breedingProfile) return false

  if (!petMatchesLocationFilter(pet, criteria)) return false

  if (criteria.activities.length > 0) {
    const matchesAll = criteria.activities.every((key) => petEnjoysActivity(pet, key))
    if (!matchesAll) return false
  }

  if (!petMatchesSeeking(pet, criteria.seeking)) return false
  if (!petMatchesConnectionActivities(pet, criteria.connectionActivities)) return false

  return true
}

export function toggleListValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function upsertLocationAnchor(
  anchors: DiscoverLocationAnchor[],
  next: DiscoverLocationAnchor,
): DiscoverLocationAnchor[] {
  const without = anchors.filter(
    (item) => item.name.toLowerCase() !== next.name.toLowerCase(),
  )
  return [...without, next]
}

export function removeLocationAnchor(
  anchors: DiscoverLocationAnchor[],
  name: string,
): DiscoverLocationAnchor[] {
  return anchors.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
}

function locationMatchesCity(petLocation: string, city: string): boolean {
  const place = petLocation.trim().toLowerCase()
  const target = city.trim().toLowerCase()
  if (!place || !target) return false
  return place === target || place.includes(target) || target.includes(place)
}
