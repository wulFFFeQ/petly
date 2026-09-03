import { readFileSync, writeFileSync } from 'fs'

const petBreedsSource = readFileSync('src/lib/petBreeds.ts', 'utf8')

function extractBreeds(constName) {
  const match = petBreedsSource.match(
    new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const`),
  )
  if (!match) throw new Error(`Could not parse ${constName}`)
  return [...match[1].matchAll(/'((?:\\'|[^'])*)'/g)].map((m) => m[1].replace(/\\'/g, "'"))
}

const DOG_BREEDS = extractBreeds('DOG_BREEDS')
const CAT_BREEDS = extractBreeds('CAT_BREEDS')

const UNSPLASH = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=85`

const DOG_TYPE_FALLBACK = UNSPLASH('photo-1543466835-00a7907e9de1')
const CAT_TYPE_FALLBACK = UNSPLASH('photo-1514888286974-6c03e2ca1dba')
const DOG_DEFAULT_COVER = UNSPLASH('photo-1548767797-d8c844163c4c')
const CAT_DEFAULT_COVER = UNSPLASH('photo-1518791841217-8f162f1e1131')

/** @type {Record<string, string>} */
const DOG_EXACT_SLUGS = {
  'Směs plemen': 'mix',
}

/** @type {{ test: RegExp; slug: string }[]} */
const DOG_SLUG_RULES = [
  { test: /border kolie/i, slug: 'collie/border' },
  { test: /bearded kolie|skotský collie|collie\s*-\s*dlouhosrstý/i, slug: 'rough/collie' },
  { test: /afgán|afghán/i, slug: 'hound/afghan' },
  { test: /airedale/i, slug: 'airedale' },
  { test: /akita/i, slug: 'akita' },
  { test: /aljašský malamut|malamut/i, slug: 'malamute' },
  { test: /appenzell/i, slug: 'appenzeller' },
  { test: /australský ovčák|australian shepherd/i, slug: 'australian/shepherd' },
  { test: /australská kelpie|kelpie/i, slug: 'australian/kelpie' },
  { test: /australský terier/i, slug: 'terrier/australian' },
  { test: /australský silky terier|silky terier/i, slug: 'terrier/silky' },
  { test: /basenji/i, slug: 'basenji' },
  { test: /basset/i, slug: 'hound/basset' },
  { test: /beagle/i, slug: 'beagle' },
  { test: /bedlington/i, slug: 'terrier/bedlington' },
  { test: /belgický ovčák|groenendael/i, slug: 'groenendael' },
  { test: /malinois/i, slug: 'malinois' },
  { test: /tervueren|tervuren/i, slug: 'tervuren' },
  { test: /bernský salašnický|bernese/i, slug: 'mountain/bernese' },
  { test: /bišon|bichon/i, slug: 'frise/bichon' },
  { test: /bloodhound/i, slug: 'hound/blood' },
  { test: /border terier/i, slug: 'terrier/border' },
  { test: /borzoi|barzoj|russký chrt/i, slug: 'borzoi' },
  { test: /boston/i, slug: 'terrier/boston' },
  { test: /buldok|bulldog|buldog/i, slug: 'bulldog/english' },
  { test: /francouzský buldok|french bulldog/i, slug: 'bulldog/french' },
  { test: /boston/i, slug: 'bulldog/boston' },
  { test: /bull terier|bullterier|staford|stafford|am\. staford/i, slug: 'bullterrier/staffordshire' },
  { test: /korgi.*cardigan|cardigan/i, slug: 'corgi/cardigan' },
  { test: /korgi.*pembroke|pembroke/i, slug: 'pembroke' },
  { test: /chihuahua/i, slug: 'chihuahua' },
  { test: /chow/i, slug: 'chow' },
  { test: /clumber/i, slug: 'clumber' },
  { test: /dachshund|jezevčík|jezevčíkovitý|dachs/i, slug: 'dachshund' },
  { test: /dalmat/i, slug: 'dalmatian' },
  { test: /dane|doga|mastif|mastiff/i, slug: 'mastiff/english' },
  { test: /argentin/i, slug: 'mastiff/english' },
  { test: /doberman/i, slug: 'doberman' },
  { test: /entlebuch/i, slug: 'entlebucher' },
  { test: /foxhound/i, slug: 'hound/english' },
  { test: /foxterier|fox terier/i, slug: 'terrier/fox' },
  { test: /německý ovčák|german shepherd/i, slug: 'german/shepherd' },
  { test: /zlatý retriever|golden retriever/i, slug: 'retriever/golden' },
  { test: /labrador/i, slug: 'labrador' },
  { test: /flat coated|flatcoated|hladkosrstý retriever/i, slug: 'retriever/flatcoated' },
  { test: /kudrnatý retriever|curly/i, slug: 'retriever/curly' },
  { test: /chesapeake/i, slug: 'retriever/chesapeake' },
  { test: /greyhound|anglický chrt|whippet|whipet|levrier|levrette|maďarský chrt|italský chrt|sicilský chrt|polský chrt|slovenský chrt|španělský galgo/i, slug: 'whippet' },
  { test: /saluki|perský chrt/i, slug: 'saluki' },
  { test: /deerhound|jelení pes/i, slug: 'deerhound/scottish' },
  { test: /wolfhound|irský vlkodav/i, slug: 'wolfhound/irish' },
  { test: /husky|sibiřsk/i, slug: 'husky' },
  { test: /samojed/i, slug: 'samoyed' },
  { test: /komondor/i, slug: 'komondor' },
  { test: /kuvasz/i, slug: 'kuvasz' },
  { test: /havanese|havanský/i, slug: 'havanese' },
  { test: /maltézský|maltese/i, slug: 'maltese' },
  { test: /mops|pug/i, slug: 'pug' },
  { test: /newfoundland|novofundland/i, slug: 'newfoundland' },
  { test: /papillon|kontinentální toy|butterfly/i, slug: 'papillon' },
  { test: /pekingský|pekingese|pekinese/i, slug: 'pekinese' },
  { test: /pinscher/i, slug: 'pinscher/miniature' },
  { test: /pitbull|pit bull/i, slug: 'pitbull' },
  { test: /pomeranian|špic.*patron|patron/i, slug: 'pomeranian' },
  { test: /pudl|poodle/i, slug: 'poodle/standard' },
  { test: /pyrenean|pyrenejsk/i, slug: 'pyrenees' },
  { test: /rhodesian|ridgeback/i, slug: 'ridgeback/rhodesian' },
  { test: /rottweil/i, slug: 'rottweiler' },
  { test: /collie/i, slug: 'collie/border' },
  { test: /setr|setter/i, slug: 'setter/english' },
  { test: /shar pei|sharpei/i, slug: 'sharpei' },
  { test: /shiba/i, slug: 'shiba' },
  { test: /shihtzu|shih tzu|shih-tzu/i, slug: 'shihtzu' },
  { test: /kokr|cockerspaniel|cocker spaniel|cocker/i, slug: 'spaniel/cocker' },
  { test: /springer|špringr/i, slug: 'springer/english' },
  { test: /španěl|spaniel/i, slug: 'spaniel/welsh' },
  { test: /schnauzer|šnauzer/i, slug: 'schnauzer/miniature' },
  { test: /bernard|bernardýn|st\. bernard/i, slug: 'stbernard' },
  { test: /vizsla|výmarský ohař|weimaraner/i, slug: 'weimaraner' },
  { test: /west highland|westík/i, slug: 'terrier/westhighland' },
  { test: /york|yorkshire/i, slug: 'terrier/yorkshire' },
  { test: /cairn/i, slug: 'terrier/cairn' },
  { test: /dandie dinmont|dandie/i, slug: 'terrier/dandie' },
  { test: /irish terier|irský terier/i, slug: 'terrier/irish' },
  { test: /kerry blue/i, slug: 'terrier/kerryblue' },
  { test: /lakeland/i, slug: 'terrier/lakeland' },
  { test: /norfolk/i, slug: 'terrier/norfolk' },
  { test: /norwich/i, slug: 'terrier/norwich' },
  { test: /patterdale/i, slug: 'terrier/patterdale' },
  { test: /russell/i, slug: 'terrier/russell' },
  { test: /scottish terier|skotský terier/i, slug: 'terrier/scottish' },
  { test: /sealyham/i, slug: 'terrier/sealyham' },
  { test: /tibetský terier/i, slug: 'terrier/tibetan' },
  { test: /welsh terier/i, slug: 'terrier/welsh' },
  { test: /manchester/i, slug: 'terrier/toy' },
  { test: /lhasa/i, slug: 'lhasa' },
  { test: /leonberg/i, slug: 'leonberg' },
  { test: /otterhound/i, slug: 'otterhound' },
  { test: /pointer|ohář|ohař/i, slug: 'pointer/german' },
  { test: /griffon|grifon|grifonek/i, slug: 'brabancon' },
  { test: /briard/i, slug: 'briard' },
  { test: /bouvier/i, slug: 'bouvier' },
  { test: /schipperke|šiperka/i, slug: 'schipperke' },
  { test: /keeshond/i, slug: 'keeshond' },
  { test: /lajka|spitz|špic/i, slug: 'spitz/japanese' },
  { test: /ovčák|sheepdog|shepherd|pastýř/i, slug: 'german/shepherd' },
  { test: /terier|terrier/i, slug: 'terrier/yorkshire' },
  { test: /chrt|levrier/i, slug: 'whippet' },
  { test: /honič|hound|brakýř|barvář|ohar/i, slug: 'hound/basset' },
]

/** @type {Record<string, string>} */
const CAT_BREED_IMAGES = {
  'Směs plemen': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Americký curl dlouhosrstý': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Americký curl krátkosrstý': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Balinéská kočka': UNSPLASH('photo-1574158622682-e40e69881006'),
  'Barmská kočka': UNSPLASH('photo-1573865526739-10659fec78a5'),
  'Bengálská kočka': UNSPLASH('photo-1592194996308-7a438c28d57a'),
  Birma: UNSPLASH('photo-1596854407944-b687e052603b'),
  Bombay: UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Britská dlouhosrstá kočka': UNSPLASH('photo-1573865526739-10659fec78a5'),
  'Britská krátkosrstá kočka': UNSPLASH('photo-1573865526739-10659fec78a5'),
  Burmilla: UNSPLASH('photo-1573865526739-10659fec78a5'),
  'Cornish rex': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Devon rex': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Dlouhosrstá domácí kočka': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Donský sphynx': UNSPLASH('photo-1511044568932-338cba0ad803'),
  'Egyptská mau': UNSPLASH('photo-1592194996308-7a438c28d57a'),
  'Evropská kočka': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Exotická kočka': UNSPLASH('photo-1573865526739-10659fec78a5'),
  'German rex': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Habešská kočka': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Japonský bobtail krátkosrstý': UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Kartouzská kočka': UNSPLASH('photo-1573865526739-10659fec78a5'),
  Korat: UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Krátkosrstá domácí kočka': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Kurilský bobtail dlouhosrstý': UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Kurilský bobtail krátkosrstý': UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Kymerská kočka': UNSPLASH('photo-1596854407944-b687e052603b'),
  'LaPerm dlouhosrstá': UNSPLASH('photo-1596854407944-b687e052603b'),
  'LaPerm krátkosrstá': UNSPLASH('photo-1596854407944-b687e052603b'),
  Lykoi: UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Mainská kočka mývalí': UNSPLASH('photo-1587300003388-59208cc962cb'),
  'Manská kočka': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Něvská maškaráda': UNSPLASH('photo-1574158622682-e40e69881006'),
  'Norská kočka lesní': UNSPLASH('photo-1587300003388-59208cc962cb'),
  Ocicat: UNSPLASH('photo-1592194996308-7a438c28d57a'),
  'Orientální kočka dlouhosrstá': UNSPLASH('photo-1574158622682-e40e69881006'),
  'Orientální kočka krátkosrstá': UNSPLASH('photo-1574158622682-e40e69881006'),
  'Perská kočka': UNSPLASH('photo-1529778873920-4da49237a0b8'),
  Peterbald: UNSPLASH('photo-1511044568932-338cba0ad803'),
  Ragdoll: UNSPLASH('photo-1596854407944-b687e052603b'),
  'Ruská modrá kočka': UNSPLASH('photo-1548247417-ec67f20cf625'),
  'Selkirk rex dlouhosrstý': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Selkirk rex krátkosrstý': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Siamská kočka': UNSPLASH('photo-1574158622682-e40e69881006'),
  'Sibiřská kočka': UNSPLASH('photo-1587300003388-59208cc962cb'),
  Singapura: UNSPLASH('photo-1529778873920-4da49237a0b8'),
  Snowshoe: UNSPLASH('photo-1574158622682-e40e69881006'),
  Sokoke: UNSPLASH('photo-1592194996308-7a438c28d57a'),
  'Somálská kočka': UNSPLASH('photo-1574158622682-e40e69881006'),
  Sphynx: UNSPLASH('photo-1511044568932-338cba0ad803'),
  'Thajská kočka': UNSPLASH('photo-1574158622682-e40e69881006'),
  'Turecká angora': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Turecká van': UNSPLASH('photo-1596854407944-b687e052603b'),
}

/** @type {Record<string, string>} */
const CAT_BREED_COVER_IMAGES = {
  'Směs plemen': CAT_DEFAULT_COVER,
  'Americký curl dlouhosrstý': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Americký curl krátkosrstý': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Balinéská kočka': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Barmská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Bengálská kočka': UNSPLASH('photo-1513364777861-7528a2401784'),
  Birma: UNSPLASH('photo-1545249395878-3829457786b1'),
  Bombay: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Britská dlouhosrstá kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Britská krátkosrstá kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  Burmilla: UNSPLASH('photo-1545249395878-3829457786b1'),
  'Cornish rex': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Devon rex': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Dlouhosrstá domácí kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Donský sphynx': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Egyptská mau': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Evropská kočka': CAT_DEFAULT_COVER,
  'Exotická kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'German rex': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Habešská kočka': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Japonský bobtail krátkosrstý': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Kartouzská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  Korat: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Krátkosrstá domácí kočka': CAT_DEFAULT_COVER,
  'Kurilský bobtail dlouhosrstý': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Kurilský bobtail krátkosrstý': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Kymerská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'LaPerm dlouhosrstá': UNSPLASH('photo-1545249395878-3829457786b1'),
  'LaPerm krátkosrstá': UNSPLASH('photo-1545249395878-3829457786b1'),
  Lykoi: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Mainská kočka mývalí': UNSPLASH('photo-1587300003388-59208cc962cb'),
  'Manská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Něvská maškaráda': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Norská kočka lesní': UNSPLASH('photo-1587300003388-59208cc962cb'),
  Ocicat: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Orientální kočka dlouhosrstá': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Orientální kočka krátkosrstá': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Perská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  Peterbald: UNSPLASH('photo-1513364777861-7528a2401784'),
  Ragdoll: UNSPLASH('photo-1545249395878-3829457786b1'),
  'Ruská modrá kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Selkirk rex dlouhosrstý': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Selkirk rex krátkosrstý': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Siamská kočka': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Sibiřská kočka': UNSPLASH('photo-1587300003388-59208cc962cb'),
  Singapura: UNSPLASH('photo-1513364777861-7528a2401784'),
  Snowshoe: UNSPLASH('photo-1495360010541-f087ead7202f'),
  Sokoke: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Somálská kočka': UNSPLASH('photo-1495360010541-f087ead7202f'),
  Sphynx: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Thajská kočka': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Turecká angora': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Turecká van': UNSPLASH('photo-1545249395878-3829457786b1'),
}

function resolveDogSlug(breed) {
  if (DOG_EXACT_SLUGS[breed]) return DOG_EXACT_SLUGS[breed]

  const englishMatch = breed.match(/\(([^)]+)\)/)
  if (englishMatch) {
    const english = englishMatch[1].toLowerCase()
    for (const rule of DOG_SLUG_RULES) {
      if (rule.test.test(english)) return rule.slug
    }
  }

  for (const rule of DOG_SLUG_RULES) {
    if (rule.test.test(breed)) return rule.slug
  }

  return 'mix'
}

async function fetchDogCeoImages(slug) {
  const res = await fetch(`https://dog.ceo/api/breed/${slug}/images`)
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 'success' || !data.message?.length) return null
  const profile = data.message[0]
  const cover =
    data.message.length > 1 && data.message[1] !== profile
      ? data.message[1]
      : DOG_DEFAULT_COVER
  return { profile, cover }
}

