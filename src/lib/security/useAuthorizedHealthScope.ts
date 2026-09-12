/**
 * K50 — React hook: clinical health scope via authorize() (not a second ACL).
 */
import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import {
  canPetClinical,
  filterHealthRecordsForClinicalAccess,
  filterPetsWithClinicalAccess,
} from '../../lib/security'
import type { HealthRecord, Pet } from '../../types'

export type AuthorizedHealthScope = {
  allowedPets: Pet[]
  allowedRecords: HealthRecord[]
  canReadPet: (petId: string) => boolean
  canWritePet: (petId: string) => boolean
  canReadDocuments: (petId: string) => boolean
  canWriteDocuments: (petId: string) => boolean
}

export function useAuthorizedHealthScope(): AuthorizedHealthScope {
  const { pets, healthRecords } = useApp()

  return useMemo(() => {
    const allowedPets = filterPetsWithClinicalAccess(pets, 'health.read', { pets })
    const allowedRecords = filterHealthRecordsForClinicalAccess(
      healthRecords,
      pets,
      'health.read',
      { pets },
    )
    const writeIds = new Set(
      filterPetsWithClinicalAccess(pets, 'health.write', { pets }).map((p) => p.id),
    )
    const docReadIds = new Set(
      filterPetsWithClinicalAccess(pets, 'documents.read', { pets }).map((p) => p.id),
    )
    const docWriteIds = new Set(
      filterPetsWithClinicalAccess(pets, 'documents.write', { pets }).map((p) => p.id),
    )
    const readIds = new Set(allowedPets.map((p) => p.id))

    return {
      allowedPets,
      allowedRecords,
      canReadPet: (petId: string) => readIds.has(petId),
      canWritePet: (petId: string) => writeIds.has(petId),
      canReadDocuments: (petId: string) => docReadIds.has(petId),
      canWriteDocuments: (petId: string) => docWriteIds.has(petId),
    }
  }, [pets, healthRecords])
}

/** Convenience for one-pet profile surfaces. */
export function usePetClinicalFlags(petId: string) {
  const { pets } = useApp()
  return useMemo(
    () => ({
      canRead: canPetClinical('health.read', petId, { pets }),
      canWrite: canPetClinical('health.write', petId, { pets }),
      canReadDocuments: canPetClinical('documents.read', petId, { pets }),
      canWriteDocuments: canPetClinical('documents.write', petId, { pets }),
    }),
    [petId, pets],
  )
}
