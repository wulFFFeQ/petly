import type { Pet } from '../../types'
import {
  DEFAULT_EMERGENCY_VISIBILITY,
  type EmergencyCardSettings,
  type EmergencyCardVisibility,
} from '../../types/emergencyCard'

export function slugifyPetName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'pet'
}

export function mergeEmergencyVisibility(
  partial?: Partial<EmergencyCardVisibility> | null,
): EmergencyCardVisibility {
  return {
    ...DEFAULT_EMERGENCY_VISIBILITY,
    ...(partial ?? {}),
  }
}

/** Ensure every pet has an emergency card shell (defaults = private). */
export function ensureEmergencyCardSettings(pet: Pet): EmergencyCardSettings {
  const existing = pet.emergencyCard
  return {
    publicSlug: existing?.publicSlug?.trim() || pet.id || slugifyPetName(pet.name),
    health: existing?.health,
    vet: existing?.vet,
    ownerPhoneForPrint: existing?.ownerPhoneForPrint,
    visibility: mergeEmergencyVisibility(existing?.visibility),
  }
}

export function ensurePetEmergencyCard(pet: Pet): Pet {
  if (pet.emergencyCard?.publicSlug && pet.emergencyCard.visibility) {
    return {
      ...pet,
      emergencyCard: ensureEmergencyCardSettings(pet),
    }
  }
  return {
    ...pet,
    emergencyCard: ensureEmergencyCardSettings(pet),
  }
}
