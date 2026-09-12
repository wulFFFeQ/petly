import { invokeEdgeFunction, type ApiResult } from './edgeClient'

export async function remoteCreateBooking(input: {
  professionalId: string
  serviceId: string
  petId: string
  startAt: string
  endAt: string
  note?: string
  clientRequestId?: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('bookings', { op: 'create', ...input })
}

export async function remoteBookingLifecycle(
  op: 'confirm' | 'decline' | 'cancel' | 'complete' | 'no_show',
  bookingId: string,
): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('bookings', { op, bookingId })
}

export async function remoteRescheduleBooking(input: {
  bookingId: string
  startAt: string
  endAt: string
}): Promise<ApiResult<unknown>> {
  return invokeEdgeFunction('bookings', { op: 'reschedule', ...input })
}
