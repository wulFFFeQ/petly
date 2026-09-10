import type { PlanId } from './types'
import { PLAN_IDS } from './types'

/** Rank for FREE < PREMIUM < FAMILY. BREEDER_PRO is a parallel branch. */
export const PLAN_RANK: Record<'free' | 'premium' | 'family', number> = {
  free: 0,
  premium: 1,
  family: 2,
}

export interface PlanMeta {
  id: PlanId
  label: string
  /** Short Czech description for Settings UI. */
  description: string
  /**
   * Optional display-only pricing hint — NEVER used by hasEntitlement.
   * Kept out of business logic so prices can change freely.
   */
  displayHints?: {
    priceNote?: string
  }
}

export const PLAN_CATALOG: Record<PlanId, PlanMeta> = {
  free: {
    id: 'free',
    label: 'Free',
    description:
      'Plnohodnotný základní účet — péče, komunita, bezpečnostní funkce a nouzová karta.',
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    description:
      'Pokročilá evidence, automatizace připomínek, statistiky a rozšířené přehledy.',
  },
  family: {
    id: 'family',
    label: 'Family',
    description:
      'Premium plus více členů domácnosti, sdílená péče a oprávnění podle soukromí.',
  },
  breeder_pro: {
    id: 'breeder_pro',
    label: 'Breeder Pro',
    description:
      'Pokročilé nástroje pro aktivní chovné profily — rodokmen, vrhy, tituly a statistiky.',
  },
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value)
}

/**
 * Hierarchy check for FREE / PREMIUM / FAMILY only.
 * BREEDER_PRO is never "higher than" Family via rank.
 */
export function planIncludesBase(
  plan: PlanId,
  base: 'free' | 'premium' | 'family',
): boolean {
  if (plan === 'breeder_pro') {
    // Parallel branch: includes free + premium base, not family.
    if (base === 'family') return false
    return PLAN_RANK[base] <= PLAN_RANK.premium
  }
  return PLAN_RANK[plan] >= PLAN_RANK[base]
}

export function getPlanMeta(plan: PlanId): PlanMeta {
  return PLAN_CATALOG[plan]
}
