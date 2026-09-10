/**
 * Private breeding-profile content for an owned pet.
 * Kept separate from the everyday pet profile and from public Discover breeding.
 *
 * Designed so later we can add multi-generation pedigree graphs,
 * public breeding profiles, verified health results, and offspring links
 * without rewriting this shape.
 */

/** Soft link to an existing document in Dokumenty a pasy (no file duplication). */
export type BreedingLinkedDocumentIds = string[]

/** Soft link to gallery photos (optional attachment). */
export type BreedingLinkedPhotoIds = string[]

/** Soft link to a calendar event — only when user creates/links one; never auto-backfilled. */
export type BreedingLinkedCalendarEventId = string | undefined

/**
 * Core kennel / registration facts for the breeding layer.
 * Does not overwrite Pet.breed / Pet.gender / Pet.dateOfBirth.
 */
export interface BreedingInfo {
  kennelName?: string
  registrationNumber?: string
  /** Breeding-context breed label (optional override; profile breed stays authoritative elsewhere). */
  breed?: string
  gender?: string
  dateOfBirth?: string
  pedigreeNumber?: string
  breeder?: string
  owner?: string
  countryOfOrigin?: string
  coatColor?: string
  notes?: string
}

/**
 * One ancestor node. Parents use role sire/dam; further ancestors use `other`
 * with optional `generation` + `side` for a future tree without a UI graph yet.
 */
export interface BreedingAncestor {
  id: string
  role: 'sire' | 'dam' | 'other'
  /** 1 = parent, 2 = grandparent, … — reserved for multi-gen pedigree. */
  generation?: number
  /** Which parental line this ancestor belongs to. */
  side?: 'sire' | 'dam'
  name?: string
  breed?: string
  registrationNumber?: string
  /** Link to an existing LOVED & KNOWN pet profile. */
  linkedPetId?: string
  /**
   * Id of the child ancestor node this one is parent of.
   * Enables building a tree later without changing the list storage.
   */
  parentOfId?: string
}

export interface BreedingHealthTest {
  id: string
  /** Free-text exam / test name (DKK, DNA, eyes, custom…). */
  name: string
  result?: string
  /** ISO date YYYY-MM-DD */
  date?: string
  laboratory?: string
  protocolNumber?: string
  documentIds?: BreedingLinkedDocumentIds
  notes?: string
}

export interface BreedingShowRecord {
  id: string
  name: string
  /** ISO date YYYY-MM-DD */
  date?: string
  location?: string
  showType?: string
  showClass?: string
  judge?: string
  /** Free-text result / award (Výborná, CAC, BOB, custom…). */
  result?: string
  titleAwarded?: string
  notes?: string
  documentIds?: BreedingLinkedDocumentIds
  photoIds?: BreedingLinkedPhotoIds
  calendarEventId?: BreedingLinkedCalendarEventId
}

export interface BreedingMatingRecord {
  id: string
  /** ISO date YYYY-MM-DD */
  date?: string
  partnerName?: string
  /** Existing L&K pet; external partners leave this empty. */
  partnerPetId?: string
  location?: string
  notes?: string
  documentIds?: BreedingLinkedDocumentIds
  photoIds?: BreedingLinkedPhotoIds
  calendarEventId?: BreedingLinkedCalendarEventId
}

export interface BreedingLitterRecord {
  id: string
  /** ISO date YYYY-MM-DD */
  birthDate?: string
  totalCount?: number
  maleCount?: number
  femaleCount?: number
  sireName?: string
  sirePetId?: string
  notes?: string
  documentIds?: BreedingLinkedDocumentIds
  photoIds?: BreedingLinkedPhotoIds
  /**
   * Future: link individual offspring to L&K pet profiles.
   * Never auto-populated — only explicit user action later.
   */
  offspringPetIds?: string[]
  calendarEventId?: BreedingLinkedCalendarEventId
}

export interface BreedingTitleRecord {
  id: string
  name: string
  /** ISO date YYYY-MM-DD */
  date?: string
  showName?: string
  organization?: string
  documentIds?: BreedingLinkedDocumentIds
  notes?: string
}

/** Full private breeding dossier stored on Pet.breeding. */
export interface PetBreedingData {
  info?: BreedingInfo
  pedigree?: BreedingAncestor[]
  healthTests?: BreedingHealthTest[]
  shows?: BreedingShowRecord[]
  matings?: BreedingMatingRecord[]
  litters?: BreedingLitterRecord[]
  titles?: BreedingTitleRecord[]
}
