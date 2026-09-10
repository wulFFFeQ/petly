import type { FeatureCategory, FeatureId } from './types'

export interface FeatureMeta {
  id: FeatureId
  category: FeatureCategory
  /** Czech label for Settings / upgrade copy. */
  label: string
  /** Short benefit for UpgradePrompt. */
  benefit: string
}

/** Core + safety — always on FREE. */
export const CORE_SAFETY_FEATURES = [
  'account_basic',
  'pet_profile_basic',
  'care_basic',
  'health_basic',
  'calendar_basic',
  'community',
  'discover_basic',
  'connections_basic',
  'messages_basic',
  'emergency_card',
  'identification_basic',
  'lost_pet',
  'found_pet',
  'safety_contact_basic',
  'community_help_basic',
] as const satisfies readonly FeatureId[]

export const PREMIUM_FEATURES = [
  'health_advanced',
  'health_insights',
  'documents_advanced',
  'reminders_advanced',
  'calendar_advanced',
  'statistics',
  'care_advanced',
  'timeline_advanced',
  'travel_advanced',
  'discover_advanced_filters',
  'gallery_advanced',
  'personalized_insights',
  'services_extended',
] as const satisfies readonly FeatureId[]

export const FAMILY_FEATURES = [
  'family_members',
  'family_shared_care',
  'family_permissions',
  'family_shared_calendar',
  'family_shared_health',
  'family_shared_documents',
  'family_multi_pets',
  'family_pet_access',
] as const satisfies readonly FeatureId[]

export const BREEDING_FEATURES = [
  'breeding_advanced',
  'breeding_pedigree',
  'breeding_litters',
  'breeding_events',
  'breeding_show_results',
  'breeding_titles',
  'breeding_health_tests',
  'breeder_statistics',
  'breeder_presentation',
] as const satisfies readonly FeatureId[]

export const ALL_FEATURE_IDS = [
  ...CORE_SAFETY_FEATURES,
  ...PREMIUM_FEATURES,
  ...FAMILY_FEATURES,
  ...BREEDING_FEATURES,
] as const satisfies readonly FeatureId[]

const FEATURE_SET = new Set<string>(ALL_FEATURE_IDS)

export function isFeatureId(value: unknown): value is FeatureId {
  return typeof value === 'string' && FEATURE_SET.has(value)
}

/** Safety subset — never lock behind Premium. */
export const SAFETY_FEATURES = [
  'emergency_card',
  'identification_basic',
  'lost_pet',
  'found_pet',
  'safety_contact_basic',
  'community_help_basic',
] as const satisfies readonly FeatureId[]

