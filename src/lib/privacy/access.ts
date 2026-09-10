import {
  getAccountFieldMeta,
  getPetFieldMeta,
  PRIVACY_LEVEL_RANK,
} from './fields'
import type {
  AccountPrivacyFieldId,
  AccountPrivacySettings,
  PetPrivacyFieldId,
  PetPrivacySettings,
  PrivacyLevel,
  PrivacySettings,
  ViewerRole,
} from './types'

export function isPrivacyLevel(value: unknown): value is PrivacyLevel {
  return value === 'private' || value === 'connections' || value === 'public'
}

export function clampLevel(level: PrivacyLevel, maxLevel: PrivacyLevel): PrivacyLevel {
  if (PRIVACY_LEVEL_RANK[level] <= PRIVACY_LEVEL_RANK[maxLevel]) return level
  return maxLevel
}

export function levelAtLeast(level: PrivacyLevel, minimum: PrivacyLevel): boolean {
  return PRIVACY_LEVEL_RANK[level] >= PRIVACY_LEVEL_RANK[minimum]
}

/** Whether a viewer role may see a field at the given configured level. */
export function canViewField(level: PrivacyLevel, viewer: ViewerRole): boolean {
  if (viewer === 'owner') return true
  if (viewer === 'connection') return level === 'connections' || level === 'public'
  return level === 'public'
}

export function getPetFieldLevel(
  settings: PrivacySettings | null | undefined,
  petId: string,
  fieldId: PetPrivacyFieldId,
): PrivacyLevel {
  const meta = getPetFieldMeta(fieldId)
  const raw = settings?.pets?.[petId]?.[fieldId]
  if (!isPrivacyLevel(raw)) return meta.defaultLevel
  return clampLevel(raw, meta.maxLevel)
}

export function getAccountFieldLevel(
  settings: PrivacySettings | null | undefined,
  fieldId: AccountPrivacyFieldId,
): PrivacyLevel {
  const meta = getAccountFieldMeta(fieldId)
  const raw = settings?.account?.[fieldId]
  if (!isPrivacyLevel(raw)) return meta.defaultLevel
  return clampLevel(raw, meta.maxLevel)
}

export function canViewPetField(
  settings: PrivacySettings | null | undefined,
  petId: string,
  fieldId: PetPrivacyFieldId,
  viewer: ViewerRole,
): boolean {
  return canViewField(getPetFieldLevel(settings, petId, fieldId), viewer)
}

export function canViewAccountField(
  settings: PrivacySettings | null | undefined,
  fieldId: AccountPrivacyFieldId,
  viewer: ViewerRole,
): boolean {
  return canViewField(getAccountFieldLevel(settings, fieldId), viewer)
}

/** Effective level after clamp — for UI display. */
export function getEffectivePetLevel(
  petSettings: PetPrivacySettings | null | undefined,
  fieldId: PetPrivacyFieldId,
): PrivacyLevel {
  const meta = getPetFieldMeta(fieldId)
  const raw = petSettings?.[fieldId]
  if (!isPrivacyLevel(raw)) return meta.defaultLevel
  return clampLevel(raw, meta.maxLevel)
}

export function getEffectiveAccountLevel(
  accountSettings: AccountPrivacySettings | null | undefined,
  fieldId: AccountPrivacyFieldId,
): PrivacyLevel {
  const meta = getAccountFieldMeta(fieldId)
  const raw = accountSettings?.[fieldId]
  if (!isPrivacyLevel(raw)) return meta.defaultLevel
  return clampLevel(raw, meta.maxLevel)
}
