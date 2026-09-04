import { readFileSync, writeFileSync } from 'fs'

const src = readFileSync('src/lib/petBreeds.ts', 'utf8')

function extract(name) {
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`))
  if (!m) throw new Error(`no ${name}`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** @returns {[number, number, number, number]} fMin,fMax,mMin,mMax */
function dogRange(breed) {
  const b = norm(breed)
  const rules = [
    [
      /chihuahua|civava|yorkshire|maltez|bisonek|bolon|papillon|prazsky krysarik|cinsky chocholaty|toy|jorksir|pekingsky|mops|bruselsk|brabantik|francouzsky buldocek|trpaslici|pinc/,
      [1.8, 3.5, 2.2, 4.5],
    ],
    [
      /jezevcik|cairn|westie|scottish|skotsky terier|border terier|fox terier|welsh terier|jack russell|parson|biewer|silky|australsky terier|norwich|norfolk|sealyham|skye|tibetsky terier|tibetsky spanel|lhasa|shi tzu|spic|japan chin|king charles|cavalier|pomeranian|nemecky spic|volpino|italsky chrtik|whippet|pharaoh|cirneco/,
      [5, 10, 6, 12],
    ],
    [
      /beagle|cocker|kokr|springr|springer|sheltie|shetland|corgi|kelpie|australsky honacky|stafford|americky staford|bull terier|boston|basenji|puli|pumi|mudi|schipperke|samoyed|samojed|keeshond|chow|siba|shiba/,
      [9, 16, 11, 20],
    ],
    [
      /border kolie|australsky ovcak|belgicky ovcak|nemecky ovcak|bily svycarsky|labrador|zlaty retriever|flat coated|chesapeake|boxer|dobrman|doberman|dalmatin|husky|malamut|sibirsky|rhodesian|vizsla|vymar|pointer|setr|setter|briard|beauceron|bouvier|kolie|bobtail|akita/,
      [16, 28, 20, 35],
    ],
    [
      /mastif|doga|dogue|bernardyn|newfoundland|novofundlandsky|leonberger|vlkodav|wolfhound|deerhound|great dane|nemecka doga|anatolian|kangal|tibetska doga|bordeaux|fila|bullmastiff|mastin|neapolsky|landseer|komondor|kuvasz|pyrenejsky/,
      [40, 65, 50, 80],
    ],
  ]
  for (const [re, r] of rules) {
    if (re.test(b)) return r
  }
  if (/ovcak|ohar|honic|retriever|terier|buldok|bulldog|chrt/.test(b)) {
    return [14, 25, 18, 32]
  }
  return [12, 22, 15, 28]
}

function catRange(breed) {
  const b = norm(breed)
  if (
    /singapura|devon rex|cornish|oriental|siam|thajska|korat|sphynx|peterbald|donsky/.test(b)
  ) {
    return [2.5, 4.0, 3.5, 5.5]
  }
  if (/mainska|myvali|norska|sibirska|ragdoll|nevska|turecka van|birma|bengal/.test(b)) {
    return [4.5, 7.5, 6.0, 10.0]
  }
  if (
    /britska|kartouz|perska|exoticka|ruska|evropska|habes|somalska|burmilla|barmska/.test(b)
  ) {
    return [3.5, 5.5, 4.5, 7.5]
  }
  if (/smes|domaci/.test(b)) return [3.0, 5.5, 4.0, 7.0]
  return [3.2, 5.5, 4.2, 7.0]
}

const dogs = extract('DOG_BREEDS')
const cats = extract('CAT_BREEDS')

const dogEntries = dogs
  .map((breed) => {
    const [fMin, fMax, mMin, mMax] = dogRange(breed)
    return `  ${JSON.stringify(breed)}: { female: { min: ${fMin}, max: ${fMax} }, male: { min: ${mMin}, max: ${mMax} } },`
  })
  .join('\n')

const catEntries = cats
  .map((breed) => {
    const [fMin, fMax, mMin, mMax] = catRange(breed)
    return `  ${JSON.stringify(breed)}: { female: { min: ${fMin}, max: ${fMax} }, male: { min: ${mMin}, max: ${mMax} } },`
  })
  .join('\n')

const out = `/** Ideal adult weight ranges (kg) by breed and sex. Approximate breed-standard guidance. */
export type IdealWeightBounds = { min: number; max: number }
export type BreedIdealWeight = { female: IdealWeightBounds; male: IdealWeightBounds }

export const DOG_IDEAL_WEIGHTS: Record<string, BreedIdealWeight> = {
${dogEntries}
}

export const CAT_IDEAL_WEIGHTS: Record<string, BreedIdealWeight> = {
${catEntries}
}
`

writeFileSync('src/lib/breedIdealWeightData.ts', out)
console.log('dogs', dogs.length, 'cats', cats.length)
console.log('ACD short', dogRange('Australský honácký pes s krátkým ocasem'))
console.log('Coco breed should be medium herding ~9-16 / 11-20')
