import type { PetType } from '../types'
import { isCatType } from './petTypes'

/** Short traits — clicking appends / removes from the personality text. */
export const PERSONALITY_PRESETS = [
  'Přátelský',
  'Hravý',
  'Klidný',
  'Energický',
  'Zvídavý',
  'Mazlivý',
  'Sociální',
  'Samostatný',
  'Poslušný',
  'Plachý',
  'Vyrovnaný',
  'Odvážný',
] as const

const LIKES_DOG = [
  'Dlouhé procházky',
  'Aport',
  'Plavání',
  'Psí hřiště',
  'Výlety',
  'Běh',
  'Trénink',
  'Hraní s ostatními psy',
  'Pamlsky',
  'Lesní stezky',
  'Agility',
  'Cestování autem',
] as const

const LIKES_CAT = [
  'Slunce na parapetu',
  'Hra s peříčkem',
  'Kartáčování',
  'Škrabadla',
  'Laserové ukazovátko',
  'Teplé deky',
  'Kontakt s kočkami',
  'Prozkoumávání',
  'Pamlsky',
  'Odpočinek doma',
  'Vyvýšená místa',
  'Hra s myškou',
] as const

const DISLIKES_SHARED = [
  'Samota přes den',
  'Bouřky',
  'Hlasité zvuky',
  'Cestování autem',
  'Veterinář',
  'Dav lidí',
  'Déšť',
  'Úzké prostory',
] as const

const DISLIKES_DOG = ['Úzké výtahy', 'Kolo / brusle', 'Jiní psi na vodítku'] as const

const DISLIKES_CAT = ['Hlasité děti', 'Cestovní box', 'Voda'] as const

const LOOKING_FOR_DOG = [
  'Parťáka na procházky',
  'Kamaráda na hraní',
  'Parťáka na výlety',
  'Společnost u vody',
  'Tréninkového partnera',
  'Rodinné setkání se psy',
] as const

const LOOKING_FOR_CAT = [
  'Klidné setkání s kočkami',
  'Společné hraní doma',
  'Kamaráda na mazlení',
  'Návštěvu v klidném bytě',
] as const

export function getLikePresets(type: PetType): readonly string[] {
  return isCatType(type) ? LIKES_CAT : LIKES_DOG
}

export function getDislikePresets(type: PetType): readonly string[] {
  return isCatType(type)
    ? [...DISLIKES_SHARED, ...DISLIKES_CAT]
    : [...DISLIKES_SHARED, ...DISLIKES_DOG]
}

export function getLookingForPresets(type: PetType): readonly string[] {
  return isCatType(type) ? LOOKING_FOR_CAT : LOOKING_FOR_DOG
}

/** Values not covered by the preset chips (user-typed), including empty draft rows. */
export function getCustomListItems(
  values: string[],
  presets: readonly string[],
): string[] {
  const presetSet = new Set(presets.map((p) => p.toLowerCase()))
  const customs = values.filter((item) => {
    const trimmed = item.trim()
    if (!trimmed) return true
    return !presetSet.has(trimmed.toLowerCase())
  })
  const meaningful = customs.filter((item) => item.trim())
  if (meaningful.length === 0 && customs.every((item) => !item.trim())) {
    return ['']
  }
  return customs.length > 0 ? customs : ['']
}

/** Whether a personality preset is already present in free text. */
export function personalityHasPreset(text: string, preset: string): boolean {
  if (!text.trim()) return false
  const escaped = preset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[,;\\s])${escaped}(?=$|[,;\\s])`, 'i').test(text)
}

/** Toggle a short trait inside free-text personality (comma-separated). */
export function togglePersonalityPreset(text: string, preset: string): string {
  const parts = text
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const index = parts.findIndex((p) => p.toLowerCase() === preset.toLowerCase())
  if (index >= 0) {
    parts.splice(index, 1)
  } else {
    parts.push(preset)
  }
  return parts.join(', ')
}
