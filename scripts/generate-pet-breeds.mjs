import { readFileSync, writeFileSync } from 'fs'

const source = readFileSync('src/data/cmku-dog-breeds-source.txt', 'utf8')
const dogBreeds = []

for (const line of source.split('\n')) {
  const match = line.match(/^\| \d{3} \| (.+?) \| /)
  if (match) dogBreeds.push(match[1].trim())
}

const DOG_BREEDS = [...new Set([...dogBreeds, 'Směs plemen'])].sort((a, b) => a.localeCompare(b, 'cs'))

// Oficiální plemena FIFe (48 uznaných + 2 předběžně uznaná) + praktické volby pro domácí kočky
const CAT_BREEDS = [
  'Americký curl dlouhosrstý',
  'Americký curl krátkosrstý',
  'Balinéská kočka',
  'Barmská kočka',
  'Bengálská kočka',
  'Birma',
  'Bombay',
  'Britská dlouhosrstá kočka',
  'Britská krátkosrstá kočka',
  'Burmilla',
  'Cornish rex',
  'Devon rex',
  'Donský sphynx',
  'Egyptská mau',
  'Evropská kočka',
  'Exotická kočka',
  'German rex',
  'Habešská kočka',
  'Japonský bobtail krátkosrstý',
  'Kartouzská kočka',
  'Korat',
  'Směs plemen',
  'Kurilský bobtail dlouhosrstý',
  'Kurilský bobtail krátkosrstý',
  'Kymerská kočka',
  'LaPerm dlouhosrstá',
  'LaPerm krátkosrstá',
  'Lykoi',
  'Mainská kočka mývalí',
  'Manská kočka',
  'Něvská maškaráda',
  'Norská kočka lesní',
  'Ocicat',
  'Orientální kočka dlouhosrstá',
  'Orientální kočka krátkosrstá',
  'Peterbald',
  'Perská kočka',
  'Ragdoll',
  'Ruská modrá kočka',
  'Selkirk rex dlouhosrstý',
  'Selkirk rex krátkosrstý',
  'Siamská kočka',
  'Sibiřská kočka',
  'Singapura',
  'Snowshoe',
  'Sokoke',
  'Somálská kočka',
  'Sphynx',
  'Thajská kočka',
  'Turecká angora',
  'Turecká van',
  'Dlouhosrstá domácí kočka',
  'Krátkosrstá domácí kočka',
].sort((a, b) => a.localeCompare(b, 'cs'))

const formatBreeds = (breeds) =>
  breeds.map((breed) => `  '${breed.replace(/'/g, "\\'")}',`).join('\n')

const content = `import type { PetType } from './petTypes'

export const DOG_BREEDS = [
${formatBreeds(DOG_BREEDS)}
] as const

export const CAT_BREEDS = [
${formatBreeds(CAT_BREEDS)}
] as const

export function getBreedsForType(type: PetType): readonly string[] {
  return type === 'dog' ? DOG_BREEDS : CAT_BREEDS
}

export function getBreedOptions(type: PetType) {
  return getBreedsForType(type).map((breed) => ({ value: breed, label: breed }))
}
`

writeFileSync('src/lib/petBreeds.ts', content)
console.log(`Generated ${DOG_BREEDS.length} dog breeds and ${CAT_BREEDS.length} cat breeds.`)
