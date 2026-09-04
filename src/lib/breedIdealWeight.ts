import type { PetType } from './petTypes'
import { isCatType, isDogType, isFemalePetGender } from './petTypes'
import {
  CAT_IDEAL_WEIGHTS,
  DOG_IDEAL_WEIGHTS,
  type BreedIdealWeight,
  type IdealWeightBounds,
} from './breedIdealWeightData'

export type { BreedIdealWeight, IdealWeightBounds }

/** Hand-tuned breed standards (override generated estimates). */
const WEIGHT_OVERRIDES: Record<string, BreedIdealWeight> = {
  'Australský honácký pes': {
    female: { min: 14, max: 20 },
    male: { min: 16, max: 23 },
  },
  'Australský honácký pes s krátkým ocasem': {
    female: { min: 14, max: 20 },
    male: { min: 16, max: 23 },
  },
  'Labradorský retriever': {
    female: { min: 25, max: 32 },
    male: { min: 29, max: 36 },
  },
  'Zlatý retriever': {
    female: { min: 25, max: 32 },
    male: { min: 30, max: 34 },
  },
  'Německý ovčák': {
    female: { min: 22, max: 32 },
    male: { min: 30, max: 40 },
  },
  'Francouzský buldoček': {
    female: { min: 8, max: 12 },
    male: { min: 9, max: 14 },
  },
  'Border kolie': {
    female: { min: 12, max: 19 },
    male: { min: 14, max: 20 },
  },
  'Sibiřský husky': {
    female: { min: 16, max: 23 },
    male: { min: 20, max: 27 },
  },
  'Britská krátkosrstá kočka': {
    female: { min: 3.5, max: 5.5 },
    male: { min: 4.5, max: 7.5 },
  },
  'Mainská kočka mývalí': {
    female: { min: 4.5, max: 7.5 },
    male: { min: 6, max: 10 },
  },
  'Siamská kočka': {
    female: { min: 2.5, max: 4.5 },
    male: { min: 3.5, max: 5.5 },
  },
}

function formatKg(value: number): string {
  return String(value).replace('.', ',')
}

function formatRange(bounds: IdealWeightBounds): string {
  if (bounds.min === bounds.max) return `${formatKg(bounds.min)} kg`
  return `${formatKg(bounds.min)}–${formatKg(bounds.max)} kg`
}

function lookupBreedWeights(
  type: PetType,
  breed: string,
): BreedIdealWeight | undefined {
  if (WEIGHT_OVERRIDES[breed]) return WEIGHT_OVERRIDES[breed]
  const table = isDogType(type) ? DOG_IDEAL_WEIGHTS : isCatType(type) ? CAT_IDEAL_WEIGHTS : null
  if (!table) return undefined
  if (table[breed]) return table[breed]
  const localized = Object.keys(table).find(
    (key) => key.toLowerCase() === breed.trim().toLowerCase(),
  )
  return localized ? table[localized] : undefined
}

function sexLabel(type: PetType, female: boolean): string {
  if (isDogType(type)) return female ? 'fenu' : 'psa'
  return female ? 'kočku' : 'kocoura'
}

/** Ideal adult weight range for the pet's breed and sex, when known. */
export function getIdealWeightBounds(
  type: PetType,
  breed: string,
  gender?: string | null,
): IdealWeightBounds | undefined {
  const entry = lookupBreedWeights(type, breed)
  if (!entry) return undefined
  if (!gender?.trim()) {
    return {
      min: Math.min(entry.female.min, entry.male.min),
      max: Math.max(entry.female.max, entry.male.max),
    }
  }
  return isFemalePetGender(gender) ? entry.female : entry.male
}

/** Short hint for overview cards / weight section. */
export function formatIdealWeightHint(
  type: PetType,
  breed: string,
  gender?: string | null,
): string | undefined {
  const entry = lookupBreedWeights(type, breed)
  if (!entry || !breed.trim()) return undefined

  if (!gender?.trim()) {
    return `Ideál plemene: ${formatRange({
      min: Math.min(entry.female.min, entry.male.min),
      max: Math.max(entry.female.max, entry.male.max),
    })}`
  }

  const female = isFemalePetGender(gender)
  const bounds = female ? entry.female : entry.male
  return `Ideál pro ${sexLabel(type, female)}: ${formatRange(bounds)}`
}