export const FEATURE_CATALOG: Record<FeatureId, FeatureMeta> = {
  account_basic: {
    id: 'account_basic',
    category: 'core',
    label: 'Účet a základní profil',
    benefit: 'Správa účtu a profilu bez omezení.',
  },
  pet_profile_basic: {
    id: 'pet_profile_basic',
    category: 'core',
    label: 'Základní profil mazlíčka',
    benefit: 'Základní údaje o mazlíčkovi vždy k dispozici.',
  },
  care_basic: {
    id: 'care_basic',
    category: 'core',
    label: 'Základní evidence péče',
    benefit: 'Běžná péče a záznamy bez placení.',
  },
  health_basic: {
    id: 'health_basic',
    category: 'core',
    label: 'Základní zdravotní záznamy',
    benefit: 'Základní zdraví zůstává ve Free.',
  },
  calendar_basic: {
    id: 'calendar_basic',
    category: 'core',
    label: 'Základní kalendář',
    benefit: 'Termíny a události v základní podobě.',
  },
  community: {
    id: 'community',
    category: 'core',
    label: 'Komunita',
    benefit: 'Komunita je součástí Free účtu.',
  },
  discover_basic: {
    id: 'discover_basic',
    category: 'core',
    label: 'Objevovat',
    benefit: 'Základní Objevovat bez pokročilých filtrů.',
  },
  connections_basic: {
    id: 'connections_basic',
    category: 'core',
    label: 'Základní propojování',
    benefit: 'Propojení s ostatními zůstává ve Free.',
  },
  messages_basic: {
    id: 'messages_basic',
    category: 'core',
    label: 'Základní zprávy',
    benefit: 'Základní messaging bez placení.',
  },
  emergency_card: {
    id: 'emergency_card',
    category: 'safety',
    label: 'Nouzová karta',
    benefit: 'Bezpečnostní funkce — nikdy za paywallem.',
  },
  identification_basic: {
    id: 'identification_basic',
    category: 'safety',
    label: 'Základní identifikace mazlíčka',
    benefit: 'Identifikace zůstává dostupná ve Free.',
  },
  lost_pet: {
    id: 'lost_pet',
    category: 'safety',
    label: 'Ztracený mazlíček',
    benefit: 'Nahlášení ztráty — nikdy za Premium.',
  },
  found_pet: {
    id: 'found_pet',
    category: 'safety',
    label: 'Nalezený mazlíček',
    benefit: 'Nahlášení nálezu — nikdy za Premium.',
  },
  safety_contact_basic: {
    id: 'safety_contact_basic',
    category: 'safety',
    label: 'Základní bezpečnostní kontakt',
    benefit: 'Kontakt v nouzi zůstává ve Free.',
  },
  community_help_basic: {
    id: 'community_help_basic',
    category: 'safety',
    label: 'Sdílení / pomoc komunitě',
    benefit: 'Pomoc komunitě bez placeného tarifu.',
  },
  health_advanced: {
    id: 'health_advanced',
    category: 'premium',
    label: 'Rozšířená zdravotní historie',
    benefit: 'Hloubka a historie nad základní evidenci.',
  },
  health_insights: {
    id: 'health_insights',
    category: 'premium',
    label: 'Pokročilé zdravotní přehledy',
    benefit: 'Přehledy a souvislosti ve zdraví.',
  },
  documents_advanced: {
    id: 'documents_advanced',
    category: 'premium',
    label: 'Pokročilé dokumenty',
    benefit: 'Rozšířená práce s dokumenty.',
  },
  reminders_advanced: {
    id: 'reminders_advanced',
    category: 'premium',
    label: 'Automatické připomínky',
    benefit: 'Automatizace připomínek péče a zdraví.',
  },
  calendar_advanced: {
    id: 'calendar_advanced',
    category: 'premium',
    label: 'Pokročilý kalendář',
    benefit: 'Pokročilé kalendářní funkce nad základem.',
  },
  statistics: {
    id: 'statistics',
    category: 'premium',
    label: 'Statistiky a trendy',
    benefit: 'Statistiky a trendy péče a zdraví.',
  },
  care_advanced: {
    id: 'care_advanced',
    category: 'premium',
    label: 'Pokročilé sledování péče',
    benefit: 'Hlubší sledování péče a návyků.',
  },
  timeline_advanced: {
    id: 'timeline_advanced',
    category: 'premium',
    label: 'Rozšířená timeline',
    benefit: 'Bohatší časová osa událostí.',
  },
  travel_advanced: {
    id: 'travel_advanced',
    category: 'premium',
    label: 'Rozšířené cestovní funkce',
    benefit: 'Pokročilá podpora cestování s mazlíčkem.',
  },
  discover_advanced_filters: {
    id: 'discover_advanced_filters',
    category: 'premium',
    label: 'Pokročilé filtry Objevovat',
    benefit: 'Přesnější filtry v Objevovat.',
  },
  gallery_advanced: {
    id: 'gallery_advanced',
    category: 'premium',
    label: 'Rozšířená galerie',
    benefit: 'Více možností v galerii.',
  },
  personalized_insights: {
    id: 'personalized_insights',
    category: 'premium',
    label: 'Personalizované přehledy',
    benefit: 'Přehledy šité na míru vaší domácnosti.',
  },
  services_extended: {
    id: 'services_extended',
    category: 'premium',
    label: 'Rozšířené služby',
    benefit: 'Rozšířené možnosti služeb.',
  },
  family_members: {
    id: 'family_members',
    category: 'family',
    label: 'Více členů domácnosti',
    benefit: 'Přidejte členy rodiny do společné péče.',
  },
  family_shared_care: {
    id: 'family_shared_care',
    category: 'family',
    label: 'Sdílená péče',
    benefit: 'Sdílejte péči v rámci domácnosti.',
  },
  family_permissions: {
    id: 'family_permissions',
    category: 'family',
    label: 'Oprávnění členů',
    benefit: 'Nastavte, kdo co smí v domácnosti.',
  },
  family_shared_calendar: {
    id: 'family_shared_calendar',
    category: 'family',
    label: 'Společný kalendář',
    benefit: 'Jeden kalendář pro celou domácnost.',
  },
  family_shared_health: {
    id: 'family_shared_health',
    category: 'family',
    label: 'Sdílené zdraví (dle oprávnění)',
    benefit: 'Sdílení zdraví respektuje privacy model.',
  },
  family_shared_documents: {
    id: 'family_shared_documents',
    category: 'family',
    label: 'Sdílené dokumenty (dle oprávnění)',
    benefit: 'Dokumenty jen podle oprávnění.',
  },
  family_multi_pets: {
    id: 'family_multi_pets',
    category: 'family',
    label: 'Více mazlíčků v domácnosti',
    benefit: 'Správa více mazlíčků v Family.',
  },
  family_pet_access: {
    id: 'family_pet_access',
    category: 'family',
    label: 'Přístup k mazlíčkům podle členů',
    benefit: 'Určete, kdo má přístup ke kterému mazlíčkovi.',
  },
  breeding_advanced: {
    id: 'breeding_advanced',
    category: 'breeding',
    label: 'Pokročilý chovný profil',
    benefit: 'Nástroje pro aktivní chovné profily.',
  },
  breeding_pedigree: {
    id: 'breeding_pedigree',
    category: 'breeding',
    label: 'Rodokmen / rodiče / potomci',
    benefit: 'Rodokmen a vazby rodičů a potomků.',
  },
  breeding_litters: {
    id: 'breeding_litters',
    category: 'breeding',
    label: 'Vrhy',
    benefit: 'Evidence vrhů.',
  },
  breeding_events: {
    id: 'breeding_events',
    category: 'breeding',
    label: 'Chovné události',
    benefit: 'Chovné události a termíny.',
  },
  breeding_show_results: {
    id: 'breeding_show_results',
    category: 'breeding',
    label: 'Výstavní výsledky',
    benefit: 'Evidence výstavních výsledků.',
  },
  breeding_titles: {
    id: 'breeding_titles',
    category: 'breeding',
    label: 'Tituly',
    benefit: 'Tituly a ocenění.',
  },
  breeding_health_tests: {
    id: 'breeding_health_tests',
    category: 'breeding',
    label: 'Chovné zdravotní testy',
    benefit: 'Testy relevantní pro chov.',
  },
  breeder_statistics: {
    id: 'breeder_statistics',
    category: 'breeding',
    label: 'Chovné statistiky',
    benefit: 'Statistiky chovu.',
  },
  breeder_presentation: {
    id: 'breeder_presentation',
    category: 'breeding',
    label: 'Prezentace chovatele',
    benefit: 'Prezentace chovatelského profilu.',
  },
}

export function getFeatureMeta(featureId: FeatureId): FeatureMeta {
  return FEATURE_CATALOG[featureId]
}
