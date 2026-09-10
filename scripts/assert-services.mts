/**
 * Assert travel readiness + contacts helpers (unit).
 * Run: npx tsx scripts/assert-services.mts
 */
import assert from 'node:assert/strict'
import {
  buildPetTravelPackage,
  getDestinationReadiness,
  getRequirementStatus,
  overallReadinessLabel,
} from '../src/lib/travel/buildTravelReadiness.ts'
import {
  contactByTypeForPet,
  normalizeImportantContact,
  primaryContactForPet,
} from '../src/lib/contacts/normalize.ts'
import { sanitizeDiscoverPet } from '../src/lib/discover/privacy.ts'
import type {
  HealthRecord,
  ImportantContact,
  Pet,
  PetDocument,
  TravelDestination,
  TravelPrefs,
} from '../src/types/index.ts'

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'luna',
    name: 'Luna',
    type: 'dog',
    breed: 'Retriever',
    image: 'https://example.com/l.jpg',
    age: 4,
    microchip: '985112004567890',
    ...overrides,
  }
}

const dest: TravelDestination = {
  id: 'de',
  country: 'Německo',
  flagCode: 'de',
  emoji: '🇩🇪',
  summary: 'test',
  requirements: [
    {
      id: 'de_passport',
      category: 'passport',
      label: 'EU pas',
      detail: 'pas',
      check: 'eu_passport',
    },
    {
      id: 'de_rabies',
      category: 'vaccination',
      label: 'Vzteklina',
      detail: 'vzteklina',
      check: 'rabies',
    },
    {
      id: 'de_chip',
      category: 'microchip',
      label: 'Čip',
      detail: 'čip',
      check: 'microchip',
    },
    {
      id: 'de_tapeworm',
      category: 'other',
      label: 'Tasemnice',
      detail: 'ošetření',
      check: 'tapeworm',
    },
  ],
}

const docs: PetDocument[] = [
  {
    id: 'd1',
    petId: 'luna',
    name: 'EU pas',
    category: 'identification',
    documentType: 'eu_passport',
    fileName: 'pas.pdf',
    size: '1 MB',
    uploadedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2028-12-01',
    isPublic: false,
  },
]

const health: HealthRecord[] = [
  {
    id: 'h1',
    petId: 'luna',
    type: 'vaccination',
    title: 'Očkování',
    subtitle: 'Vzteklina',
    date: '2025-01-01',
    vaccineName: 'Nobivac Rabies',
  },
]

const emptyPrefs: TravelPrefs = { confirmations: {} }

// A) package from real data
const pack = buildPetTravelPackage(pet(), docs, health)
assert.equal(pack.euPassport.status, 'valid')
assert.ok(pack.microchip)
assert.match(pack.vaccinationSummary, /vzteklina|rabies/i)

// B) readiness overall
const readiness = getDestinationReadiness(dest, pack, emptyPrefs, 'luna')
assert.equal(readiness.overall, 'attention') // tapeworm not confirmed
assert.ok(readiness.incompleteSteps >= 1)
assert.match(overallReadinessLabel('attention', readiness.incompleteSteps), /dokončit/)
assert.equal(overallReadinessLabel('ready', 0), 'Připraveno k cestě')
assert.equal(overallReadinessLabel('missing', 1), 'Něco důležitého chybí')

// missing when no chip
const noChip = buildPetTravelPackage(pet({ microchip: '' }), docs, health)
const missingChip = getRequirementStatus('microchip', noChip, emptyPrefs, 'luna', 'de')
assert.equal(missingChip.status, 'missing')

// confirm tapeworm
const confirmed: TravelPrefs = {
  confirmations: { 'luna:de:tapeworm': '2026-09-10T00:00:00.000Z' },
}
const afterConfirm = getDestinationReadiness(dest, pack, confirmed, 'luna')
assert.equal(afterConfirm.overall, 'ready')

// Contacts normalize + primary
const legacy = normalizeImportantContact({
  id: 'x',
  type: 'emergency_person',
  name: 'Partner',
  phone: '+420 111',
  label: 'Kontakt pro nouzi',
})
assert.ok(legacy)
assert.equal(legacy!.type, 'custom')

const contacts: ImportantContact[] = [
  {
    id: 'c1',
    type: 'vet',
    name: 'Vet A',
    phone: '+420 1',
    petIds: ['luna'],
    primaryForPetIds: [],
  },
  {
    id: 'c2',
    type: 'custom',
    name: 'Primary Person',
    phone: '+420 2',
    petIds: ['luna'],
    primaryForPetIds: ['luna'],
  },
]
assert.equal(primaryContactForPet(contacts, 'luna')?.name, 'Primary Person')
assert.equal(contactByTypeForPet(contacts, 'luna', 'vet')?.name, 'Vet A')

// L) privacy — contacts must not survive sanitize
const leaky = {
  id: 'luna',
  name: 'Luna',
  type: 'dog',
  breed: 'Mix',
  age: 4,
  location: 'Kolín',
  image: 'https://example.com/l.jpg',
  phone: '+420 606 123 456',
  email: 'secret@example.com',
  address: 'Secret street',
  importantContacts: contacts,
  conciergeRequests: [{ id: 'cr1', description: 'help' }],
}
const sanitized = sanitizeDiscoverPet(leaky)
assert.ok(sanitized)
assert.equal((sanitized as Record<string, unknown>).phone, undefined)
assert.equal((sanitized as Record<string, unknown>).email, undefined)
assert.equal((sanitized as Record<string, unknown>).address, undefined)
assert.equal((sanitized as Record<string, unknown>).importantContacts, undefined)
assert.equal((sanitized as Record<string, unknown>).conciergeRequests, undefined)

console.log('OK: assert-services passed')
