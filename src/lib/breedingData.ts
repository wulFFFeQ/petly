import type {
  BreedingAncestor,
  BreedingHealthTest,
  BreedingInfo,
  BreedingLitterRecord,
  BreedingMatingRecord,
  BreedingShowRecord,
  BreedingTitleRecord,
  Pet,
  PetBreedingData,
} from '../types'
import { hasActiveBreedingProfile } from './breedingProfile'
import { formatCzechDateToIso } from './petProfileUtils'
import { isFemalePetGender } from './petTypes'

export function newBreedingRecordId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function emptyBreedingData(): PetBreedingData {
  return {}
}

export function getBreedingData(pet: Pick<Pet, 'breeding'>): PetBreedingData {
  return pet.breeding ?? emptyBreedingData()
}

function hasFilledString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function hasBreedingInfoContent(info?: BreedingInfo): boolean {
  if (!info) return false
  return (
    hasFilledString(info.kennelName) ||
    hasFilledString(info.registrationNumber) ||
    hasFilledString(info.breed) ||
    hasFilledString(info.gender) ||
    hasFilledString(info.dateOfBirth) ||
    hasFilledString(info.pedigreeNumber) ||
    hasFilledString(info.breeder) ||
    hasFilledString(info.owner) ||
    hasFilledString(info.countryOfOrigin) ||
    hasFilledString(info.coatColor) ||
    hasFilledString(info.notes)
  )
}

export function hasBreedingContent(data?: PetBreedingData): boolean {
  if (!data) return false
  return (
    hasBreedingInfoContent(data.info) ||
    (data.pedigree?.length ?? 0) > 0 ||
    (data.healthTests?.length ?? 0) > 0 ||
    (data.shows?.length ?? 0) > 0 ||
    (data.matings?.length ?? 0) > 0 ||
    (data.litters?.length ?? 0) > 0 ||
    (data.titles?.length ?? 0) > 0
  )
}

/** Show the Chovný tab when profile is active or historical breeding data exists. */
export function shouldShowBreedingTab(pet: Pet): boolean {
  return hasActiveBreedingProfile(pet) || hasBreedingContent(pet.breeding)
}

export function canManageLitters(pet: Pick<Pet, 'gender'>): boolean {
  return isFemalePetGender(pet.gender)
}

/** Display helpers: prefer breeding-layer value, else everyday profile value. Never invent data. */
export function resolveBreedingDisplayBreed(pet: Pet): string | undefined {
  const fromBreeding = pet.breeding?.info?.breed?.trim()
  if (fromBreeding) return fromBreeding
  return pet.breed?.trim() || undefined
}

export function resolveBreedingDisplayGender(pet: Pet): string | undefined {
  const fromBreeding = pet.breeding?.info?.gender?.trim()
  if (fromBreeding) return fromBreeding
  return pet.gender?.trim() || undefined
}

export function resolveBreedingDisplayDob(pet: Pet): string | undefined {
  const fromBreeding = pet.breeding?.info?.dateOfBirth?.trim()
  if (fromBreeding) return fromBreeding
  if (pet.dateOfBirth?.trim()) {
    const iso = formatCzechDateToIso(pet.dateOfBirth)
    return iso || pet.dateOfBirth.trim()
  }
  return undefined
}

export function pruneEmptyStrings<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const next: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      ;(next as Record<string, unknown>)[key] = trimmed
      continue
    }
    if (Array.isArray(value) && value.length === 0) continue
    ;(next as Record<string, unknown>)[key] = value
  }
  return next
}

export function upsertListItem<T extends { id: string }>(list: T[] | undefined, item: T): T[] {
  const current = list ?? []
  const index = current.findIndex((row) => row.id === item.id)
  if (index === -1) return [...current, item]
  const next = [...current]
  next[index] = item
  return next
}

export function removeListItem<T extends { id: string }>(list: T[] | undefined, id: string): T[] {
  return (list ?? []).filter((row) => row.id !== id)
}

export function patchBreedingData(
  current: PetBreedingData | undefined,
  patch: Partial<PetBreedingData>,
): PetBreedingData {
  return {
    ...emptyBreedingData(),
    ...current,
    ...patch,
  }
}

export function setBreedingInfo(
  current: PetBreedingData | undefined,
  info: BreedingInfo,
): PetBreedingData {
  const cleaned = pruneEmptyStrings(info) as BreedingInfo
  const next = patchBreedingData(current, {
    info: Object.keys(cleaned).length > 0 ? cleaned : undefined,
  })
  if (!next.info) {
    const { info: _removed, ...rest } = next
    return rest
  }
  return next
}

export type BreedingListKey =
  | 'pedigree'
  | 'healthTests'
  | 'shows'
  | 'matings'
  | 'litters'
  | 'titles'

export function setBreedingList(
  current: PetBreedingData | undefined,
  key: 'pedigree',
  list: BreedingAncestor[],
): PetBreedingData
export function setBreedingList(
  current: PetBreedingData | undefined,
  key: 'healthTests',
  list: BreedingHealthTest[],
): PetBreedingData
export function setBreedingList(
  current: PetBreedingData | undefined,
  key: 'shows',
  list: BreedingShowRecord[],
): PetBreedingData
export function setBreedingList(
  current: PetBreedingData | undefined,
  key: 'matings',
  list: BreedingMatingRecord[],
): PetBreedingData
export function setBreedingList(
  current: PetBreedingData | undefined,
  key: 'litters',
  list: BreedingLitterRecord[],
): PetBreedingData
export function setBreedingList(
  current: PetBreedingData | undefined,
  key: 'titles',
  list: BreedingTitleRecord[],
): PetBreedingData
export function setBreedingList(
  current: PetBreedingData | undefined,
  key: BreedingListKey,
  list: unknown[],
): PetBreedingData {
  const next = patchBreedingData(current, {
    [key]: list.length > 0 ? list : undefined,
  } as Partial<PetBreedingData>)
  if (!next[key]?.length) {
    const copy = { ...next }
    delete copy[key]
    return copy
  }
  return next
}

export function documentIdsLabel(count: number): string {
  if (count <= 0) return ''
  if (count === 1) return '1 dokument'
  if (count >= 2 && count <= 4) return `${count} dokumenty`
  return `${count} dokumentů`
}
