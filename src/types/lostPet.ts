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
  /**
   * Optional: finder consents to offer their phone to the owner.
   * Owner still must accept before the number is revealed.
   */
  sharePhoneConsent?: boolean
  sharedPhone?: string
}

/** Anonymous chat message between owner and finder (via LOVED & KNOWN). */
export interface LostPetChatMessage {
  id: string
  sender: 'owner' | 'finder' | 'system'
  text: string
  createdAt: string
  kind?: SafeContactMessageKind
  /** Safe approx location payload — never exact address. */
  approxLocation?: SafeApproxLocationShare
}

export type SafeContactMessageKind =
  | 'text'
  | 'system'
  | 'quick_reply'
  | 'approx_location'
  | 'thank_you'
  | 'contact_offer'

export type SafeContactStatus = 'active' | 'closed'

export type SafeContactCloseReason = 'pet_home' | 'owner_closed'

/** Public-safe location share inside the secure channel. */
export interface SafeApproxLocationShare {
  publicLabel: string
  publicLat: number
  publicLng: number
  /** Human note, e.g. „přibližně 200 m od tohoto místa“. */
  accuracyNote: string
}

/**
 * Optional phone exchange — visible to the other party only after they accept.
 * Default remains fully anonymous until both sides consent.
 */
export interface ContactExchangeOffer {
  phone: string
  offeredAt: string
  /** Other party accepted — only then is the number shown to them. */
  acceptedAt?: string
  declinedAt?: string
}

export interface SafeContactExchange {
  finderOffer?: ContactExchangeOffer
  ownerOffer?: ContactExchangeOffer
}

/**
 * Secure contact channel — 1:1 with a found report.
 * Personal phone is never shown automatically; only via mutual consent exchange.
 */
export type SafeContactSource = 'lost_found' | 'emergency_card'

export interface SafeContactChannel {
  id: string
  conversationId: string
  /** Present for lost-pet found reports; omitted for emergency-card channels. */
  announcementId?: string
  /** Present for lost-pet found reports; omitted for emergency-card channels. */
  reportId?: string
  /** Origin of the secure channel. Defaults to lost_found when omitted. */
  source?: SafeContactSource
  petId: string
  petName: string
  finderAnonymousId: string
  status: SafeContactStatus
  createdAt: string
  closedAt?: string
  closedReason?: SafeContactCloseReason
  thankYouSentAt?: string
  messages: LostPetChatMessage[]
  /** Optional mutual phone exchange (both sides must consent). */
  contactExchange?: SafeContactExchange
}

/** Future anonymous/proxy voice — no real numbers ever stored here. */
export interface VoiceProxyConfig {
  /** False until a proxy telephony provider is connected. */
  enabled: boolean
  provider: 'none' | 'twilio_proxy' | 'vonage_proxy'
  label: string
  unavailableReason: string
}
