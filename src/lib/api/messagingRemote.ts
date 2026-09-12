import { invokeEdgeFunction, type ApiResult } from './edgeClient'

export async function remoteCreateConversation(input: {
  participantAccountIds: string[]
  bookingId?: string
  professionalId?: string
  petId?: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('messaging', { op: 'createConversation', ...input })
}

export async function remoteSendMessage(input: {
  conversationId: string
  text: string
  attachment?: Record<string, unknown>
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('messaging', { op: 'sendMessage', ...input })
}

export async function remoteListMessages(conversationId: string): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('messaging', { op: 'listMessages', conversationId })
}
