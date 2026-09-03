export const PET_TYPES = [
  { value: 'dog', label: 'Pes' },
  { value: 'cat', label: 'Kočka' },
  { value: 'birds', label: 'Ptáci' },
  { value: 'small-mammals', label: 'Drobní savci' },
  { value: 'reptiles', label: 'Plazi' },
  { value: 'amphibians', label: 'Obojživelníci' },
  { value: 'fish', label: 'Ryby' },
  { value: 'insects', label: 'Hmyz' },
  { value: 'other-invertebrates', label: 'Bezobratlí' },
  { value: 'horses-donkeys', label: 'Koně a osli' },
  { value: 'farm-animals', label: 'Hospodářská zvířata' },
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
  birds: 'https://images.unsplash.com/photo-1552728080-9f90234b8a0c?auto=format&fit=crop&w=800&q=85',
  'small-mammals':
    'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=85',
  reptiles: 'https://images.unsplash.com/photo-1559251606-623115f2f9a9?auto=format&fit=crop&w=800&q=85',
  amphibians: 'https://images.unsplash.com/photo-1559251606-623115f2f9a9?auto=format&fit=crop&w=800&q=85',
  fish: 'https://images.unsplash.com/photo-1524704654690-b56c05a4a760?auto=format&fit=crop&w=800&q=85',
  insects: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=85',
  'other-invertebrates':
    'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=85',
  'horses-donkeys':
    'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=800&q=85',
  'farm-animals':
    'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=85',
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
