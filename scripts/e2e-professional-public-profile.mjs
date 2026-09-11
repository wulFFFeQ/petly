/**
 * E2E: Professional public profile (KROK 24)
 * Run: node scripts/e2e-professional-public-profile.mjs
 * Requires: npm run dev
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = path.join(process.cwd(), 'scripts', 'e2e-artifacts')
const failures = []

function assert(cond, msg) {
  if (!cond) {
    failures.push(msg)
    console.error('FAIL:', msg)
  } else {
    console.log('OK  :', msg)
  }
}

async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.screenshot({
    path: path.join(OUT, `pro-public-${name}.png`),
    fullPage: true,
  })
}

const VET_ID = 'e2e_pub_vet'
const BREEDER_ID = 'e2e_pub_breeder'
const PRIVATE_ID = 'e2e_pub_private'
const BREEDING_PET_ID = 'e2e_breeding_astra'

const SEED_ACCOUNT = {
  id: 'owner_self',
  kind: 'consumer',
  roles: ['owner', 'veterinarian', 'breeder'],
  displayName: 'E2E Public Owner',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const SEED_PROFILES = [
  {
    id: VET_ID,
    accountId: 'owner_self',
    type: 'veterinarian',
    displayName: 'MUDr. Public Profile Vet',
    organizationName: 'Public Profile Clinic',
    description: 'Komplexní veterinární péče pro psy a kočky.',
    address: 'Tajná Ulice 42',
    phone: '+420777111222',
    email: 'public-vet@example.com',
    city: 'Praha 2',
    website: 'https://public-vet.example.com',
    services: ['Preventivní péče', 'Očkování', 'Vyšetření'],
    specializations: ['Dermatologie', 'Psi'],
    hoursSummary: 'Po–Pá 8–18',
    professionalCredentials: { licenseNumber: 'E2E-SECRET-LIC' },
    verificationStatus: 'verified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: BREEDER_ID,
    accountId: 'owner_self',
    type: 'breeder',
    displayName: 'Chovatelská stanice Public Bohemia',
    description: 'Chov německých ovčáků.',
    city: 'Brno',
    services: ['Chov', 'Výstavní příprava'],
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: PRIVATE_ID,
    accountId: 'owner_self',
    type: 'groomer',
    displayName: 'Hidden Private Groomer',
    city: 'Ostrava',
    verificationStatus: 'unverified',
    publicVisibility: 'private',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_VERIFICATIONS = [
  {
    id: 'e2e_pub_trust',
    subjectType: 'professional',
    subjectId: VET_ID,
    type: 'identity',
    status: 'verified',
    source: 'identity_provider',
    presentation: 'trust',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  },
]

const SEED_PET = {
  id: BREEDING_PET_ID,
  name: 'Astra Public',
  type: 'dog',
  breed: 'Německý ovčák',
  image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=200',
  age: 3,
  weight: 32,
  microchip: '98511200E2ESECRET',
  healthStatus: 'healthy',
  dateOfBirth: '2022-04-01',
  neutered: false,
  publicDiscover: true,
  breedingProfile: true,
  breeding: {
    info: { kennelName: 'Public Bohemia', registrationNumber: 'REG-E2E-SECRET' },
    titles: [{ id: 't1', name: 'CACIB' }],
    shows: [{ id: 's1', name: 'Brno Show', date: '2025-05-01', result: 'BOB' }],
    pedigree: [
      { id: 'p1', role: 'sire', name: 'Rex' },
      { id: 'p2', role: 'dam', name: 'Lada' },
    ],
    litters: [{ id: 'l1', birthDate: '2024-06-01', totalCount: 4 }],
    healthTests: [{ id: 'h1', name: 'HD', result: 'A', protocolNumber: 'E2E-PROTO' }],
  },
}

async function seed(page, { withBreedingPrivacy = true } = {}) {
  await page.evaluate(
    ({ profiles, account, verifications, pet, withBreedingPrivacy }) => {
      localStorage.clear()
      localStorage.setItem('lovedandknown.onboardingCompleted', 'true')
      localStorage.setItem('lovedandknown.accounts', JSON.stringify([account]))
      localStorage.setItem('lovedandknown.professionalProfiles', JSON.stringify(profiles))
      localStorage.setItem('lovedandknown.verifications', JSON.stringify(verifications))
      localStorage.setItem('lovedandknown.petProfessionalAccess', JSON.stringify([]))
      localStorage.setItem('lovedandknown.professionalAccessLogs', JSON.stringify([]))

      const existing = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
      const without = existing.filter((p) => p.id !== pet.id)
      without.push(pet)
      localStorage.setItem('lovedandknown.pets', JSON.stringify(without))

      if (withBreedingPrivacy) {
        localStorage.setItem(
          'lovedandknown.privacySettings',
          JSON.stringify({
            account: {},
            pets: {
              [pet.id]: {
                name: 'public',
                photos: 'public',
                speciesBreed: 'public',
                ageDob: 'public',
                location: 'public',
                breeding: 'public',
                microchip: 'private',
                health: 'private',
              },
            },
          }),
        )
      }
    },
    {
      profiles: SEED_PROFILES,
      account: SEED_ACCOUNT,
      verifications: SEED_VERIFICATIONS,
      pet: SEED_PET,
      withBreedingPrivacy,
    },
  )
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await seed(page)
  await page.reload({ waitUntil: 'networkidle' })
  await page.goto(`${BASE}/professionals/${VET_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  assert(
    await page.locator('[data-testid="professional-public-page"]').isVisible(),
    `${label} – public profile renders`,
  )
  assert(
    await page.locator('[data-testid="professional-hero"]').isVisible(),
    `${label} – hero visible`,
  )
  assert(
    await page.locator('[data-testid="professional-verified-badge"]').isVisible(),
    `${label} – verified badge from trust`,
  )
  assert(
    await page.locator('[data-testid="professional-trust"]').isVisible(),
    `${label} – trust section`,
  )
  assert(
    await page.locator('[data-testid="professional-services"]').isVisible(),
    `${label} – services section`,
  )
  assert(
    await page.locator('[data-testid="professional-specializations"]').isVisible(),
    `${label} – specializations section`,
  )
  assert(
    await page.locator('[data-testid="professional-location"]').isVisible(),
    `${label} – location section`,
  )
  assert(
    await page.locator('[data-testid="professional-contact"]').isVisible(),
    `${label} – contact section`,
  )
  assert(
    await page.locator('[data-testid="pro-connect-with-pet"]').isVisible(),
    `${label} – connect CTA`,
  )

  const pageText = await page.locator('[data-testid="professional-public-page"]').innerText()
  assert(!pageText.includes('Tajná Ulice'), `${label} – no private street address`)
  assert(!pageText.includes('E2E-SECRET-LIC'), `${label} – no license number`)
  assert(!pageText.includes('98511200E2ESECRET'), `${label} – no microchip on vet page`)
  assert(
    !(await page.locator('[data-testid="professional-breeding"]').count()),
    `${label} – breeding hidden for veterinarian`,
  )

  await page.locator('[data-testid="pro-connect-with-pet"]').click()
  await page.waitForTimeout(200)
  assert(
    await page.locator('[data-testid="connect-professional-modal"]').isVisible(),
    `${label} – CTA opens existing access modal`,
  )
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)

  await shot(page, `${label}-vet`)

  // Catalog → detail consistency
  await page.goto(`${BASE}/professionals`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  const card = page.locator(`[href="/professionals/${VET_ID}"]`).first()
  assert(await card.count(), `${label} – catalog card links to detail`)
  await page.goto(`${BASE}/professionals/${VET_ID}`, { waitUntil: 'networkidle' })
  assert(
    await page.locator('[data-testid="professional-public-page"]').isVisible(),
    `${label} – detail after catalog path`,
  )

  // Private profile gated
  await page.goto(`${BASE}/professionals/${PRIVATE_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  assert(
    await page.locator('[data-testid="professional-public-missing"]').isVisible(),
    `${label} – private profile not public`,
  )

  // Breeder + breeding section
  await page.goto(`${BASE}/professionals/${BREEDER_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  assert(
    await page.locator('[data-testid="professional-public-page"]').isVisible(),
    `${label} – breeder public page`,
  )
  assert(
    await page.locator('[data-testid="professional-breeding"]').isVisible(),
    `${label} – breeding section for breeder with data`,
  )
  assert(
    await page.locator(`[data-testid="professional-breeding-animal-${BREEDING_PET_ID}"]`).isVisible(),
    `${label} – breeding animal card`,
  )
  const breederText = await page.locator('[data-testid="professional-breeding"]').innerText()
  assert(breederText.includes('Astra Public'), `${label} – breeding animal name`)
  assert(breederText.includes('CACIB'), `${label} – public title visible`)
  assert(!breederText.includes('98511200E2ESECRET'), `${label} – no microchip in breeding`)
  assert(!breederText.includes('REG-E2E-SECRET'), `${label} – no registration in breeding`)
  assert(!breederText.includes('E2E-PROTO'), `${label} – no health protocol in breeding`)
  assert(
    !(await page.locator('[data-testid="professional-verified-badge"]').count()),
    `${label} – breeder has no fake verified badge`,
  )

  await shot(page, `${label}-breeder`)

  // Breeder without breeding data → hide section
  await page.evaluate((petId) => {
    const list = JSON.parse(localStorage.getItem('lovedandknown.pets') || '[]')
    localStorage.setItem(
      'lovedandknown.pets',
      JSON.stringify(
        list.map((p) =>
          p.id === petId
            ? { ...p, breedingProfile: false, breeding: undefined, publicDiscover: false }
            : p,
        ),
      ),
    )
  }, BREEDING_PET_ID)
  await page.reload({ waitUntil: 'networkidle' })
  await page.goto(`${BASE}/professionals/${BREEDER_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert(
    !(await page.locator('[data-testid="professional-breeding"]').count()),
    `${label} – breeding hidden without data`,
  )

  // Layout smoke: no horizontal overflow
  const overflow = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="professional-public-page"]')
    if (!el) return true
    return el.scrollWidth > el.clientWidth + 2
  })
  assert(!overflow, `${label} – no horizontal overflow`)

  await context.close()
}

async function main() {
  console.log('Starting Professional Public Profile E2E against', BASE)
  const browser = await chromium.launch({ headless: true })

  await runViewport(browser, { width: 1280, height: 900 }, 'desktop')
  await runViewport(browser, { width: 390, height: 844 }, 'mobile')

  await browser.close()

  if (failures.length) {
    console.error(`\n${failures.length} failure(s)`)
    process.exit(1)
  }
  console.log('\nAll professional public profile E2E checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
