import type { DiscoverPet } from '../types'

export type DiscoverSpecies = 'all' | 'dog' | 'cat'

export interface DiscoverCriteria {
  species: DiscoverSpecies
  /** Prefer pets in Kolín / Kutná Hora (local network). */
  nearby: boolean
  popular: boolean
  verified: boolean
  breeding: boolean
  /** Empty = any location. */
  locations: string[]
  /** Activity keys the pet should enjoy (level ≥ 4). */
  activities: string[]
  /** Keywords matched against lookingFor / bio / likes (case-insensitive). */
  seeking: string[]
  /** Max distance in km when pet.distance is set; null = no limit. */
  maxDistanceKm: number | null
}

export const DEFAULT_DISCOVER_CRITERIA: DiscoverCriteria = {
  species: 'all',
  nearby: false,
  popular: false,
  verified: false,
  breeding: false,
  locations: [],
  activities: [],
  seeking: [],
  maxDistanceKm: null,
}

export const DISCOVER_LOCATIONS = ['Kolín', 'Praha', 'Kutná Hora'] as const

export const NEARBY_LOCATIONS = ['Kolín', 'Kutná Hora'] as const

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

export const DISCOVER_DISTANCE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Bez limitu' },
  { value: 3, label: 'Do 3 km' },
  { value: 5, label: 'Do 5 km' },
  { value: 10, label: 'Do 10 km' },
]

export function parseDistanceKm(distance?: string): number | null {
  if (!distance) return null
  const normalized = distance.replace(',', '.')
  const match = normalized.match(/([\d.]+)\s*km/i)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

export function countActiveDiscoverCriteria(criteria: DiscoverCriteria): number {
  let count = 0
  if (criteria.species !== 'all') count += 1
  if (criteria.nearby) count += 1
  if (criteria.popular) count += 1
  if (criteria.verified) count += 1
  if (criteria.breeding) count += 1
  if (criteria.locations.length > 0) count += 1
  if (criteria.activities.length > 0) count += 1
  if (criteria.seeking.length > 0) count += 1
  if (criteria.maxDistanceKm != null) count += 1
  return count
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
  if (criteria.nearby && !(NEARBY_LOCATIONS as readonly string[]).includes(pet.location)) {
    return false
  }
  if (criteria.popular && !pet.popular) return false
  if (criteria.verified && !pet.verified) return false
  if (criteria.breeding && !pet.breedingProfile) return false

  if (criteria.locations.length > 0 && !criteria.locations.includes(pet.location)) {
    return false
  }

  if (criteria.activities.length > 0) {
    const matchesAll = criteria.activities.every((key) => petEnjoysActivity(pet, key))
    if (!matchesAll) return false
  }

  if (!petMatchesSeeking(pet, criteria.seeking)) return false

  if (criteria.maxDistanceKm != null) {
    const km = parseDistanceKm(pet.distance)
    if (km == null || km > criteria.maxDistanceKm) return false
  }

  return true
}

export function toggleListValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}
