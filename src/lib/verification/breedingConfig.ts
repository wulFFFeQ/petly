import type { Pet } from '../../types'
import { hasActiveBreedingProfile } from '../breedingProfile'
import { createVerificationId } from './storage'
import { isActiveTrustVerification } from './status'
import type { Verification, VerificationType } from './types'

/**
 * Configurable requirements for „Ověřený chovný profil“.
 * Change here without rewriting UI — breeding badge is never a manual toggle.
 */
export const BREEDING_VERIFICATION_REQUIREMENTS = {
  requireActiveBreedingProfile: true,
  /**
   * Dílčí trust verification types that must be active for the pet/owner.
   * identity → user subject; pet → pet subject.
   */
  requiredVerificationTypes: ['identity', 'pet'] as const satisfies readonly VerificationType[],
  /**
   * Future hooks (not enforced until providers/data policies exist):
   * pedigree / registry, health tests, show results.
   */
  futureRequiredSignals: [] as const as ReadonlyArray<
    'pedigree_registry' | 'health_tests' | 'show_results'
  >,
}

export type BreedingRequirementType =
  (typeof BREEDING_VERIFICATION_REQUIREMENTS.requiredVerificationTypes)[number]

export type BreedingEvaluationResult = {
  eligible: boolean
  missing: BreedingRequirementType[]
  activeBreedingProfile: boolean
  verification: Verification | null
}

function hasRequired(
  list: Verification[],
  type: BreedingRequirementType,
  petId: string,
  ownerId: string,
  now: number,
): boolean {
  if (type === 'pet') {
    return list.some(
      (v) =>
        v.type === 'pet' &&
        v.subjectType === 'pet' &&
        v.subjectId === petId &&
        isActiveTrustVerification(v, now),
    )
  }
  if (type === 'identity') {
    return list.some(
      (v) =>
        v.type === 'identity' &&
        v.subjectType === 'user' &&
        v.subjectId === ownerId &&
        isActiveTrustVerification(v, now),
    )
  }
  // Other required types: match pet-scoped first, then user
  return list.some(
    (v) =>
      v.type === type &&
      isActiveTrustVerification(v, now) &&
      ((v.subjectType === 'pet' && v.subjectId === petId) ||
        (v.subjectType === 'user' && v.subjectId === ownerId)),
  )
}

/**
 * Evaluate / synthesize breeding verification for a pet.
 * Never creates a trust breeding badge unless all config requirements are met
 * and the breeding profile is active.
 */
export function evaluateBreedingVerification(
  pet: Pick<Pet, 'id' | 'neutered' | 'breedingProfile'>,
  verifications: Verification[],
  opts?: { ownerId?: string; now?: number; nowIso?: string },
): BreedingEvaluationResult {
  const ownerId = opts?.ownerId ?? 'owner_self'
  const now = opts?.now ?? Date.now()
  const nowIso = opts?.nowIso ?? new Date(now).toISOString()
  const activeBreedingProfile = hasActiveBreedingProfile(pet)
  const required = BREEDING_VERIFICATION_REQUIREMENTS.requiredVerificationTypes
  const missing: BreedingRequirementType[] = []

  if (BREEDING_VERIFICATION_REQUIREMENTS.requireActiveBreedingProfile && !activeBreedingProfile) {
    return {
      eligible: false,
      missing: [...required],
      activeBreedingProfile,
      verification: null,
    }
  }

  for (const type of required) {
    if (!hasRequired(verifications, type, pet.id, ownerId, now)) {
      missing.push(type)
    }
  }

  const existing = verifications.find(
    (v) =>
      v.type === 'breeding' &&
      v.subjectType === 'pet' &&
      v.subjectId === pet.id &&
      v.source === 'breeding_composite',
  )

  if (missing.length > 0) {
    // Revoke any previous composite if requirements no longer met
    if (existing && existing.status === 'verified') {
      return {
        eligible: false,
        missing,
        activeBreedingProfile,
        verification: {
          ...existing,
          status: 'revoked',
          metadata: {
            ...(existing.metadata ?? {}),
            revokedReason: 'requirements_unmet',
            missing,
            revokedAt: nowIso,
          },
        },
      }
    }
    return {
      eligible: false,
      missing,
      activeBreedingProfile,
      verification: existing
        ? {
            ...existing,
            status: existing.status === 'revoked' ? 'revoked' : 'unverified',
            metadata: { ...(existing.metadata ?? {}), missing },
          }
        : null,
    }
  }

  const verification: Verification = {
    id: existing?.id ?? createVerificationId('breeding'),
    subjectType: 'pet',
    subjectId: pet.id,
    type: 'breeding',
    status: 'verified',
    source: 'breeding_composite',
    presentation: 'trust',
    verifiedAt: existing?.verifiedAt ?? nowIso,
    metadata: {
      requiredTypes: [...required],
      composite: true,
      evaluatedAt: nowIso,
    },
  }

  return {
    eligible: true,
    missing: [],
    activeBreedingProfile,
    verification,
  }
}

/**
 * Apply breeding evaluation into a verification list (upsert or revoke).
 */
export function applyBreedingEvaluation(
  list: Verification[],
  pet: Pick<Pet, 'id' | 'neutered' | 'breedingProfile'>,
  opts?: { ownerId?: string; now?: number; nowIso?: string },
): Verification[] {
  const result = evaluateBreedingVerification(pet, list, opts)
  if (!result.verification) {
    // Drop breeding composite for this pet if ineligible and none to keep
    return list.filter(
      (v) =>
        !(
          v.type === 'breeding' &&
          v.subjectType === 'pet' &&
          v.subjectId === pet.id &&
          v.source === 'breeding_composite'
        ),
    )
  }
  const without = list.filter((v) => v.id !== result.verification!.id)
  // Also remove other breeding_composite for same pet
  const cleaned = without.filter(
    (v) =>
      !(
        v.type === 'breeding' &&
        v.subjectType === 'pet' &&
        v.subjectId === pet.id &&
        v.source === 'breeding_composite' &&
        v.id !== result.verification!.id
      ),
  )
  return [...cleaned, result.verification]
}
