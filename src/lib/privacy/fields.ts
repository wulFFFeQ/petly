import type {
  AccountPrivacyFieldId,
  PetPrivacyFieldId,
  PrivacyFieldMeta,
  PrivacyLevel,
} from './types'

export const PRIVACY_LEVELS: readonly PrivacyLevel[] = [
  'private',
  'connections',
  'public',
] as const

export const PRIVACY_LEVEL_RANK: Record<PrivacyLevel, number> = {
  private: 0,
  connections: 1,
  public: 2,
}

export const PET_PRIVACY_FIELDS: readonly PrivacyFieldMeta[] = [
  {
    id: 'photos',
    label: 'Fotografie',
    description: 'Profilová a galerijní fotografie mazlíčka',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
  {
    id: 'name',
    label: 'Jméno',
    description: 'Jméno mazlíčka',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
  {
    id: 'speciesBreed',
    label: 'Druh a plemeno',
    description: 'Pes/kočka a plemeno',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
  {
    id: 'ageDob',
    label: 'Věk / datum narození',
    description: 'Věk a datum narození',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
  {
    id: 'weight',
    label: 'Váha',
    description: 'Hmotnost mazlíčka',
    scope: 'pet',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'microchip',
    label: 'Mikročip',
    description: 'Číslo mikročipu a ověření v registru',
    scope: 'pet',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'health',
    label: 'Zdravotní údaje',
    description: 'Zdravotní stav, skóre a klinické záznamy',
    scope: 'pet',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'allergies',
    label: 'Alergie',
    description: 'Známé alergie a citlivosti',
    scope: 'pet',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'medications',
    label: 'Léky',
    description: 'Medikace a dávkování',
    scope: 'pet',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'documents',
    label: 'Dokumenty',
    description: 'Soubory a certifikáty mazlíčka',
    scope: 'pet',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'location',
    label: 'Lokalita',
    description: 'Veřejně jen bezpečně zobecněné město / oblast',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
  {
    id: 'breeding',
    label: 'Chovné údaje',
    description: 'Veřejný výtah z chovatelského profilu',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
  {
    id: 'postsAndTagging',
    label: 'Veřejné příspěvky a tagování',
    description: 'Tagování mazlíčka v komunitních příspěvcích',
    scope: 'pet',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
] as const

export const ACCOUNT_PRIVACY_FIELDS: readonly PrivacyFieldMeta[] = [
  {
    id: 'ownerContacts',
    label: 'Kontaktní údaje majitele',
    description: 'Telefon, e-mail a adresa majitele',
    scope: 'account',
    maxLevel: 'connections',
    defaultLevel: 'private',
  },
  {
    id: 'location',
    label: 'Lokalita domácnosti',
    description: 'Veřejně jen město / region, nikdy přesná adresa',
    scope: 'account',
    maxLevel: 'public',
    defaultLevel: 'private',
  },
] as const

export const ALL_PRIVACY_FIELDS: readonly PrivacyFieldMeta[] = [
  ...ACCOUNT_PRIVACY_FIELDS,
  ...PET_PRIVACY_FIELDS,
]

const PET_FIELD_MAP = new Map(
  PET_PRIVACY_FIELDS.map((f) => [f.id as PetPrivacyFieldId, f]),
)
const ACCOUNT_FIELD_MAP = new Map(
  ACCOUNT_PRIVACY_FIELDS.map((f) => [f.id as AccountPrivacyFieldId, f]),
)

export function getPetFieldMeta(id: PetPrivacyFieldId): PrivacyFieldMeta {
  const meta = PET_FIELD_MAP.get(id)
  if (!meta) throw new Error(`Unknown pet privacy field: ${id}`)
  return meta
}

export function getAccountFieldMeta(id: AccountPrivacyFieldId): PrivacyFieldMeta {
  const meta = ACCOUNT_FIELD_MAP.get(id)
  if (!meta) throw new Error(`Unknown account privacy field: ${id}`)
  return meta
}

/**
 * Fields elevated when publicDiscover is on (migration).
 * Identity fields are required for a valid DiscoverPet; postsAndTagging keeps
 * community tagging aligned with the existing publicDiscover opt-in.
 */
export const DISCOVER_IDENTITY_FIELDS: readonly PetPrivacyFieldId[] = [
  'name',
  'photos',
  'speciesBreed',
  'ageDob',
  'location',
  'postsAndTagging',
] as const

/**
 * Keys that must never appear on any public Discover / public-profile payload.
 * Shared with discover/privacy.ts — single source of truth.
 */
export const PUBLIC_PAYLOAD_FORBIDDEN_KEYS = [
  'microchip',
  'microchipNumber',
  'microchipVerification',
  'phone',
  'email',
  'address',
  'street',
  'postalCode',
  'weight',
  'healthRecords',
  'health',
  'healthStatus',
  'healthAssessment',
  'healthScore',
  'medications',
  'documents',
  'privateNotes',
  'ownerPhone',
  'ownerEmail',
  'ownerAddress',
  'vetPhone',
  'emergencyContacts',
  'importantContacts',
  'conciergeRequests',
  'primaryForPetIds',
  'petIds',
  'contactPreference',
  'dateOfBirth',
  'allergies',
  // Krok 16 — raw verification must never leak; only publicTrustBadges
  'verifications',
  'verification',
  'verificationMetadata',
  'providerPayload',
  'rawProviderResponse',
  'attestorId',
  'attestorDocument',
  'chipNumber',
  'documentIds',
  // K51 — clinical provenance / actor identity must never appear on public payloads
  'createdByAccountId',
  'updatedByAccountId',
  'uploadedByAccountId',
  'withdrawnByAccountId',
  'recordSource',
  'lifecycleStatus',
  'withdrawnAt',
  // K57 — version / correction metadata never on public payloads
  'version',
  'mutationKind',
  'correctionOfVersion',
  'correctionReason',
  // K58 — Clinical Encounter never public
  'clinicalEncounters',
  'encounters',
  'encounterId',
  'encounterType',
  'reason',
  'bookingId',
  'professionalId',
  'organizationId',
  'startedAt',
  'endedAt',
] as const

export type PublicPayloadForbiddenKey = (typeof PUBLIC_PAYLOAD_FORBIDDEN_KEYS)[number]
