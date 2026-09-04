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
  if (isCatType(type)) return 'Kočka'
  return 'Samice'
}

export function getDefaultWeight(type: PetType) {
  if (isCatType(type)) return 4.5
  if (isDogType(type)) return 15
  return 5
}

export const petPlaceholderImages: Record<PetType, string> = {
  dog: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=85',
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=85',
}

export function getGenderOptions(type: PetType) {
  if (isDogType(type)) {
    return [
      { value: 'Fena', label: 'Fena' },
      { value: 'Pes', label: 'Pes' },
    ]
  }

  if (isCatType(type)) {
    return [
      { value: 'Kočka', label: 'Kočka' },
      { value: 'Kocour', label: 'Kocour' },
    ]
  }

  return [
    { value: 'Samice', label: 'Samice' },
    { value: 'Samec', label: 'Samec' },
  ]
}

function isFemaleGender(gender: string | undefined) {
  return gender === 'Samice' || gender === 'Fena' || gender === 'Kočka'
}

/** Female dog (fena) or female cat (kočka), including legacy „Samice“. */
export function isFemalePetGender(gender: string | undefined) {
  return isFemaleGender(gender)
}

export function normalizeGenderForType(gender: string | undefined, type: PetType) {
  const options = getGenderOptions(type)
  if (gender && options.some((option) => option.value === gender)) {
    return gender
  }

  const female = isFemaleGender(gender)

  if (isDogType(type)) return female ? 'Fena' : 'Pes'
  if (isCatType(type)) return female ? 'Kočka' : 'Kocour'
  return female ? 'Samice' : 'Samec'
}
