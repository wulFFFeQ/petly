import type { Pet } from '../../types'
import {
  ACCOUNT_PRIVACY_FIELDS,
  DISCOVER_IDENTITY_FIELDS,
  PET_PRIVACY_FIELDS,
} from './fields'
import { clampLevel, isPrivacyLevel } from './access'
import type {
  AccountPrivacyFieldId,
  AccountPrivacySettings,
  PetPrivacyFieldId,
  PetPrivacySettings,
  PrivacyLevel,
  PrivacySettings,
} from './types'

export const PRIVACY_SETTINGS_KEY = 'lovedandknown.privacySettings'

function emptySettings(): PrivacySettings {
  return { account: {}, pets: {} }
}

function normalizePetSettings(raw: unknown): PetPrivacySettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>
  const next: PetPrivacySettings = {}
  for (const meta of PET_PRIVACY_FIELDS) {
    const id = meta.id as PetPrivacyFieldId
    const value = source[id]
    if (!isPrivacyLevel(value)) continue
    next[id] = clampLevel(value, meta.maxLevel)
  }
  return next
}

function normalizeAccountSettings(raw: unknown): AccountPrivacySettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>
  const next: AccountPrivacySettings = {}
  for (const meta of ACCOUNT_PRIVACY_FIELDS) {
    const id = meta.id as AccountPrivacyFieldId
    const value = source[id]
    if (!isPrivacyLevel(value)) continue
    next[id] = clampLevel(value, meta.maxLevel)
  }
  return next
}

export function normalizePrivacySettings(raw: unknown): PrivacySettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptySettings()
  const source = raw as Record<string, unknown>
  const petsRaw =
    source.pets && typeof source.pets === 'object' && !Array.isArray(source.pets)
      ? (source.pets as Record<string, unknown>)
      : {}

  const pets: Record<string, PetPrivacySettings> = {}
  for (const [petId, petSettings] of Object.entries(petsRaw)) {
    if (!petId.trim()) continue
    pets[petId] = normalizePetSettings(petSettings)
  }

  return {
    account: normalizeAccountSettings(source.account),
    pets,
  }
}

export function defaultPrivacySettings(): PrivacySettings {
  return emptySettings()
}

/**
 * When a pet is opted into Discover, elevate identity fields needed for a valid
 * public DiscoverPet so existing publicDiscover behavior is preserved.
 */
export function applyPublicDiscoverMigration(
  settings: PrivacySettings,
  pets: Pet[],
): PrivacySettings {
  let changed = false
  const petsMap: Record<string, PetPrivacySettings> = { ...settings.pets }

  for (const pet of pets) {
    if (!pet.publicDiscover) continue
    const current = { ...(petsMap[pet.id] ?? {}) }
    let petChanged = false
    for (const fieldId of DISCOVER_IDENTITY_FIELDS) {
      if (current[fieldId] == null) {
        current[fieldId] = 'public'
        petChanged = true
      }
    }
    if (petChanged) {
      petsMap[pet.id] = current
      changed = true
    }
  }

  if (!changed) return settings
  return { ...settings, pets: petsMap }
}

export function loadPrivacySettings(petsForMigration: Pet[] = []): PrivacySettings {
  try {
    const raw = localStorage.getItem(PRIVACY_SETTINGS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const normalized = normalizePrivacySettings(parsed)
    return applyPublicDiscoverMigration(normalized, petsForMigration)
  } catch {
    return applyPublicDiscoverMigration(defaultPrivacySettings(), petsForMigration)
  }
}

export function savePrivacySettings(settings: PrivacySettings): void {
  const normalized = normalizePrivacySettings(settings)
  localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(normalized))
}

export function setPetFieldLevel(
  settings: PrivacySettings,
  petId: string,
  fieldId: PetPrivacyFieldId,
  level: PrivacyLevel,
): PrivacySettings {
  const meta = PET_PRIVACY_FIELDS.find((f) => f.id === fieldId)
  const clamped = meta ? clampLevel(level, meta.maxLevel) : level
  return {
    ...settings,
    pets: {
      ...settings.pets,
      [petId]: {
        ...(settings.pets[petId] ?? {}),
        [fieldId]: clamped,
      },
    },
  }
}

export function setAccountFieldLevel(
  settings: PrivacySettings,
  fieldId: AccountPrivacyFieldId,
  level: PrivacyLevel,
): PrivacySettings {
  const meta = ACCOUNT_PRIVACY_FIELDS.find((f) => f.id === fieldId)
  const clamped = meta ? clampLevel(level, meta.maxLevel) : level
  return {
    ...settings,
    account: {
      ...settings.account,
      [fieldId]: clamped,
    },
  }
}
