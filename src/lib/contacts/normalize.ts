import type { ImportantContact, ImportantContactType } from '../../types'

const LEGACY_TYPE_MAP: Record<string, ImportantContactType> = {
  emergency: 'emergency',
  vet: 'vet',
  shelter: 'shelter',
  groomer: 'groomer',
  trainer: 'trainer',
  custom: 'custom',
  insurance: 'custom',
  registry: 'shelter',
  emergency_person: 'custom',
}

const DEFAULT_LABELS: Record<ImportantContactType, string> = {
  vet: 'Veterinář',
  emergency: 'Veterinární pohotovost',
  shelter: 'Útulek',
  groomer: 'Groomer',
  trainer: 'Trenér',
  custom: 'Vlastní kontakt',
}

export function contactTypeLabel(type: ImportantContactType, override?: string): string {
  if (override?.trim()) return override.trim()
  return DEFAULT_LABELS[type] ?? 'Kontakt'
}

export function normalizeImportantContact(raw: unknown): ImportantContact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = raw as Record<string, unknown>
  if (typeof item.id !== 'string' || !item.id) return null
  if (typeof item.name !== 'string' || !item.name.trim()) return null

  const mappedType = LEGACY_TYPE_MAP[String(item.type ?? 'custom')] ?? 'custom'
  const petIds = Array.isArray(item.petIds)
    ? item.petIds.filter((id): id is string => typeof id === 'string')
    : []
  const primaryForPetIds = Array.isArray(item.primaryForPetIds)
    ? item.primaryForPetIds.filter((id): id is string => typeof id === 'string')
    : []

  return {
    id: item.id,
    type: mappedType,
    name: item.name.trim(),
    phone: typeof item.phone === 'string' && item.phone.trim() ? item.phone.trim() : undefined,
    email: typeof item.email === 'string' && item.email.trim() ? item.email.trim() : undefined,
    address:
      typeof item.address === 'string' && item.address.trim() ? item.address.trim() : undefined,
    note: typeof item.note === 'string' && item.note.trim() ? item.note.trim() : undefined,
    petIds,
    primaryForPetIds,
    label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : undefined,
  }
}

export function normalizeImportantContacts(raw: unknown, fallback: ImportantContact[]): ImportantContact[] {
  if (!Array.isArray(raw)) return fallback.map((c) => normalizeImportantContact(c)!).filter(Boolean)
  const next = raw.map(normalizeImportantContact).filter((c): c is ImportantContact => c != null)
  return next.length > 0 ? next : fallback.map((c) => normalizeImportantContact(c)!).filter(Boolean)
}

/** Contacts linked to a pet (or global when petIds is empty). */
export function contactsForPet(contacts: ImportantContact[], petId: string): ImportantContact[] {
  return contacts.filter((c) => c.petIds.length === 0 || c.petIds.includes(petId))
}

export function primaryContactForPet(
  contacts: ImportantContact[],
  petId: string,
): ImportantContact | undefined {
  return contactsForPet(contacts, petId).find((c) => c.primaryForPetIds.includes(petId))
}

export function contactByTypeForPet(
  contacts: ImportantContact[],
  petId: string,
  type: ImportantContactType,
): ImportantContact | undefined {
  const scoped = contactsForPet(contacts, petId)
  const primaryOfType = scoped.find(
    (c) => c.type === type && c.primaryForPetIds.includes(petId),
  )
  if (primaryOfType) return primaryOfType
  return scoped.find((c) => c.type === type)
}
