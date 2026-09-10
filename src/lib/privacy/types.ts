/** Visibility of a sensitive / personal field. */
export type PrivacyLevel = 'private' | 'connections' | 'public'

/** Who is requesting a projected view of the data. */
export type ViewerRole = 'owner' | 'connection' | 'public'

/** Fields scoped to a pet profile. */
export type PetPrivacyFieldId =
  | 'photos'
  | 'name'
  | 'speciesBreed'
  | 'ageDob'
  | 'weight'
  | 'microchip'
  | 'health'
  | 'allergies'
  | 'medications'
  | 'documents'
  | 'location'
  | 'breeding'
  | 'postsAndTagging'

/** Fields scoped to the owner account. */
export type AccountPrivacyFieldId = 'ownerContacts' | 'location'

export type PrivacyFieldId = PetPrivacyFieldId | AccountPrivacyFieldId

export type PetPrivacySettings = Partial<Record<PetPrivacyFieldId, PrivacyLevel>>
export type AccountPrivacySettings = Partial<Record<AccountPrivacyFieldId, PrivacyLevel>>

export type PrivacySettings = {
  account: AccountPrivacySettings
  pets: Record<string, PetPrivacySettings>
}

export type PrivacyFieldMeta = {
  id: PrivacyFieldId
  label: string
  description: string
  scope: 'pet' | 'account'
  /** Hard ceiling — never allow above this (defaults to public). */
  maxLevel: PrivacyLevel
  defaultLevel: PrivacyLevel
}
