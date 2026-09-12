import { invokeEdgeFunction, type ApiResult } from './apiClient'

export async function remoteListMyNotifications(): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('notifications', { op: 'listMine' })
}

export async function remoteMarkNotificationRead(
  notificationId: string,
): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('notifications', { op: 'markRead', notificationId })
}
