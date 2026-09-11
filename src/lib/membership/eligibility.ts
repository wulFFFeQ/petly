import { hasActiveBreedingProfile } from '../breedingProfile'
import {
  effectivePlan,
  type PlanId,
  type SubscriptionRecord,
} from '../entitlements'
import { accountHasRole } from '../professional/roles'
import type { Account } from '../professional/types'
import type { Pet } from '../../types'

/**
 * Breeder Pro is intended for breeding context — role and/or active breeding profile.
 * Does NOT grant verification or breeding trust.
 */
export function canSelectBreederPro(
  account: Account | null | undefined,
  pets: ReadonlyArray<Pick<Pet, 'neutered' | 'breedingProfile'>> = [],
): boolean {
  if (accountHasRole(account, 'breeder')) return true
  return pets.some((pet) => hasActiveBreedingProfile(pet))
}

export const BREEDER_PRO_INELIGIBLE_MESSAGE =
  'Breeder Pro je určeno pro chovné profily.'

/** Basic Family membership flag — no household system here. */
export function hasFamilyMembership(
  sub: SubscriptionRecord | PlanId,
): boolean {
  return effectivePlan(sub) === 'family'
}

export function isBreederProPlan(plan: PlanId): boolean {
  return plan === 'breeder_pro'
}
