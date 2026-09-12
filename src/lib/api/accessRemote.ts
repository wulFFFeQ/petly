import { invokeEdgeFunction, type ApiResult } from './edgeClient'

export async function remoteGrantHousehold(input: {
  petId: string
  accountId: string
  role: string
  permissions: string[]
  expiresAt?: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('access', { op: 'grantHousehold', ...input })
}

export async function remoteRevokeHousehold(input: {
  petId: string
  accountId: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('access', { op: 'revokeHousehold', ...input })
}

export async function remoteGrantProfessional(input: {
  petId: string
  professionalId: string
  permissions: string[]
  expiresAt?: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('access', { op: 'grantProfessional', ...input })
}

export async function remoteRevokeProfessional(input: {
  petId: string
  professionalId: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('access', { op: 'revokeProfessional', ...input })
}

export async function remoteGrantOrgPet(input: {
  petId: string
  organizationId: string
  permissions: string[]
  visibilityMode?: string
  assignedAccountIds?: string[]
  eligibleRoles?: string[]
  expiresAt?: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('access', { op: 'grantOrgPet', ...input })
}

export async function remoteRevokeOrgPet(input: {
  petId: string
  organizationId: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('access', { op: 'revokeOrgPet', ...input })
}

export async function remoteListAccessForPet(petId: string): Promise<
  ApiResult<{
    household: unknown[]
    professional: unknown[]
    organization: unknown[]
  }>
> {
  return invokeEdgeFunction('access', { op: 'listForPet', petId })
}
