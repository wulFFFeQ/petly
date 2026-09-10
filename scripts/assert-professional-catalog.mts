/**
 * Assert professional public catalog (KROK 20).
 * Run: npx tsx scripts/assert-professional-catalog.mts
 *
 * A – public professional se zobrazí v listPublicProfessionals
 * B – private professional se nezobrazí
 * C – owner se nezobrazí jako professional
 * D – filtrování podle role
 * E – search funguje nad public fields
 * F – přesná adresa / soukromé coords se nikdy nepropíšou
 * G – health/chip/PII se nikdy nepropíšou
 * H – verification badge pouze pro verified + active trust
 * I – DEMO verification nemá trust badge
 * J – detail path používá stejné id jako public projection
 * K – public projection je stejná jako na detailu (toPublicProfessionalProfile)
 * L – empty / filter bez výsledků
 * M – query param filtr round-trip (parse/build)
 * N – řazení je deterministické (verified před unverified při stejné relevanci)
 */
import assert from 'node:assert/strict'
import {
  assertPublicProfessionalSafe,
  buildCatalogSearchParams,
  catalogHasActiveFilters,
  filterPublicProfessionals,
  listPublicProfessionals,
  matchProfessionalCatalogQuery,
  parseCatalogSearchParams,
  queryPublicProfessionals,
  saveProfessionalProfiles,
  sortPublicProfessionals,
  toPublicProfessionalProfile,
  type ProfessionalProfile,
  type PublicProfessionalProfile,
} from '../src/lib/professional/index.ts'
import type { Verification } from '../src/lib/verification/types.ts'

function installMemoryStorage() {
  const store = new Map<string, string>()
  const memory = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  })
  return memory
}

const memory = installMemoryStorage()

let passed = 0
let failed = 0

