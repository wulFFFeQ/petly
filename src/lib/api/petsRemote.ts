import { invokeEdgeFunction, type ApiResult } from './apiClient'
import type { Pet } from '../../types'

function petFromRow(row: Record<string, unknown>): Pet {
  const payload = (row.payload as Pet | undefined) ?? ({} as Pet)
  return {
    ...payload,
    id: String(row.id ?? payload.id),
    name: String(row.name ?? payload.name ?? ''),
    type: (row.type as Pet['type']) ?? payload.type,
    breed: (row.breed as string | undefined) ?? payload.breed,
    image: (row.image as string | undefined) ?? payload.image,
    ownerAccountId: String(row.owner_account_id ?? payload.ownerAccountId ?? ''),
    emergencyCard:
      (row.emergency_card as Pet['emergencyCard']) ?? payload.emergencyCard,
  }
}

export async function remoteListMyPets(): Promise<ApiResult<{ pets: Pet[] }>> {
  const result = await invokeEdgeFunction<{ ok?: boolean; pets?: Record<string, unknown>[] }>(
    'pets',
    { op: 'listMine' },
  )
  if (!result.ok) return result
  const pets = (result.data.pets ?? []).map((row) => petFromRow(row))
  return { ok: true, data: { pets } }
}

export async function remoteCreatePet(pet: Pet): Promise<ApiResult<{ pet: Pet }>> {
  const result = await invokeEdgeFunction<{ ok?: boolean; pet?: Record<string, unknown> }>(
    'pets',
    { op: 'create', pet: pet as unknown as Record<string, unknown> },
  )
  if (!result.ok) return result
  if (!result.data.pet) {
    return { ok: false, code: 'invalid', message: 'Missing pet in response' }
  }
  return { ok: true, data: { pet: petFromRow(result.data.pet) } }
}

export async function remoteUpdatePet(
  petId: string,
  pet: Partial<Pet> & Record<string, unknown>,
): Promise<ApiResult<{ pet: Pet }>> {
  const result = await invokeEdgeFunction<{ ok?: boolean; pet?: Record<string, unknown> }>(
    'pets',
    { op: 'update', petId, pet },
  )
  if (!result.ok) return result
  if (!result.data.pet) {
    return { ok: false, code: 'invalid', message: 'Missing pet in response' }
  }
  return { ok: true, data: { pet: petFromRow(result.data.pet) } }
}

export async function remoteWithdrawPet(petId: string): Promise<ApiResult<{ ok: true }>> {
  return invokeEdgeFunction('pets', { op: 'withdraw', petId })
}
