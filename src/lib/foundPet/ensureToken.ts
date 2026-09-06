import type { Pet } from '../../types'
import { createFoundContactToken } from './token'

/** Ensure every pet has a found-contact token; enable QR contact by default. */
export function ensurePetFoundContactFields(pet: Pet): Pet {
  const token = pet.foundContactToken?.trim()
  if (token && pet.qrContactEnabled !== undefined) return pet

  return {
    ...pet,
    foundContactToken: token || createFoundContactToken(),
    qrContactEnabled: pet.qrContactEnabled ?? true,
  }
}

export function ensurePetsFoundContactFields(pets: Pet[]): Pet[] {
  let changed = false
  const next = pets.map((pet) => {
    const ensured = ensurePetFoundContactFields(pet)
    if (ensured !== pet) changed = true
    return ensured
  })
  return changed ? next : pets
}
