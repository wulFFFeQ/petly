/**
 * Regression checks for breeding profile consistency (step 7C).
 * Run: npx tsx scripts/check-breeding-consistency.mts
 */
import assert from 'node:assert/strict'
import {
  upsertPedigreeAncestor,
  validateLitterCounts,
} from '../src/lib/breedingData.ts'
import {
  applyBreedingProfileRules,
  buildAutoHeatEvent,
  canAutoGenerateHeat,
  canHaveBreedingProfile,
  hasActiveBreedingProfile,
  hasActiveHeatForPet,
  isActiveHeatEvent,
  sanitizePetBreedingProfile,
} from '../src/lib/breedingProfile.ts'
import type { BreedingAncestor, CalendarEvent, Pet } from '../src/types/index.ts'

function baseFemaleDog(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'test-fena',
    name: 'Testa',
    type: 'dog',
    breed: 'Border kolie',
    age: 3,
    image: '',
    gender: 'Fena',
    neutered: false,
    breedingProfile: false,
    ...overrides,
  }
}

// ——— Pedigree uniqueness ———
{
  const sire1: BreedingAncestor = { id: 'a1', role: 'sire', name: 'Otec A' }
  const sire2: BreedingAncestor = { id: 'a2', role: 'sire', name: 'Otec B' }
  const dam: BreedingAncestor = { id: 'a3', role: 'dam', name: 'Matka' }
  const other: BreedingAncestor = { id: 'a4', role: 'other', name: 'Děd' }

  let list = upsertPedigreeAncestor([], sire1)
  assert.equal(list.ok, true)
  if (!list.ok) throw new Error('expected ok')
  let rows = list.list
  list = upsertPedigreeAncestor(rows, dam)
  assert.equal(list.ok, true)
  if (!list.ok) throw new Error('expected ok')
  rows = list.list
  list = upsertPedigreeAncestor(rows, other)
  assert.equal(list.ok, true)
  if (!list.ok) throw new Error('expected ok')
  rows = list.list
  const dup = upsertPedigreeAncestor(rows, sire2)
  assert.equal(dup.ok, false)
  if (dup.ok) throw new Error('expected conflict')
  assert.equal(dup.existing.name, 'Otec A')
  assert.equal(rows.filter((a) => a.role === 'sire').length, 1)

  // Edit existing sire in place
  list = upsertPedigreeAncestor(rows, { id: 'a1', role: 'sire', name: 'Otec A upraven' })
  assert.equal(list.ok, true)
  if (!list.ok) throw new Error('expected ok')
  assert.equal(list.list.filter((a) => a.role === 'sire').length, 1)
  assert.equal(list.list.find((a) => a.role === 'sire')?.name, 'Otec A upraven')
}

// ——— Litter counts ———
{
  assert.equal(validateLitterCounts({}).ok, true)
  assert.equal(validateLitterCounts({ totalCount: 5 }).ok, true)
  assert.equal(validateLitterCounts({ totalCount: 5, maleCount: 2 }).ok, true)
  assert.equal(validateLitterCounts({ totalCount: 5, maleCount: 2, femaleCount: 3 }).ok, true)
  const bad = validateLitterCounts({ totalCount: 5, maleCount: 2, femaleCount: 2 })
  assert.equal(bad.ok, false)
}

// ——— Castration / heat regression ———
{
  const intact = baseFemaleDog({ breedingProfile: false, neutered: false })
  assert.equal(canHaveBreedingProfile(intact), true)

  const { next: enabled, breedingJustEnabled } = applyBreedingProfileRules(intact, {
    breedingProfile: true,
  })
  assert.equal(breedingJustEnabled, true)
  assert.equal(hasActiveBreedingProfile(enabled), true)
  assert.equal(canAutoGenerateHeat(enabled), true)

  let events: CalendarEvent[] = []
  if (breedingJustEnabled && canAutoGenerateHeat(enabled) && !hasActiveHeatForPet(events, enabled)) {
    events = [{ ...buildAutoHeatEvent(enabled), id: 'heat1' }]
  }
  assert.equal(events.length, 1)
  assert.equal(isActiveHeatEvent(events[0]!), true)

  // Re-enable while active heat exists → no duplicate
  const { next: stillOn, breedingJustEnabled: again } = applyBreedingProfileRules(
    { ...enabled, breedingProfile: false },
    { breedingProfile: true },
  )
  assert.equal(again, true)
  assert.equal(canAutoGenerateHeat(stillOn), true)
  assert.equal(hasActiveHeatForPet(events, stillOn), true)
  if (again && canAutoGenerateHeat(stillOn) && !hasActiveHeatForPet(events, stillOn)) {
    events = [{ ...buildAutoHeatEvent(stillOn), id: 'heat2' }, ...events]
  }
  assert.equal(events.length, 1)

  // End heat → no longer active
  events = [{ ...events[0]!, actualEndDate: events[0]!.expectedEndDate }]
  assert.equal(hasActiveHeatForPet(events, stillOn), false)

  // Neuter → profile off, breeding data kept, no more heat eligibility
  const withBreedingData: Pet = {
    ...stillOn,
    breeding: {
      titles: [{ id: 't1', name: 'CAJC' }],
      matings: [{ id: 'm1', date: '2026-01-01', partnerName: 'Externí' }],
    },
  }
  const { next: neuteredPet } = applyBreedingProfileRules(withBreedingData, { neutered: true })
  assert.equal(neuteredPet.neutered, true)
  assert.equal(neuteredPet.breedingProfile, false)
  assert.equal(hasActiveBreedingProfile(neuteredPet), false)
  assert.equal(canAutoGenerateHeat(neuteredPet), false)
  assert.ok(neuteredPet.breeding?.titles?.length === 1)
  assert.ok(neuteredPet.breeding?.matings?.length === 1)

  // Calendar history preserved (we never delete events on neuter)
  assert.equal(events.length, 1)

  // localStorage sanitize
  const dirty = sanitizePetBreedingProfile({
    ...neuteredPet,
    breedingProfile: true,
  })
  assert.equal(dirty.breedingProfile, false)
  assert.ok(dirty.breeding?.titles?.length === 1)

  // Neutered cannot activate
  const { next: blocked, breedingJustEnabled: blockedEnable } = applyBreedingProfileRules(
    dirty,
    { breedingProfile: true },
  )
  assert.equal(blocked.breedingProfile, false)
  assert.equal(blockedEnable, false)
  assert.equal(canHaveBreedingProfile(blocked), false)
}

console.log('OK — breeding consistency checks passed')
