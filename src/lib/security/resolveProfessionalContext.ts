/**
 * Professional context — bind ProfessionalProfile to authenticated account.
 * Profile type / account role never grants pet data access.
 */

import { loadProfessionalProfiles } from '../professional/storage'
import type { ProfessionalProfile } from '../professional/types'
import { actorAccountId } from './context'
import type { SecurityContext, ValidatedProfessionalContext } from './types'

export type ResolveProfessionalContextDeps = {
  loadProfiles?: () => ProfessionalProfile[]
  /** Optional explicit profile id — must still belong to actor. */
  claimedProfessionalProfileId?: string
}

export type ResolveProfessionalContextResult =
  | { ok: true; professional: ValidatedProfessionalContext; profile: ProfessionalProfile }
  | { ok: false; message: string }

export function resolveProfessionalContext(
  ctx: SecurityContext,
  deps: ResolveProfessionalContextDeps = {},
): ResolveProfessionalContextResult {
  const accountId = actorAccountId(ctx)
  if (!accountId) {
    return { ok: false, message: 'No authenticated account for professional context' }
  }

  const loadProfiles = deps.loadProfiles ?? loadProfessionalProfiles
  const profiles = loadProfiles().filter((p) => p.accountId === accountId)

  if (profiles.length === 0) {
    return { ok: false, message: 'No ProfessionalProfile bound to actor account' }
  }

  const claimed = deps.claimedProfessionalProfileId?.trim()
  let profile: ProfessionalProfile | undefined
  if (claimed) {
    profile = profiles.find((p) => p.id === claimed)
    if (!profile) {
      return {
        ok: false,
        message: 'Claimed professionalProfileId does not belong to actor',
      }
    }
  } else {
    profile = profiles[0]
  }

  return {
    ok: true,
    professional: { professionalProfileId: profile.id },
    profile,
  }
}
