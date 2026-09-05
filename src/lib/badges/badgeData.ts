import { weightMeasurements as seedWeights } from '../../data/mockData'
import type { WeightMeasurement } from '../../types'

const WEIGHT_STORAGE_KEY = 'lovedandknown.weightMeasurements'

function loadStoredWeights(): WeightMeasurement[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(WEIGHT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WeightMeasurement[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Merge seed + user-added measurements (user entries win on same id). */
export function getWeightMeasurementsForPet(petId: string): WeightMeasurement[] {
  const stored = loadStoredWeights().filter((w) => w.petId === petId)
  const seed = seedWeights.filter((w) => w.petId === petId)
  const byId = new Map<string, WeightMeasurement>()
  for (const w of seed) byId.set(w.id, w)
  for (const w of stored) byId.set(w.id, w)
  return Array.from(byId.values())
}

export function persistWeightMeasurement(entry: WeightMeasurement): void {
  if (typeof window === 'undefined') return
  try {
    const all = loadStoredWeights()
    const next = [...all.filter((w) => w.id !== entry.id), entry]
    window.localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore quota
  }
}

const SHARED_PREFIX = 'lovedandknown.petShared.'
const FIRST_SEEN_PREFIX = 'lovedandknown.petFirstSeen.'

export function markPetProfileShared(petId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${SHARED_PREFIX}${petId}`, '1')
  } catch {
    // ignore
  }
}

export function isPetProfileShared(petId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(`${SHARED_PREFIX}${petId}`) === '1'
  } catch {
    return false
  }
}

/** Ensures first-seen ISO date exists; returns days since first seen. */
export function ensurePetFirstSeenDays(petId: string, todayIso: string): number {
  if (typeof window === 'undefined') return 0
  const key = `${FIRST_SEEN_PREFIX}${petId}`
  try {
    let first = window.localStorage.getItem(key)
    if (!first) {
      // Seed pets: treat as long-lived for demo (90+ days ago)
      const seedIds = new Set(['luna', 'milo', 'bella'])
      if (seedIds.has(petId)) {
        const d = new Date(`${todayIso}T12:00:00`)
        d.setDate(d.getDate() - 120)
        first = d.toISOString().slice(0, 10)
      } else {
        first = todayIso
      }
      window.localStorage.setItem(key, first)
    }
    const a = new Date(`${first}T12:00:00`).getTime()
    const b = new Date(`${todayIso}T12:00:00`).getTime()
    if (Number.isNaN(a) || Number.isNaN(b)) return 0
    return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)))
  } catch {
    return 0
  }
}
