/** Solid banner colors matching the app palette. */
export const PET_COVER_COLORS = [
  '#234B54',
  '#2C4A3E',
  '#3D6B5C',
  '#5A7D6A',
  '#B8934A',
  '#C4A574',
  '#8B6B4A',
  '#6B5344',
  '#4A6670',
  '#7D5A6A',
  '#5C6B8A',
  '#6A7B4A',
] as const

export type PetCoverColor = (typeof PET_COVER_COLORS)[number]

export function pickRandomCoverColor(): PetCoverColor {
  const index = Math.floor(Math.random() * PET_COVER_COLORS.length)
  return PET_COVER_COLORS[index]
}

export function getPetCoverColor(pet: { id: string; coverColor?: string }): string {
  if (pet.coverColor) return pet.coverColor

  let hash = 0
  for (const char of pet.id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return PET_COVER_COLORS[hash % PET_COVER_COLORS.length]
}