async function resolveDogImages(breed) {
  const slug = resolveDogSlug(breed)
  const primary = await fetchDogCeoImages(slug)
  if (primary) return primary

  const fallback = await fetchDogCeoImages('mix')
  if (fallback) return fallback

  return { profile: DOG_TYPE_FALLBACK, cover: DOG_DEFAULT_COVER }
}

function resolveCatImage(breed) {
  return CAT_BREED_IMAGES[breed] ?? CAT_TYPE_FALLBACK
}

function resolveCatCoverImage(breed) {
  const cover = CAT_BREED_COVER_IMAGES[breed] ?? CAT_DEFAULT_COVER
  const profile = resolveCatImage(breed)
  return cover === profile ? CAT_DEFAULT_COVER : cover
}

function escapeString(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function main() {
  /** @type {Record<string, string>} */
  const dogImages = {}
  /** @type {Record<string, string>} */
  const dogCovers = {}
  /** @type {Record<string, string>} */
  const catImages = {}
  /** @type {Record<string, string>} */
  const catCovers = {}

  console.log(`Resolving ${DOG_BREEDS.length} dog breeds...`)
  for (const breed of DOG_BREEDS) {
    const { profile, cover } = await resolveDogImages(breed)
    dogImages[breed] = profile
    dogCovers[breed] = cover === profile ? DOG_DEFAULT_COVER : cover
    process.stdout.write('.')
  }
  console.log('\nDone dogs.')

  console.log(`Resolving ${CAT_BREEDS.length} cat breeds...`)
  for (const breed of CAT_BREEDS) {
    catImages[breed] = resolveCatImage(breed)
    catCovers[breed] = resolveCatCoverImage(breed)
  }
  console.log('Done cats.')

  const formatMap = (map) =>
    Object.entries(map)
      .map(([breed, url]) => `  '${escapeString(breed)}': '${escapeString(url)}',`)
      .join('\n')

  const content = `// Generated by scripts/generate-breed-images.mjs — do not edit manually.
import type { Pet } from '../types'
import type { PetType } from './petTypes'
import { petPlaceholderImages } from './petTypes'

export const DOG_DEFAULT_COVER = '${escapeString(DOG_DEFAULT_COVER)}'
export const CAT_DEFAULT_COVER = '${escapeString(CAT_DEFAULT_COVER)}'

export const DOG_BREED_IMAGES: Record<string, string> = {
${formatMap(dogImages)}
}

export const DOG_BREED_COVERS: Record<string, string> = {
${formatMap(dogCovers)}
}

export const CAT_BREED_IMAGES: Record<string, string> = {
${formatMap(catImages)}
}

export const CAT_BREED_COVERS: Record<string, string> = {
${formatMap(catCovers)}
}

export function getDefaultBreedImage(type: PetType, breed: string): string {
  const map = type === 'dog' ? DOG_BREED_IMAGES : CAT_BREED_IMAGES
  return map[breed] ?? petPlaceholderImages[type]
}

export function getDefaultBreedCoverImage(type: PetType, breed: string): string {
  const map = type === 'dog' ? DOG_BREED_COVERS : CAT_BREED_COVERS
  const fallback = type === 'dog' ? DOG_DEFAULT_COVER : CAT_DEFAULT_COVER
  return map[breed] ?? fallback
}

export function getPetCoverImage(pet: Pick<Pet, 'type' | 'breed' | 'coverImage'>): string {
  if (pet.coverImage) return pet.coverImage
  return getDefaultBreedCoverImage(pet.type, pet.breed)
}
`

  writeFileSync('src/lib/petBreedImages.ts', content)
  console.log('Wrote src/lib/petBreedImages.ts')
  console.log(`Dog breeds: ${Object.keys(dogImages).length}, cat breeds: ${Object.keys(catImages).length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
