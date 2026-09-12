/**
 * Account bootstrap — server creates accounts via auth trigger.
 * Client only reads/updates display fields; never invents accountId.
 */

import { invokeEdgeFunction, type ApiResult } from './apiClient'

export async function remoteGetMyAccount(): Promise<
  ApiResult<{ account: Record<string, unknown> | null }>
> {
  return invokeEdgeFunction('pets', { op: 'getMyAccount' })
}

export async function remoteUpdateMyAccount(input: {
  displayName?: string
  roles?: string[]
  kind?: string
}): Promise<ApiResult<{ account: Record<string, unknown> }>> {
  return invokeEdgeFunction('pets', { op: 'updateMyAccount', ...input })
}
