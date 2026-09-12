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
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=90`

const DOG_TYPE_FALLBACK = UNSPLASH('photo-1543466835-00a7907e9de1')
const CAT_TYPE_FALLBACK = UNSPLASH('photo-1514888286974-6c03e2ca1dba')
const DOG_DEFAULT_COVER = UNSPLASH('photo-1548767797-d8c844163c4c')
const CAT_DEFAULT_COVER = UNSPLASH('photo-1518791841217-8f162f1e1131')

/**
 * Curated HQ portraits (Unsplash or local). Visually verified breed match only.
 * dog.ceo is last-resort fallback for unlisted breeds — do not treat it as the style target.
 * @type {Record<string, string>}
 */
const DOG_CURATED_IMAGES = {
  'Afgánský chrt': '/breeds/afgansky-chrt.jpg?v=3',
  // Reference style: local editorial portrait (4:3, head in frame for object-center cards).
  'Border kolie': UNSPLASH('photo-1503256207526-0d5d80fa2f47'),
  Beagle: UNSPLASH('photo-1543466835-00a7907e9de1'),
  'Beagle Harrier': UNSPLASH('photo-1543466835-00a7907e9de1'),
  'Labradorský retriever': UNSPLASH('photo-1626808504752-0a423780d6d1'),
  'Zlatý retriever': UNSPLASH('photo-1552053831-71594a27632d'),
  Mops: UNSPLASH('photo-1517849845537-4d257902454a'),
  'Francouzský buldoček': UNSPLASH('photo-1583511655857-d19b40a7a54e'),
  'Německý ovčák': UNSPLASH('photo-1589941013453-ec89f33b5e95'),
  'Sibiřský husky': UNSPLASH('photo-1605568427561-40dd23c2acea'),
  // Distinct from husky — landscape snow Malamute, full head, brown eyes.
  'Aljašský malamut': '/breeds/aljasky-malamut.jpg?v=1',
  'Australský ovčák': UNSPLASH('photo-1587300003388-59208cc962cb'),
  'Australský honácký pes': UNSPLASH('photo-1769117086709-7507034281fa'),
  'Australský honácký pes s krátkým ocasem': UNSPLASH('photo-1769117086709-7507034281fa'),
  'Kolie dlouhosrstá': UNSPLASH('photo-1503256207526-0d5d80fa2f47'),
  'Kolie krátkosrstá': UNSPLASH('photo-1503256207526-0d5d80fa2f47'),
  Sheltie: UNSPLASH('photo-1503256207526-0d5d80fa2f47'),
  Šeltie: UNSPLASH('photo-1503256207526-0d5d80fa2f47'),
  Dobrman: UNSPLASH('photo-1757781956803-2efc6921abe9'),
  Rotvajler: UNSPLASH('photo-1567752881298-894bb81f9379'),
  'Welsh Corgi Pembroke': UNSPLASH('photo-1546975490-e8b92a360b24'),
  'Welsh Corgi Cardigan': UNSPLASH('photo-1546975490-e8b92a360b24'),
  // Japanese Akita Inu — landscape HQ portrait, full head (not dog.ceo hiking snap).
  Akita: '/breeds/akita.jpg?v=1',
  // American Akita — full-body landscape stack, head fully in frame (not hiking snap).
  'Americká akita': '/breeds/americka-akita.jpg?v=1',
  // American Cocker — outdoor HQ, full head (not couch/dog.ceo snap).
  'Americký kokršpaněl': '/breeds/americky-kokrspanel.jpg?v=1',
  // American Foxhound — outdoor head portrait (HQ bokeh; not indoor show-floor).
  'Americký foxhound': '/breeds/americky-foxhound.jpg?v=2',
  // American Hairless Terrier — HQ portrait, full head (not Yorkshire mislabel).
  'Americký bezsrstý terier': '/breeds/americky-bezsrsty-terier.jpg?v=1',
}

/** Exact Czech CMKU name → dog.ceo slug (preferred over fuzzy rules). */
/** @type {Record<string, string>} */
const DOG_EXACT_SLUGS = {
  'Směs plemen': 'mix',
  'Australský honácký pes': 'cattledog/australian',
  'Australský honácký pes s krátkým ocasem': 'cattledog/australian',
  'Australský ovčák': 'australian/shepherd',
  'Australská kelpie': 'australian/kelpie',
  Bobtail: 'sheepdog/english',
  'Border kolie': 'collie/border',
  'Coton de Tuléar': 'cotondetulear',
  'Čivava': 'chihuahua',
  'Čivava dlouhosrstá': 'chihuahua',
  'Čivava krátkosrstá': 'chihuahua',
  'Dánsko-švédský farmářský pes': 'danishswedish/farmdog',
  Dobrman: 'doberman',
  'Francouzský buldoček': 'bulldog/french',
  'Ibizský podenco': 'hound/ibizan',
  'Kavkazský pastevecký pes': 'ovcharka/caucasian',
  'Knírač malý': 'schnauzer/miniature',
  'Knírač střední': 'schnauzer/miniature',
  'Knírač velký': 'schnauzer/giant',
  'Kolie dlouhosrstá': 'rough/collie',
  'Kolie krátkosrstá': 'collie/border',
  'Mexický naháč': 'mexicanhairless',
  'Německý boxer': 'boxer',
  'Norský buhund': 'buhund/norwegian',
  'Norský losí pes černý': 'elkhound/norwegian',
  'Norský losí pes šedý': 'elkhound/norwegian',
  'Bulteriér': 'bullterrier/staffordshire',
  'Miniaturní bulteriér': 'bullterrier/staffordshire',
  'Anglický buldok': 'bulldog/english',
  'Americký stafordšírský terier': 'bullterrier/staffordshire',
  'Stafordšírský bulterier': 'bullterrier/staffordshire',
  'Italský chrtík': 'greyhound/italian',
  'Irský vlkodav': 'wolfhound/irish',
  'Skotský jelení pes': 'deerhound/scottish',
  'Německá doga': 'dane/great',
  'Velký švýcarský salašnický pes': 'mountain/swiss',
  'Bernský salašnický pes': 'mountain/bernese',
  'Shetlandský ovčák': 'sheepdog/shetland',
  Šeltie: 'sheepdog/shetland',
  Sheltie: 'sheepdog/shetland',
  Rotvajler: 'rottweiler',
  'Shar-Pei': 'sharpei',
  'Japan-chin': 'spaniel/japanese',
  'Anglický špringršpaněl': 'springer/english',
  'Welsh springer spaniel': 'spaniel/welsh',
  'Čínský naháč': 'mexicanhairless',
  'Portugalský vodní pes': 'waterdog/spanish',
  'Kanárský podenco': 'hound/ibizan',
  'Holandský pinč': 'pinscher/miniature',
  Brabantík: 'brabancon',
  'Biewer teriér': 'terrier/yorkshire',
}

/** @type {{ test: RegExp; slug: string }[]} — specific rules first, generics last. */
const DOG_SLUG_RULES = [
  { test: /border kolie|border collie/i, slug: 'collie/border' },
  { test: /bearded kolie|skotský collie|collie\s*-\s*dlouhosrstý|rough collie/i, slug: 'rough/collie' },
  { test: /afgán|afghán/i, slug: 'hound/afghan' },
  { test: /airedale/i, slug: 'airedale' },
  { test: /akita/i, slug: 'akita' },
  { test: /aljašský malamut|malamut/i, slug: 'malamute' },
  { test: /appenzell/i, slug: 'appenzeller' },
  { test: /honácký|cattledog|cattle dog|blue heeler|heeler/i, slug: 'cattledog/australian' },
  { test: /australský ovčák|australian shepherd/i, slug: 'australian/shepherd' },
  { test: /australská kelpie|kelpie/i, slug: 'australian/kelpie' },
  { test: /australský silky terier|silky terier/i, slug: 'terrier/silky' },
  { test: /australský terier/i, slug: 'terrier/australian' },
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
  { test: /borzoi|barzoj|ruský chrt/i, slug: 'borzoi' },
  { test: /boston/i, slug: 'bulldog/boston' },
  { test: /francouzský buldok|francouzský buldoček|french bulldog/i, slug: 'bulldog/french' },
  { test: /bulteriér|bull terier|bullterier|staford|stafford|am\. staford/i, slug: 'bullterrier/staffordshire' },
  { test: /buldok|bulldog|buldog|buldoček/i, slug: 'bulldog/english' },
  { test: /korgi.*cardigan|cardigan/i, slug: 'corgi/cardigan' },
  { test: /korgi.*pembroke|pembroke|welsh corgi/i, slug: 'pembroke' },
  { test: /čivava|chihuahua/i, slug: 'chihuahua' },
  { test: /chow/i, slug: 'chow' },
  { test: /clumber/i, slug: 'clumber' },
  { test: /coton/i, slug: 'cotondetulear' },
  { test: /dachshund|jezevčík|jezevčíkovitý|dachs/i, slug: 'dachshund' },
  { test: /dalmat/i, slug: 'dalmatian' },
  { test: /doga|dane|great dane/i, slug: 'dane/great' },
  { test: /mastif|mastiff|argentin/i, slug: 'mastiff/english' },
  { test: /dobrman|doberman/i, slug: 'doberman' },
  { test: /entlebuch/i, slug: 'entlebucher' },
  { test: /foxhound/i, slug: 'hound/english' },
  { test: /foxterier|fox terier/i, slug: 'terrier/fox' },
  { test: /německý ovčák|german shepherd/i, slug: 'german/shepherd' },
  { test: /zlatý retriever|golden retriever/i, slug: 'retriever/golden' },
  { test: /labrador/i, slug: 'labrador' },
  { test: /flat coated|flatcoated|hladkosrstý retriever/i, slug: 'retriever/flatcoated' },
  { test: /kudrnatý retriever|curly/i, slug: 'retriever/curly' },
  { test: /chesapeake/i, slug: 'retriever/chesapeake' },
  { test: /italský chrt/i, slug: 'greyhound/italian' },
  { test: /greyhound|anglický chrt|whippet|whipet|levrier|levrette|maďarský chrt|sicilský chrt|polský chrt|slovenský chrt|španělský galgo/i, slug: 'whippet' },
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
  { test: /papillon|kontinentální toy|butterfly|phal[eé]ne/i, slug: 'papillon' },
  { test: /pekingský|pekingese|pekinese/i, slug: 'pekinese' },
  { test: /opičí pinč|affenpinscher/i, slug: 'affenpinscher' },
  { test: /pinscher|pinč/i, slug: 'pinscher/miniature' },
  { test: /pitbull|pit bull/i, slug: 'pitbull' },
  { test: /pomeranian|německý špic trpasličí|špic.*patron|patron/i, slug: 'pomeranian' },
  { test: /pudl|poodle/i, slug: 'poodle/standard' },
  { test: /pyrenean|pyrenejsk/i, slug: 'pyrenees' },
  { test: /rhodesian|ridgeback/i, slug: 'ridgeback/rhodesian' },
  { test: /rottweil|rotvajler/i, slug: 'rottweiler' },
  { test: /boxer/i, slug: 'boxer' },
  { test: /naháč|mexicanhairless|hairless/i, slug: 'mexicanhairless' },
  { test: /shetland|šeltie/i, slug: 'sheepdog/shetland' },
  { test: /bobtail|old english/i, slug: 'sheepdog/english' },
  { test: /kavkaz|ovcharka|caucasian/i, slug: 'ovcharka/caucasian' },
  { test: /ibiz|podenco/i, slug: 'hound/ibizan' },
  { test: /buhund/i, slug: 'buhund/norwegian' },
  { test: /losí pes|elkhound/i, slug: 'elkhound/norwegian' },
  { test: /farmářský|danishswedish|farmdog/i, slug: 'danishswedish/farmdog' },
  { test: /kn[ií]rač|schnauzer|šnauzer/i, slug: 'schnauzer/miniature' },
  { test: /collie|kolie/i, slug: 'collie/border' },
  { test: /gordon setr|gordon setter/i, slug: 'setter/gordon' },
  { test: /irský setr|irish setter/i, slug: 'setter/irish' },
  { test: /setr|setter/i, slug: 'setter/english' },
  { test: /shar[\s-]?pei|sharpei/i, slug: 'sharpei' },
  { test: /shiba/i, slug: 'shiba' },
  { test: /shihtzu|shih tzu|shih-tzu/i, slug: 'shihtzu' },
  { test: /kokr|cockerspaniel|cocker spaniel|cocker/i, slug: 'spaniel/cocker' },
  { test: /springer|špringr/i, slug: 'springer/english' },
  { test: /japan-chin|japonský chin|spaniel.*japanese/i, slug: 'spaniel/japanese' },
  { test: /španěl|spaniel/i, slug: 'spaniel/welsh' },
  { test: /bernard|bernardýn|st\. bernard/i, slug: 'stbernard' },
  { test: /vizsla|výmarský ohař|weimaraner/i, slug: 'weimaraner' },
  { test: /west highland|westík/i, slug: 'terrier/westhighland' },
  { test: /york|yorkshire|biewer/i, slug: 'terrier/yorkshire' },
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
  { test: /griffon|grifon|grifonek|brabant/i, slug: 'brabancon' },
  { test: /briard/i, slug: 'briard' },
  { test: /bouvier/i, slug: 'bouvier' },
  { test: /schipperke|šiperka/i, slug: 'schipperke' },
  { test: /keeshond/i, slug: 'keeshond' },
  { test: /vodní pes|waterdog/i, slug: 'waterdog/spanish' },
  { test: /lajka|spitz|špic/i, slug: 'spitz/japanese' },
  { test: /ovčák|sheepdog|shepherd|pastýř|salašnick/i, slug: 'german/shepherd' },
  { test: /terier|terrier|teriér/i, slug: 'terrier/yorkshire' },
  { test: /chrt|levrier/i, slug: 'whippet' },
  { test: /honič|hound|brakýř|barvář/i, slug: 'hound/basset' },
]

/** Breed-accurate Unsplash photos (verified look matches breed type). */
/** @type {Record<string, string>} */
const CAT_BREED_IMAGES = {
  'Směs plemen': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Americký curl dlouhosrstý': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Americký curl krátkosrstý': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Balinéská kočka': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Barmská kočka': UNSPLASH('photo-1766495487287-5b95e89850d9'),
  'Bengálská kočka': UNSPLASH('photo-1592194996308-7a438c28d57a'),
  Birma: UNSPLASH('photo-1757956288643-7f3f7f7878ca'),
  Bombay: UNSPLASH('photo-1572007775901-b0635e10cb4c'),
  // British / Chartreux type — round face, plush short coat (NOT photo-157386… which is Maine Coon)
  'Britská dlouhosrstá kočka': UNSPLASH('photo-1512873897628-eea05c840147'),
  'Britská krátkosrstá kočka': UNSPLASH('photo-1766495487287-5b95e89850d9'),
  Burmilla: UNSPLASH('photo-1766495487287-5b95e89850d9'),
  // Rex = short wavy coat (not fluffy longhair / not tabby stand-in)
  'Cornish rex': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Devon rex': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Dlouhosrstá domácí kočka': UNSPLASH('photo-1596854407944-b687e052603b'),
  // Hairless breeds — must show Sphynx-type cats, not fluffies
  'Donský sphynx': UNSPLASH('photo-1647999534455-374509881d67'),
  'Egyptská mau': UNSPLASH('photo-1592194996308-7a438c28d57a'),
  'Evropská kočka': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Exotická kočka': UNSPLASH('photo-1523659568202-85268a087db7'),
  'German rex': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Habešská kočka': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  'Japonský bobtail krátkosrstý': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Kartouzská kočka': UNSPLASH('photo-1512873897628-eea05c840147'),
  Korat: UNSPLASH('photo-1548247417-ec67f20cf625'),
  'Krátkosrstá domácí kočka': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Kurilský bobtail dlouhosrstý': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Kurilský bobtail krátkosrstý': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Kymerská kočka': UNSPLASH('photo-1596854407944-b687e052603b'),
  'LaPerm dlouhosrstá': UNSPLASH('photo-1596854407944-b687e052603b'),
  'LaPerm krátkosrstá': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  Lykoi: UNSPLASH('photo-1518791841217-8f162f1e1131'),
  // Longhair forest breeds — real Maine Coon type (NOT photo-158730… which is a dog)
  'Mainská kočka mývalí': UNSPLASH('photo-1728145544525-f7baba143d2a'),
  'Manská kočka': UNSPLASH('photo-1514888286974-6c03e2ca1dba'),
  'Něvská maškaráda': UNSPLASH('photo-1757956288643-7f3f7f7878ca'),
  'Norská kočka lesní': UNSPLASH('photo-1685271286659-c83faa4f5cb1'),
  Ocicat: UNSPLASH('photo-1592194996308-7a438c28d57a'),
  'Orientální kočka dlouhosrstá': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Orientální kočka krátkosrstá': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Perská kočka': UNSPLASH('photo-1523659568202-85268a087db7'),
  Peterbald: UNSPLASH('photo-1695124121977-f0722c3999fe'),
  Ragdoll: UNSPLASH('photo-1629068136524-f467f8efa109'),
  'Ruská modrá kočka': UNSPLASH('photo-1548247417-ec67f20cf625'),
  'Selkirk rex dlouhosrstý': UNSPLASH('photo-1596854407944-b687e052603b'),
  'Selkirk rex krátkosrstý': UNSPLASH('photo-1518791841217-8f162f1e1131'),
  // Pointed breeds — classic seal-point Siamese (NOT tabby photo-157415…)
  'Siamská kočka': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Sibiřská kočka': UNSPLASH('photo-1768917459172-72af863dd4a1'),
  Singapura: UNSPLASH('photo-1518791841217-8f162f1e1131'),
  Snowshoe: UNSPLASH('photo-1773769730444-7dec13f33b45'),
  Sokoke: UNSPLASH('photo-1592194996308-7a438c28d57a'),
  'Somálská kočka': UNSPLASH('photo-1685271286659-c83faa4f5cb1'),
  Sphynx: UNSPLASH('photo-1547565322-847851d7ef2f'),
  'Thajská kočka': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Turecká angora': UNSPLASH('photo-1592385672401-ab91fccb6fd5'),
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
  Bombay: UNSPLASH('photo-1529778873920-4da49237a0b8'),
  'Britská dlouhosrstá kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Britská krátkosrstá kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  Burmilla: UNSPLASH('photo-1545249395878-3829457786b1'),
  'Cornish rex': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Devon rex': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Dlouhosrstá domácí kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Donský sphynx': UNSPLASH('photo-1695124121977-f0722c3999fe'),
  'Egyptská mau': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Evropská kočka': CAT_DEFAULT_COVER,
  'Exotická kočka': UNSPLASH('photo-1592385672401-ab91fccb6fd5'),
  'German rex': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Habešská kočka': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Japonský bobtail krátkosrstý': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Kartouzská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  Korat: UNSPLASH('photo-1548247417-ec67f20cf625'),
  'Krátkosrstá domácí kočka': CAT_DEFAULT_COVER,
  'Kurilský bobtail dlouhosrstý': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Kurilský bobtail krátkosrstý': UNSPLASH('photo-1495360010541-f087ead7202f'),
  'Kymerská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'LaPerm dlouhosrstá': UNSPLASH('photo-1545249395878-3829457786b1'),
  'LaPerm krátkosrstá': UNSPLASH('photo-1545249395878-3829457786b1'),
  Lykoi: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Mainská kočka mývalí': UNSPLASH('photo-1685271286659-c83faa4f5cb1'),
  'Manská kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Něvská maškaráda': UNSPLASH('photo-1629068136524-f467f8efa109'),
  'Norská kočka lesní': UNSPLASH('photo-1768917459172-72af863dd4a1'),
  Ocicat: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Orientální kočka dlouhosrstá': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Orientální kočka krátkosrstá': UNSPLASH('photo-1773769730444-7dec13f33b45'),
  'Perská kočka': UNSPLASH('photo-1592385672401-ab91fccb6fd5'),
  Peterbald: UNSPLASH('photo-1547565322-847851d7ef2f'),
  Ragdoll: UNSPLASH('photo-1725332119493-bbd7a2833b33'),
  'Ruská modrá kočka': UNSPLASH('photo-1545249395878-3829457786b1'),
  'Selkirk rex dlouhosrstý': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Selkirk rex krátkosrstý': UNSPLASH('photo-1513364777861-7528a2401784'),
  'Siamská kočka': UNSPLASH('photo-1757956288643-7f3f7f7878ca'),
  'Sibiřská kočka': UNSPLASH('photo-1728145544525-f7baba143d2a'),
  Singapura: UNSPLASH('photo-1513364777861-7528a2401784'),
  Snowshoe: UNSPLASH('photo-1773769730444-7dec13f33b45'),
  Sokoke: UNSPLASH('photo-1513364777861-7528a2401784'),
  'Somálská kočka': UNSPLASH('photo-1685271286659-c83faa4f5cb1'),
  Sphynx: UNSPLASH('photo-1695124121977-f0722c3999fe'),
  'Thajská kočka': UNSPLASH('photo-1773769730444-7dec13f33b45'),
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

  // Prefer ImageNet-style shots (n0…) over casual phone uploads (img_…).
  const ranked = [...data.message].sort((a, b) => dogCeoQualityScore(b) - dogCeoQualityScore(a))
  const profile = ranked[0]
  const cover =
    ranked.length > 1 && ranked[1] !== profile ? ranked[1] : DOG_DEFAULT_COVER
  return { profile, cover }
}

function dogCeoQualityScore(url) {
  if (/\/n0\d+_/.test(url)) return 3
  if (/\/n\d+_/.test(url)) return 2
  if (/img_/i.test(url)) return 0
  return 1
}

async function resolveDogImages(breed) {
  const curated = DOG_CURATED_IMAGES[breed]
  if (curated) {
    return { profile: curated, cover: DOG_DEFAULT_COVER }
  }

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
import type { PetType } from './petTypes'
import { petPlaceholderImages } from './petTypes'

export const DOG_BREED_IMAGES: Record<string, string> = {
${formatMap(dogImages)}
}

export const CAT_BREED_IMAGES: Record<string, string> = {
${formatMap(catImages)}
}

export function getDefaultBreedImage(type: PetType, breed: string): string {
  const map = type === 'dog' ? DOG_BREED_IMAGES : CAT_BREED_IMAGES
  return map[breed] ?? petPlaceholderImages[type]
}

const managedBreedDefaultUrls = new Set<string>([
  ...Object.values(DOG_BREED_IMAGES),
  ...Object.values(CAT_BREED_IMAGES),
  ...Object.values(petPlaceholderImages),
])

/** Old wrong defaults (e.g. fluffy cat used for Sphynx) so existing pets can be corrected. */
const LEGACY_BREED_DEFAULT_URL_FRAGMENTS = [
  'images.dog.ceo/',
  'photo-1511044568932-338cba0ad803',
  'photo-1513364777861-7528a2401784',
  'photo-1529778873920-4da49237a0b8',
  'photo-1574158622682-e40e69881006',
  'photo-1573865526739-10659fec78a5',
  'photo-1587300003388-59208cc962cb',
  'photo-1517849845537-4d257902454a',
  'photo-1561948955-570b270e7c36',
  'photo-1537151608828-ea2b11777ee8',
  'photo-1558788353-f76d92427f16',
  'photo-1533738363-b7f9aef128ce',
  'mix/noah01',
] as const

/** True when the URL is a system breed placeholder (not a user upload). */
export function isBreedDefaultImage(url: string | undefined | null): boolean {
  if (!url || url.startsWith('data:')) return false
  if (managedBreedDefaultUrls.has(url)) return true
  return LEGACY_BREED_DEFAULT_URL_FRAGMENTS.some((fragment) => url.includes(fragment))
}

/** Refresh pet.image when it still points at a managed/legacy breed default. */
export function syncPetBreedDefaultImage<T extends { type: PetType; breed: string; image?: string }>(
  pet: T,
): T {
  if (!isBreedDefaultImage(pet.image)) return pet
  const next = getDefaultBreedImage(pet.type, pet.breed)
  if (pet.image === next) return pet
  return { ...pet, image: next }
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
