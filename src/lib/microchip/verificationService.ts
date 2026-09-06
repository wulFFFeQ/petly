import type { Pet } from '../../types'
import { normalizeMicrochipInput } from './validate'
import type {
  LovedKnownMicrochipMatch,
  MicrochipAggregateStatus,
  MicrochipRegistryProvider,
  MicrochipRegistryResult,
  MicrochipVerificationMode,
  MicrochipVerificationResult,
} from './types'

function nowIso(): string {
  return new Date().toISOString()
}

/** Honest default: no external registry is connected in this build. */
const unconfiguredProvider: MicrochipRegistryProvider = {
  id: 'unconfigured',
  label: 'Externí registry',
  async verify() {
    return {
      id: 'unconfigured',
      label: 'Externí registry',
      status: 'unavailable',
      note: 'V této verzi aplikace není napojený žádný registr mikročipů.',
    }
  },
}

/**
 * Dev-only mock. Enabled only when DEV + VITE_MICROCHIP_MOCK=true.
 * Never used as a real registry result in production builds.
 */
const devMockProvider: MicrochipRegistryProvider = {
  id: 'dev_mock',
  label: 'Vývojový mock registr',
  async verify(chipNumber) {
    await new Promise((r) => setTimeout(r, 450))
    // Deterministic demo: chips ending in even digit → found
    const last = Number(chipNumber.slice(-1))
    const found = Number.isFinite(last) && last % 2 === 0
    return {
      id: 'dev_mock',
      label: 'Vývojový mock registr',
      status: found ? 'found' : 'not_found',
      note: found
        ? 'Mock výsledek — není skutečné ověření v registru.'
        : 'Mock výsledek — čip v mock datech „nenalezen“.',
    }
  },
}

function isDevMockEnabled(): boolean {
  return Boolean(import.meta.env.DEV && import.meta.env.VITE_MICROCHIP_MOCK === 'true')
}

function getRegistryProviders(): MicrochipRegistryProvider[] {
  if (isDevMockEnabled()) return [devMockProvider]
  return [unconfiguredProvider]
}

function aggregateStatuses(
  registries: MicrochipRegistryResult[],
): MicrochipAggregateStatus {
  if (registries.some((r) => r.status === 'found')) return 'found'
  if (registries.every((r) => r.status === 'unavailable' || r.status === 'error')) {
    return 'unavailable'
  }
  if (registries.some((r) => r.status === 'not_found')) return 'not_found'
  return 'unavailable'
}

function resolveMode(): MicrochipVerificationMode {
  if (isDevMockEnabled()) return 'dev_mock'
  // When a live provider is added later, return 'live'.
  return 'unconfigured'
}

export function isMicrochipDevMockMode(): boolean {
  return isDevMockEnabled()
}

/**
 * Verify a microchip against available registry providers.
 * Does not return owner PII. Default build is unconfigured (honest unavailable).
 */
export async function verifyMicrochip(
  chipNumber: string,
): Promise<MicrochipVerificationResult> {
  const normalized = normalizeMicrochipInput(chipNumber)
  const providers = getRegistryProviders()
  const registries = await Promise.all(providers.map((p) => p.verify(normalized)))

  return {
    chipNumber: normalized,
    checkedAt: nowIso(),
    mode: resolveMode(),
    registries,
    aggregate: aggregateStatuses(registries),
  }
}

/**
 * Local LOVED & KNOWN lookup by chip number.
 * Returns only pet id + name — never owner contact details.
 */
export function lookupLovedKnownPetByMicrochip(
  chipNumber: string,
  pets: Pet[],
): LovedKnownMicrochipMatch | null {
  const normalized = normalizeMicrochipInput(chipNumber)
  if (!normalized) return null
  const pet = pets.find(
    (item) => normalizeMicrochipInput(item.microchip ?? '') === normalized,
  )
  if (!pet) return null
  return { petId: pet.id, petName: pet.name }
}

export interface MicrochipExternalSearchLink {
  id: string
  label: string
  description: string
  href: string
  /** True when the chip number is embedded in the URL. */
  prefillsChip: boolean
}

/**
 * Deep-links to public web search tools (not an API integration).
 * LOVED & KNOWN does not scrape results or read owner PII from these sites.
 */
export function buildMicrochipExternalSearchLinks(
  chipNumber: string,
): MicrochipExternalSearchLink[] {
  const code = normalizeMicrochipInput(chipNumber)

  return [
    {
      id: 'petmaxx',
      label: 'PetMaxx — hledat čip',
      description: code
        ? 'Otevře mezinárodní vyhledávač s předvyplněným číslem.'
        : 'Mezinárodní vyhledávač mikročipů.',
      href: code
        ? `https://www.petmaxx.com/?code=${encodeURIComponent(code)}`
        : 'https://www.petmaxx.com/',
      prefillsChip: Boolean(code),
    },
    {
      id: 'europetnet',
      label: 'Europetnet — Pet ID search',
      description:
        'Evropský portál. Číslo zadejte ve vyhledávání na stránce (deep-link není podporován).',
      href: 'https://europetnet.org/pet-id-search/',
      prefillsChip: false,
    },
    {
      id: 'nrmz',
      label: 'Národní registr (CZ)',
      description: 'Informace a přístup k českému národnímu registru.',
      href: 'https://www.narodniregistr.cz/',
      prefillsChip: false,
    },
  ]
}

/** @deprecated Prefer buildMicrochipExternalSearchLinks(chip) */
export const MICROCHIP_REGISTRY_INFO_LINKS: { label: string; href: string }[] =
  buildMicrochipExternalSearchLinks('').map(({ label, href }) => ({ label, href }))
