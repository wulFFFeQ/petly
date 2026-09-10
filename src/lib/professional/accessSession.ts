import {
  activateAccess,
  cancelPendingAccess,
  findOpenAccess,
  grantPetAccess,
  listAccessForPet,
  listAccessForProfessional,
  requestProfessionalAccess,
  revokeAccess,
  updateAccessPermissions,
  type GrantPetAccessInput,
  type RequestProfessionalAccessInput,
} from './access'
import {
  loadPetProfessionalAccess,
  loadProfessionalAccessLogs,
  savePetProfessionalAccess,
  saveProfessionalAccessLogs,
} from './storage'
import type {
  PetProfessionalAccess,
  ProfessionalAccessLog,
  ProfessionalPermission,
} from './types'

export type AccessMutationResult = {
  access: PetProfessionalAccess | null
  accessList: PetProfessionalAccess[]
  logs: ProfessionalAccessLog[]
}

function persist(accessList: PetProfessionalAccess[], logs: ProfessionalAccessLog[]) {
  savePetProfessionalAccess(accessList)
  saveProfessionalAccessLogs(logs)
}

export function loadAccessState(): {
  accessList: PetProfessionalAccess[]
  logs: ProfessionalAccessLog[]
} {
  return {
    accessList: loadPetProfessionalAccess(),
    logs: loadProfessionalAccessLogs(),
  }
}

/** Owner-confirmed grant (default active). Blocks duplicate open access. */
export function grantOwnerPetAccess(
  input: GrantPetAccessInput,
): AccessMutationResult & { access: PetProfessionalAccess } {
  const { accessList, logs } = loadAccessState()
  const result = grantPetAccess(accessList, logs, {
    ...input,
    status: input.status ?? 'active',
  })
  persist(result.accessList, result.logs)
  return result
}

/** Professional (or owner) creates a pending request — no data access yet. */
export function requestPetProfessionalAccess(
  input: RequestProfessionalAccessInput,
): AccessMutationResult & { access: PetProfessionalAccess } {
  const { accessList, logs } = loadAccessState()
  const result = requestProfessionalAccess(accessList, logs, input)
  persist(result.accessList, result.logs)
  return result
}

export function activatePetProfessionalAccess(accessId: string): AccessMutationResult {
  const { accessList, logs } = loadAccessState()
  const result = activateAccess(accessList, logs, accessId)
  if (result.access) persist(result.accessList, result.logs)
  return result
}

export function revokePetProfessionalAccess(accessId: string): AccessMutationResult {
  const { accessList, logs } = loadAccessState()
  const result = revokeAccess(accessList, logs, accessId)
  if (result.access) persist(result.accessList, result.logs)
  return result
}

export function cancelPetProfessionalAccessRequest(accessId: string): AccessMutationResult {
  const { accessList, logs } = loadAccessState()
  const result = cancelPendingAccess(accessList, logs, accessId)
  if (result.access) persist(result.accessList, result.logs)
  return result
}

export function updatePetProfessionalAccessPermissions(
  accessId: string,
  permissions: ProfessionalPermission[],
): AccessMutationResult {
  const { accessList, logs } = loadAccessState()
  const result = updateAccessPermissions(accessList, logs, accessId, permissions)
  if (result.access) persist(result.accessList, result.logs)
  return result
}

/** Activate pending + set permissions in one owner confirmation step. */
export function approvePetProfessionalAccess(
  accessId: string,
  permissions: ProfessionalPermission[],
): AccessMutationResult {
  const { accessList, logs } = loadAccessState()
  const updated = updateAccessPermissions(accessList, logs, accessId, permissions)
  if (!updated.access) return { access: null, accessList, logs }
  const activated = activateAccess(updated.accessList, updated.logs, accessId)
  if (activated.access) persist(activated.accessList, activated.logs)
  return activated
}

export function getOpenAccessForPair(
  petId: string,
  professionalId: string,
): PetProfessionalAccess | undefined {
  return findOpenAccess(loadPetProfessionalAccess(), petId, professionalId)
}

export function getAccessListForPet(petId: string): PetProfessionalAccess[] {
  return listAccessForPet(loadPetProfessionalAccess(), petId)
}

export function getAccessListForProfessional(
  professionalId: string,
): PetProfessionalAccess[] {
  return listAccessForProfessional(loadPetProfessionalAccess(), professionalId)
}

export function appendAndPersistAccessLogs(logs: ProfessionalAccessLog[]): void {
  saveProfessionalAccessLogs(logs)
}
