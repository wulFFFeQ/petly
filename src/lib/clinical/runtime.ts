/**
 * App clinical runtime — DEMO vs REAL adapter/service selection.
 * Production never wraps localStorage.
 */

import type { Pet } from '../../types'
import { getCachedAuthenticatedAccountId } from '../auth/sessionCache'
import { isRealBackendMode } from '../backend/mode'
import { createAppSecurityContext } from '../security/appSessionAdapter'
import type { SecurityContext } from '../security/types'
import {
  DemoClinicalPersistenceAdapter,
  ServerClinicalPersistenceAdapter,
  type ClinicalPersistenceAdapter,
  type DemoClinicalStoreHooks,
} from './adapter'
import {
  createDemoClinicalService,
  createServerClinicalService,
  type ClinicalService,
} from './service'

export type AuthorizeDepsStore = {
  store: { pets: Pet[] }
}

export function resolveAppClinicalStampContext(): SecurityContext {
  if (isRealBackendMode()) {
    const accountId = getCachedAuthenticatedAccountId()
    const result = createAppSecurityContext({
      authenticatedAccountId: accountId,
    })
    if (!result.ok) {
      throw new Error(result.reason ?? 'Unauthenticated clinical context')
    }
    return result.context
  }
  const demo = createAppSecurityContext({})
  if (!demo.ok) {
    throw new Error('DEMO security context failed')
  }
  return demo.context
}

export function buildAppClinicalAdapter(
  hooks: DemoClinicalStoreHooks,
): ClinicalPersistenceAdapter {
  if (isRealBackendMode()) {
    const adapter = new ServerClinicalPersistenceAdapter({ forceWired: true })
    adapter.setHealthRecords(hooks.getHealthRecords())
    if (hooks.getDocuments) adapter.setDocuments(hooks.getDocuments())
    if (hooks.getEncounters) adapter.setEncounters(hooks.getEncounters())
    if (hooks.getHealthRecordVersions) {
      for (const snap of hooks.getHealthRecordVersions()) {
        try {
          adapter.appendHealthRecordVersion(snap)
        } catch {
          /* duplicate seed ignore */
        }
      }
    }
    if (hooks.getEncounterVersions) {
      for (const snap of hooks.getEncounterVersions()) {
        try {
          adapter.appendEncounterVersion(snap)
        } catch {
          /* ignore */
        }
      }
    }
    if (hooks.getDocumentVersions) {
      for (const snap of hooks.getDocumentVersions()) {
        try {
          adapter.appendDocumentVersion(snap)
        } catch {
          /* ignore */
        }
      }
    }
    const origSetHealth = adapter.setHealthRecords.bind(adapter)
    adapter.setHealthRecords = (records) => {
      origSetHealth(records)
      hooks.setHealthRecords(records)
    }
    const origSetDocs = adapter.setDocuments.bind(adapter)
    adapter.setDocuments = (docs) => {
      origSetDocs(docs)
      hooks.setDocuments?.(docs)
    }
    const origSetEnc = adapter.setEncounters.bind(adapter)
    adapter.setEncounters = (enc) => {
      origSetEnc(enc)
      hooks.setEncounters?.(enc)
    }
    return adapter
  }
  return new DemoClinicalPersistenceAdapter(hooks)
}

export function createAppClinicalService(
  adapter: ClinicalPersistenceAdapter,
  deps?: AuthorizeDepsStore,
): ClinicalService {
  if (isRealBackendMode()) {
    return createServerClinicalService(adapter, deps)
  }
  return createDemoClinicalService(adapter, deps)
}
