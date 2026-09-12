/**
 * K60 — Authorized WeightMeasurement projections.
 * WeightMeasurement remains measurement SSOT; projections must not leak
 * account provenance to professional / organization views.
 */

import type { WeightMeasurement } from '../../types'

export type AuthorizedWeightViewMode = 'household' | 'professional' | 'organization'

/**
 * Project a WeightMeasurement for an already-authorized actor.
 * Call only AFTER authorize(health.read) / equivalent permission gate.
 */
export function toAuthorizedWeightView(
  entry: WeightMeasurement,
  mode: AuthorizedWeightViewMode = 'household',
): WeightMeasurement {
  if (mode === 'professional' || mode === 'organization') {
    return {
      ...entry,
      createdByAccountId: undefined,
      updatedByAccountId: undefined,
    }
  }
  return { ...entry }
}

export function toAuthorizedWeightViews(
  entries: WeightMeasurement[],
  mode: AuthorizedWeightViewMode = 'household',
): WeightMeasurement[] {
  return entries.map((e) => toAuthorizedWeightView(e, mode))
}
