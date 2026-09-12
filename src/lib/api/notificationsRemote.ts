import { invokeEdgeFunction, type ApiResult } from './edgeClient'

export async function remoteListMyNotifications(): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('notifications', { op: 'listMine' })
}

export async function remoteMarkNotificationRead(
  notificationId: string,
): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('notifications', { op: 'markRead', notificationId })
}
