/** Lifecycle of a lost-pet announcement (UI: Ztracen / Nalezen / Ukončeno). */
export type LostPetLifecycle = 'lost' | 'found' | 'closed'

export type PublicBehavior = 'catch' | 'report_only' | 'situational'

export type TemperamentHint = 'friendly' | 'fearful' | 'aggressive' | 'uncertain'

export type LostPetReportType = 'sighting' | 'found'

export type SightingActivity =
  | 'running'
  | 'walking'
  | 'hiding'
  | 'with_someone'
  | 'unknown'

export type FoundSafety = 'with_me' | 'safe_elsewhere' | 'needs_vet' | 'unknown'

export type ReportFlagReason = 'outdated' | 'wrong_place' | 'fake' | 'other'

export type ObservedAtPreset = 'now' | 'under_hour' | 'today' | 'custom'

/** Location with private (owner) and public (safe) representations. */
export interface ApproxLocation {
  /** Safe public label (e.g. „Kolín – Zálabí“). */
  publicLabel: string
  /** More precise label for the owner only. */
  privateLabel?: string
  /** Exact coordinates — owner / internal report map only. */
  lat: number
  lng: number
  /** Rounded coordinates for public display (~100–300 m). */
  publicLat: number
  publicLng: number
}

export interface LostPetAnnouncement {
  id: string
  /** Opaque token for `/lost/:token` — never petId or microchip. */
  publicToken: string
  petId: string
  status: LostPetLifecycle
  createdAt: string
  resolvedAt?: string
  closedAt?: string

  lastSeen: ApproxLocation & { seenAt: string }
  knowsPossibleArea: boolean
  possibleArea?: ApproxLocation & { radiusM?: number }

  publicBehavior: PublicBehavior
  importantInstructions?: string
  respondsToName: string
  nickname?: string
  allowAppContact: boolean

  reactionToPeople?: TemperamentHint
  reactionToAnimals?: TemperamentHint
  specialCaution?: string
}

export interface LostPetReport {
  id: string
  announcementId: string
  petId: string
  type: LostPetReportType
  createdAt: string
  /** Opaque finder session id — no PII. */
  reporterAnonymousId: string

  location: ApproxLocation
  observedAt: string
  observedAtPreset?: ObservedAtPreset

  activity?: SightingActivity

  hasPetWithThem?: boolean
  safetyStatus?: FoundSafety
  canKeepSafely?: boolean

  note?: string
  photoUrl?: string

  ownerFlag?: {
    reason: ReportFlagReason
    note?: string
    flaggedAt: string
  }

  notifiedOfResolution?: boolean
}

/** Input for creating a lost announcement (owner form). */
export interface CreateLostAnnouncementInput {
  lastSeen: ApproxLocation & { seenAt: string }
  knowsPossibleArea: boolean
  possibleArea?: ApproxLocation & { radiusM?: number }
  publicBehavior: PublicBehavior
  importantInstructions?: string
  respondsToName: string
  nickname?: string
  allowAppContact: boolean
  reactionToPeople?: TemperamentHint
  reactionToAnimals?: TemperamentHint
  specialCaution?: string
}

export interface SubmitLostSightingInput {
  reporterAnonymousId: string
  location: ApproxLocation
  observedAt: string
  observedAtPreset?: ObservedAtPreset
  activity?: SightingActivity
  note?: string
  photoUrl?: string
}

export interface SubmitLostFoundInput {
  reporterAnonymousId: string
  location: ApproxLocation
  observedAt: string
  hasPetWithThem: boolean
  safetyStatus: FoundSafety
  canKeepSafely: boolean
  note?: string
  photoUrl?: string
}

/** Anonymous chat message between owner and finder (via LOVED & KNOWN). */
export interface LostPetChatMessage {
  id: string
  sender: 'owner' | 'finder'
  text: string
  createdAt: string
}