function check(label: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK  ${label}`)
    passed += 1
  } catch (err) {
    failed += 1
    console.error(`  FAIL  ${label}`)
    console.error(err)
  }
}

function basePro(overrides: Partial<ProfessionalProfile> = {}): ProfessionalProfile {
  return {
    id: 'pro_cat_1',
    accountId: 'acc_cat_1',
    type: 'veterinarian',
    displayName: 'MUDr. Martin Novák',
    organizationName: 'PetCare Central Praha',
    description: 'Preventivní péče a chirurgie',
    address: 'Vinohradská 123/45',
    phone: '+420777111222',
    email: 'martin.secret@example.com',
    city: 'Praha 2',
    services: ['chirurgie', 'dermatologie'],
    specializations: ['preventivní péče'],
    professionalCredentials: { licenseNumber: 'LIC-SECRET-99' },
    verificationStatus: 'unverified',
    publicVisibility: 'public',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function trustVer(subjectId: string): Verification {
  return {
    id: `trust_${subjectId}`,
    subjectType: 'professional',
    subjectId,
    type: 'veterinary',
    status: 'verified',
    source: 'vet_attestation',
    presentation: 'trust',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
}

function demoVer(subjectId: string): Verification {
  return {
    id: `demo_${subjectId}`,
    subjectType: 'professional',
    subjectId,
    type: 'veterinary',
    status: 'verified',
    source: 'local_demo',
    presentation: 'demo',
    verifiedAt: '2026-01-01T00:00:00.000Z',
  }
}

console.log('KROK 20 – assert-professional-catalog')

check('A – public professional se zobrazí', () => {
  memory.clear()
  const publicPro = basePro({ id: 'pro_public', publicVisibility: 'public' })
  saveProfessionalProfiles([publicPro])
  const list = listPublicProfessionals([])
  assert.equal(list.length, 1)
  assert.equal(list[0]!.id, 'pro_public')
  assert.equal(list[0]!.displayName, 'MUDr. Martin Novák')
})

check('B – private professional se nezobrazí', () => {
  memory.clear()
  saveProfessionalProfiles([
    basePro({ id: 'pro_pub', publicVisibility: 'public', displayName: 'Public Vet' }),
    basePro({ id: 'pro_priv', publicVisibility: 'private', displayName: 'Private Vet' }),
  ])
  const list = listPublicProfessionals([])
  assert.equal(list.length, 1)
  assert.equal(list[0]!.id, 'pro_pub')
  assert.ok(!list.some((p) => p.id === 'pro_priv'))
})

check('C – owner se nezobrazí jako professional', () => {
  memory.clear()
  const fakeOwner = basePro({
    id: 'pro_owner_fake',
    type: 'owner' as ProfessionalProfile['type'],
    publicVisibility: 'public',
    displayName: 'Jen majitel',
  })
  saveProfessionalProfiles([fakeOwner, basePro({ id: 'pro_real', type: 'groomer' })])
  const list = listPublicProfessionals([])
  assert.ok(!list.some((p) => p.type === ('owner' as string)))
  assert.equal(list.length, 1)
  assert.equal(list[0]!.type, 'groomer')
})

check('D – správné filtrování podle role', () => {
  memory.clear()
  saveProfessionalProfiles([
    basePro({ id: 'v1', type: 'veterinarian', displayName: 'Vet A' }),
    basePro({ id: 'g1', type: 'groomer', displayName: 'Groom A' }),
    basePro({ id: 't1', type: 'trainer', displayName: 'Train A' }),
  ])
  const all = listPublicProfessionals([])
  const vets = filterPublicProfessionals(all, { role: 'veterinarian' })
  assert.equal(vets.length, 1)
  assert.equal(vets[0]!.type, 'veterinarian')
  const groomers = queryPublicProfessionals({ role: 'groomer' }, [])
  assert.equal(groomers.length, 1)
  assert.equal(groomers[0]!.id, 'g1')
})

check('E – search funguje nad public fields', () => {
  memory.clear()
  saveProfessionalProfiles([
    basePro({
      id: 's1',
      displayName: 'Alpha Klinika',
      city: 'Brno',
      services: ['ortopedie'],
      organizationName: 'Alpha Org',
    }),
    basePro({
      id: 's2',
      displayName: 'Beta Salon',
      type: 'groomer',
      city: 'Praha 2',
      services: ['střih'],
    }),
  ])
  const all = listPublicProfessionals([])
  assert.ok(matchProfessionalCatalogQuery(all[0]!, 'alpha'))
  assert.ok(matchProfessionalCatalogQuery(all[0]!, 'ortopedie'))
  assert.ok(matchProfessionalCatalogQuery(all[0]!, 'brno'))
  assert.equal(filterPublicProfessionals(all, { q: 'Alpha' }).length, 1)
  assert.equal(filterPublicProfessionals(all, { q: 'střih' })[0]!.id, 's2')
  assert.equal(filterPublicProfessionals(all, { q: 'Veterinář' }).some((p) => p.id === 's1'), true)
  // Must NOT match private-only fields via search on public list
  for (const pub of all) {
    assert.equal(matchProfessionalCatalogQuery(pub, 'Vinohradská'), false)
    assert.equal(matchProfessionalCatalogQuery(pub, 'martin.secret'), false)
    assert.equal(matchProfessionalCatalogQuery(pub, '+420777'), false)
    assert.equal(matchProfessionalCatalogQuery(pub, 'LIC-SECRET'), false)
  }
})

check('F – přesná adresa / soukromé coords se nikdy nepropíšou', () => {
  memory.clear()
  const profile = basePro({
    address: 'Vinohradská 123/45',
    city: 'Praha 2',
  })
  saveProfessionalProfiles([profile])
  const pub = listPublicProfessionals([])[0]!
  assertPublicProfessionalSafe(pub)
  const json = JSON.stringify(pub)
  assert.ok(!json.includes('Vinohradská'))
  assert.ok(!json.includes('123/45'))
  assert.equal((pub as Record<string, unknown>).address, undefined)
  assert.equal((pub as Record<string, unknown>).latitude, undefined)
  assert.equal((pub as Record<string, unknown>).longitude, undefined)
  assert.equal((pub as Record<string, unknown>).coords, undefined)
  assert.equal(pub.city, 'Praha 2')
})

check('G – health/chip/PII se nikdy nepropíšou', () => {
  const profile = basePro({ publicVisibility: 'public' })
  const pub = toPublicProfessionalProfile(profile)!
  assertPublicProfessionalSafe(pub)
  const record = pub as Record<string, unknown>
  assert.equal(record.accountId, undefined)
  assert.equal(record.health, undefined)
  assert.equal(record.microchip, undefined)
  assert.equal(record.ownerContacts, undefined)
  assert.equal(record.professionalCredentials, undefined)
  assert.equal(record.licenseNumber, undefined)
  const json = JSON.stringify(pub)
  assert.ok(!json.includes('LIC-SECRET'))
  assert.ok(!json.includes('acc_cat_1') || json.includes('"id"')) // id is public; accountId is not
  assert.ok(!json.includes('"accountId"'))
})

check('H – verification badge pouze pro skutečně verified + active trust', () => {
  memory.clear()
  const profile = basePro({
    id: 'pro_trust',
    verificationStatus: 'verified',
    publicVisibility: 'public',
  })
  saveProfessionalProfiles([profile])
  const without = listPublicProfessionals([])[0]!
  assert.equal(without.verifiedBadge, undefined)

  const withTrust = listPublicProfessionals([trustVer('pro_trust')])[0]!
  assert.equal(withTrust.verifiedBadge, true)
})

check('I – DEMO verification nemá trust badge', () => {
  memory.clear()
  const profile = basePro({
    id: 'pro_demo',
    verificationStatus: 'verified',
    publicVisibility: 'public',
  })
  saveProfessionalProfiles([profile])
  const pub = listPublicProfessionals([demoVer('pro_demo')])[0]!
  assert.equal(pub.verifiedBadge, undefined)
})

check('J – kliknutí / detail používá public id', () => {
  memory.clear()
  saveProfessionalProfiles([basePro({ id: 'pro_detail_42' })])
  const pub = listPublicProfessionals([])[0]!
  assert.equal(pub.id, 'pro_detail_42')
  assert.equal(`/professionals/${pub.id}`, '/professionals/pro_detail_42')
})

check('K – public projection je stejná jako na detailu', () => {
  memory.clear()
  const profile = basePro({
    id: 'pro_same',
    verificationStatus: 'verified',
  })
  const verifications = [trustVer('pro_same')]
  saveProfessionalProfiles([profile])
  const fromCatalog = listPublicProfessionals(verifications)[0]!
  const fromDetail = toPublicProfessionalProfile(profile, { verifications })!
  assert.deepEqual(fromCatalog, fromDetail)
})

check('L – empty state / žádné výsledky při filtru', () => {
  memory.clear()
  assert.equal(listPublicProfessionals([]).length, 0)
  assert.equal(catalogHasActiveFilters({}), false)

  saveProfessionalProfiles([basePro({ type: 'groomer', id: 'only_groom' })])
  const filtered = queryPublicProfessionals({ role: 'veterinarian' }, [])
  assert.equal(filtered.length, 0)
  assert.equal(catalogHasActiveFilters({ role: 'veterinarian' }), true)
})

check('M – query param filtr přežije reload (parse/build)', () => {
  const criteria = {
    role: 'veterinarian' as const,
    q: 'Martin',
    city: 'Praha',
    verifiedOnly: true,
    serviceQuery: 'chirurgie',
  }
  const params = buildCatalogSearchParams(criteria)
  assert.equal(params.get('role'), 'veterinarian')
  assert.equal(params.get('q'), 'Martin')
  assert.equal(params.get('location'), 'Praha')
  assert.equal(params.get('verified'), '1')
  assert.equal(params.get('service'), 'chirurgie')

  const round = parseCatalogSearchParams(params)
  assert.equal(round.role, 'veterinarian')
  assert.equal(round.q, 'Martin')
  assert.equal(round.city, 'Praha')
  assert.equal(round.verifiedOnly, true)
  assert.equal(round.serviceQuery, 'chirurgie')

  // distance/species prepared but not written to URL
  assert.equal(params.has('distance'), false)
  assert.equal(params.has('species'), false)
})

check('N – deterministické řazení preferuje verified', () => {
  const a: PublicProfessionalProfile = {
    id: 'z_unverified',
    type: 'veterinarian',
    displayName: 'Alpha Vet',
  }
  const b: PublicProfessionalProfile = {
    id: 'a_verified',
    type: 'veterinarian',
    displayName: 'Beta Vet',
    verifiedBadge: true,
  }
  const sorted = sortPublicProfessionals([a, b], {})
  assert.equal(sorted[0]!.id, 'a_verified')
  assert.equal(sorted[1]!.id, 'z_unverified')

  const byName = sortPublicProfessionals(
    [
      { id: '2', type: 'groomer', displayName: 'Zeta' },
      { id: '1', type: 'groomer', displayName: 'Alpha' },
    ],
    {},
  )
  assert.equal(byName[0]!.displayName, 'Alpha')
})

console.log('')
console.log(`Passed: ${passed}, Failed: ${failed}`)
if (failed > 0) process.exit(1)
