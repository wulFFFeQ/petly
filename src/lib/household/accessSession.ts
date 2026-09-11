import {
  grantHouseholdAccess,
  listHouseholdAccessForPet,
  findOpenHouseholdAccess,
  revokeHouseholdAccess,
  updateHouseholdAccess,
  type GrantHouseholdAccessInput,
  type UpdateHouseholdAccessInput,
} from './access'
import {
  loadPetHouseholdAccess,
  loadPetHouseholdAccessLogs,
  savePetHouseholdAccess,
  savePetHouseholdAccessLogs,
} from './storage'
import type { PetHouseholdAccess, PetHouseholdAccessLog, HouseholdPetPermission } from './types'
import type { Pet } from '../../types'
import type { Account } from '../../types/professional'
import { loadAccounts } from '../professional/storage'

export type HouseholdAccessSessionResult = {
  access: PetHouseholdAccess | null
  accessList: PetHouseholdAccess[]
  logs: PetHouseholdAccessLog[]
}

function persist(accessList: PetHouseholdAccess[], logs: PetHouseholdAccessLog[]) {
  savePetHouseholdAccess(accessList)
  savePetHouseholdAccessLogs(logs)
}

export function loadHouseholdAccessState(): {
  accessList: PetHouseholdAccess[]
  logs: PetHouseholdAccessLog[]
} {
  return {
    accessList: loadPetHouseholdAccess(),
    logs: loadPetHouseholdAccessLogs(),
  }
}

export function grantOwnerHouseholdAccess(
  input: Omit<GrantHouseholdAccessInput, 'accounts'> & { accounts?: Account[] },
): HouseholdAccessSessionResult & { access: PetHouseholdAccess } {
  const { accessList, logs } = loadHouseholdAccessState()
  const result = grantHouseholdAccess(accessList, logs, {
    ...input,
    accounts: input.accounts ?? loadAccounts(),
    status: input.status ?? 'active',
  })
  persist(result.accessList, result.logs)
  return result
}

export function revokePetHouseholdAccess(
  accessId: string,
  opts: { pet: Pet; actorAccountId: string },
): HouseholdAccessSessionResult {
  const { accessList, logs } = loadHouseholdAccessState()
  const result = revokeHouseholdAccess(accessList, logs, accessId, opts)
  if (result.access) persist(result.accessList, result.logs)
  return result
}

export function updatePetHouseholdAccess(
  accessId: string,
  input: UpdateHouseholdAccessInput,
): HouseholdAccessSessionResult {
  const { accessList, logs } = loadHouseholdAccessState()
  const result = updateHouseholdAccess(accessList, logs, accessId, input)
  if (result.access) persist(result.accessList, result.logs)
  return result
}

export function updatePetHouseholdAccessPermissions(
  accessId: string,
  permissions: HouseholdPetPermission[],
  opts: { pet: Pet; actorAccountId: string },
): HouseholdAccessSessionResult {
  return updatePetHouseholdAccess(accessId, {
    pet: opts.pet,
    actorAccountId: opts.actorAccountId,
    permissions,
  })
}

export function getHouseholdAccessListForPet(petId: string): PetHouseholdAccess[] {
  return listHouseholdAccessForPet(loadPetHouseholdAccess(), petId)
}

export function getOpenHouseholdAccessForPair(
  petId: string,
  accountId: string,
): PetHouseholdAccess | undefined {
  return findOpenHouseholdAccess(loadPetHouseholdAccess(), petId, accountId)
}
