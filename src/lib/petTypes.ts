export const PET_TYPES = [
  { value: 'dog', label: 'Pes' },
  { value: 'cat', label: 'Kočka' },
] as const

export type PetType = (typeof PET_TYPES)[number]['value']

export const petTypeLabel: Record<PetType, string> = Object.fromEntries(
  PET_TYPES.map(({ value, label }) => [value, label]),
) as Record<PetType, string>

export function isDogType(type: PetType) {
  return type === 'dog'
}

export function isCatType(type: PetType) {
  return type === 'cat'
}

export function getDefaultGender(type: PetType) {
  if (isDogType(type)) return 'Fena'
  return 'Kočka'
}

export function getDefaultWeight(type: PetType) {
  if (isCatType(type)) return 4.5
  return 15
}

export const petPlaceholderImages: Record<PetType, string> = {
  dog: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=85',
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=85',
}

/** Species-correct gender options only — never generic Samice / Samec. */
export function getGenderOptions(type: PetType) {
  if (isDogType(type)) {
    return [
      { value: 'Fena', label: 'Fena' },
      { value: 'Pes', label: 'Pes' },
    ]
  }

  return [
    { value: 'Kočka', label: 'Kočka' },
    { value: 'Kocour', label: 'Kocour' },
  ]
}

function isFemaleGender(gender: string | undefined) {
  const value = gender?.trim()
  return (
    value === 'Samice' ||
    value === 'Fena' ||
    value === 'Kočka' ||
    value === 'female' ||
    value === 'Female'
  )
}

function isMaleGender(gender: string | undefined) {
  const value = gender?.trim()
  return (
    value === 'Samec' ||
    value === 'Pes' ||
    value === 'Kocour' ||
    value === 'male' ||
    value === 'Male'
  )
}

/** Female dog (fena) or female cat (kočka), including legacy „Samice“. */
export function isFemalePetGender(gender: string | undefined) {
  return isFemaleGender(gender)
}

/**
 * Always returns species-correct Czech gender labels:
 * dog → Fena / Pes, cat → Kočka / Kocour.
 * Migrates legacy Samice / Samec automatically.
 */
export function normalizeGenderForType(
  gender: string | undefined,
  type: PetType,
): string | undefined {
  if (!gender?.trim()) return undefined

  const options = getGenderOptions(type)
  if (options.some((option) => option.value === gender)) {
    return gender
  }

  // Cross-species corrections
  if (gender === 'Pes' && isCatType(type)) return 'Kocour'
  if (gender === 'Kocour' && isDogType(type)) return 'Pes'
  if (gender === 'Fena' && isCatType(type)) return 'Kočka'
  if (gender === 'Kočka' && isDogType(type)) return 'Fena'

  if (isFemaleGender(gender)) {
    return isDogType(type) ? 'Fena' : 'Kočka'
  }

  if (isMaleGender(gender)) {
    return isDogType(type) ? 'Pes' : 'Kocour'
  }

  // Unknown legacy value → default by species
  return getDefaultGender(type)
}
