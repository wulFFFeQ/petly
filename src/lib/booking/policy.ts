/**
 * Professional-level booking rules (cancellation, reschedule, confirm, no-show).
 * Not paywalled — advanced fees/reminders may be premium later.
 */

import {
  loadBookingPolicies,
  saveBookingPolicies,
} from './storage'
import type {
  Booking,
  ProfessionalBookingPolicy,
} from './types'

export const DEFAULT_CANCELLATION_NOTICE_HOURS = 24

export const CANCELLATION_NOTICE_OPTIONS: Array<{
  value: number | null
  label: string
}> = [
  { value: null, label: 'Bez omezení' },
  { value: 12, label: '12 hodin předem' },
  { value: 24, label: '24 hodin předem' },
  { value: 48, label: '48 hodin předem' },
  { value: 72, label: '72 hodin předem' },
]

export function defaultBookingPolicy(professionalId: string): ProfessionalBookingPolicy {
  return {
    professionalId,
    cancellationNoticeHours: DEFAULT_CANCELLATION_NOTICE_HOURS,
    allowReschedule: true,
    confirmMode: 'manual',
    noShowMode: 'after_start',
  }
}

export function getBookingPolicy(professionalId: string): ProfessionalBookingPolicy | null {
  return loadBookingPolicies().find((p) => p.professionalId === professionalId) ?? null
}

export function ensureDefaultBookingPolicy(professionalId: string): ProfessionalBookingPolicy {
  const existing = getBookingPolicy(professionalId)
  if (existing) return existing
  const created = defaultBookingPolicy(professionalId)
  const all = loadBookingPolicies()
  all.push(created)
  saveBookingPolicies(all)
  return created
}

export type SetBookingPolicyInput = Partial<
  Pick<
    ProfessionalBookingPolicy,
    'cancellationNoticeHours' | 'allowReschedule' | 'confirmMode' | 'noShowMode'
  >
>

export function setBookingPolicy(
  professionalId: string,
  patch: SetBookingPolicyInput,
): ProfessionalBookingPolicy {
  const all = loadBookingPolicies()
  const idx = all.findIndex((p) => p.professionalId === professionalId)
  const base = idx >= 0 ? all[idx]! : defaultBookingPolicy(professionalId)
  const next: ProfessionalBookingPolicy = {
    ...base,
    professionalId,
    cancellationNoticeHours:
      patch.cancellationNoticeHours !== undefined
        ? patch.cancellationNoticeHours
        : base.cancellationNoticeHours,
    allowReschedule:
      patch.allowReschedule !== undefined ? patch.allowReschedule : base.allowReschedule,
    confirmMode: patch.confirmMode ?? base.confirmMode,
    noShowMode: patch.noShowMode ?? base.noShowMode,
  }
  // DEMO: confirm stays manual.
  next.confirmMode = 'manual'
  next.noShowMode = 'after_start'

  if (idx >= 0) all[idx] = next
  else all.push(next)
  saveBookingPolicies(all)
  return next
}

export type OwnerCancelPolicyReason = 'ok' | 'within_notice_window' | 'unlimited'

export type OwnerCancelPolicyResult = {
  allowed: boolean
  reason: OwnerCancelPolicyReason
  noticeHours: number | null
  hoursUntilStart: number
}

/**
 * Owner may always cancel `requested`.
 * For `confirmed`, honour cancellationNoticeHours (null = unlimited).
 */
export function canOwnerCancelByPolicy(
  booking: Pick<Booking, 'status' | 'startAt'>,
  policy: Pick<ProfessionalBookingPolicy, 'cancellationNoticeHours'>,
  now = new Date(),
): OwnerCancelPolicyResult {
  const startMs = Date.parse(booking.startAt)
  const hoursUntilStart = Number.isFinite(startMs)
    ? (startMs - now.getTime()) / 3_600_000
    : 0

  if (booking.status === 'requested') {
    return {
      allowed: true,
      reason: 'ok',
      noticeHours: policy.cancellationNoticeHours,
      hoursUntilStart,
    }
  }

  if (booking.status !== 'confirmed') {
    return {
      allowed: false,
      reason: 'within_notice_window',
      noticeHours: policy.cancellationNoticeHours,
      hoursUntilStart,
    }
  }

  const notice = policy.cancellationNoticeHours
  if (notice === null) {
    return {
      allowed: true,
      reason: 'unlimited',
      noticeHours: null,
      hoursUntilStart,
    }
  }

  if (hoursUntilStart >= notice) {
    return {
      allowed: true,
      reason: 'ok',
      noticeHours: notice,
      hoursUntilStart,
    }
  }

  return {
    allowed: false,
    reason: 'within_notice_window',
    noticeHours: notice,
    hoursUntilStart,
  }
}

/** Public-safe one-liner for professional profile (no internal metadata). */
export function formatCancellationPolicyPublic(
  policy: Pick<ProfessionalBookingPolicy, 'cancellationNoticeHours'>,
): string {
  const hours = policy.cancellationNoticeHours
  if (hours === null) {
    return 'Rušení rezervace je možné bez omezení.'
  }
  return `Rušení rezervace je možné do ${hours} hodin před termínem.`
}

/** Dialog hint for owner cancel confirmation. */
export function formatOwnerCancelPolicyHint(
  result: OwnerCancelPolicyResult,
): string {
  if (result.allowed) {
    return 'Tuto rezervaci lze nyní zrušit.'
  }
  const hours = result.noticeHours ?? 24
  return `Do termínu zbývá méně než ${hours} hodin.`
}
