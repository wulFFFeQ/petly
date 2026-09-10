/**
 * Professional dashboard selectors — derived from existing access / audit /
 * notifications / calendar. No parallel models. Role ≠ access ≠ entitlement.
 */
import { getSelfAccount, listSelfProfessionalProfiles } from '../account/session'
import { APP_TODAY, isSameDay, parseEventDate } from '../dashboardDates'
import type {
  AppNotification,
  CalendarEvent,
  HealthRecord,
  Pet,
  PetDocument,
} from '../../types'
import {
  canProfessionalAddHealthRecord,
  canProfessionalAddNote,
  canProfessionalAddVaccination,
  canProfessionalAddVisit,
  isAccessEffective,
  listAccessForProfessional,
  resolveAccessStatus,
} from './access'
import { filterLogsForProfessional } from './audit'
import { getRoleMeta } from './catalog'
import { isWritePermission } from './permissions'
import { suggestedPermissionsForRole } from './permissionLabels'
import { projectPetForProfessional, type ProfessionalPetView } from './project'
import { isProfessionalAccount } from './roles'
import { loadPetProfessionalAccess } from './storage'
import { loadAccessState } from './accessSession'
import type {
  PetProfessionalAccess,
  ProfessionalAccessLog,
  ProfessionalPermission,
  ProfessionalProfile,
} from './types'

export type ProfessionalDashboardStats = {
  activeConnections: number
  pendingRequests: number
  todaysEvents: number
  unreadNotifications: number
}

export type ProfessionalActivityItem = {
  id: string
  petId: string
  petName: string
  label: string
  timestamp: string
  source: 'audit' | 'notification'
}

export type ProfessionalQuickAction = {
  permission: ProfessionalPermission
  label: string
  /** First petId that grants this write permission (for deep-link). */
  petId?: string
}

export type ProfessionalPetCardModel = {
  access: PetProfessionalAccess
  status: ReturnType<typeof resolveAccessStatus>
  effective: boolean
  view: ProfessionalPetView
  /** Safe display fields only — never full Pet. */
  name: string
  breed?: string
  type?: string
  image?: string
  permissionCount: number
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  access_requested: 'Nová žádost o propojení',
  access_granted: 'Přístup schválen',
  access_revoked: 'Přístup odebrán',
  record_viewed: 'Zobrazen zdravotní záznam',
  record_added: 'Přidán záznam',
  vaccination_added: 'Přidáno očkování',
  document_viewed: 'Zobrazen dokument',
}

const QUICK_ACTION_LABELS: Partial<Record<ProfessionalPermission, string>> = {
  addVisit: 'Přidat návštěvu',
  addVaccination: 'Přidat očkování',
  addHealthRecord: 'Přidat zdravotní záznam',
  addNote: 'Přidat poznámku',
}

/** Active self professional profile for the dashboard workspace. */
export function getActiveSelfProfessionalProfile(
  preferredId?: string | null,
): ProfessionalProfile | null {
  const profiles = listSelfProfessionalProfiles()
  if (profiles.length === 0) return null
  if (preferredId) {
    const match = profiles.find((p) => p.id === preferredId)
    if (match) return match
  }
  return profiles[0] ?? null
}

export function canAccessProfessionalDashboard(): boolean {
  const account = getSelfAccount()
  return Boolean(account && isProfessionalAccount(account))
}

export function countUnreadNotificationsForAccount(
  notifications: AppNotification[],
  accountId: string | undefined,
): number {
  return notifications.filter((n) => {
    if (!n.unread) return false
    if (!n.recipientAccountId) return true
    return n.recipientAccountId === accountId
  }).length
}

export function listTodaysEventsForProfessional(
  professionalId: string,
  calendarEvents: CalendarEvent[],
  now: number = Date.now(),
  today: Date = APP_TODAY,
): CalendarEvent[] {
  const activePetIds = new Set(
    listAccessForProfessional(loadPetProfessionalAccess(), professionalId)
      .filter((a) => isAccessEffective(a, now))
      .map((a) => a.petId),
  )
  if (activePetIds.size === 0) return []

  return calendarEvents.filter((ev) => {
    const petId = ev.petId
    if (!petId || !activePetIds.has(petId)) return false
    try {
      return isSameDay(parseEventDate(ev.date), today)
    } catch {
      return false
    }
  })
}

export function computeProfessionalDashboardStats(opts: {
  professionalId: string
  notifications: AppNotification[]
  calendarEvents: CalendarEvent[]
  accountId?: string
  now?: number
}): ProfessionalDashboardStats {
  const now = opts.now ?? Date.now()
  const accessList = listAccessForProfessional(
    loadPetProfessionalAccess(),
    opts.professionalId,
  )
  return {
    activeConnections: accessList.filter((a) => isAccessEffective(a, now)).length,
    pendingRequests: accessList.filter((a) => a.status === 'pending').length,
    todaysEvents: listTodaysEventsForProfessional(
      opts.professionalId,
      opts.calendarEvents,
      now,
    ).length,
    unreadNotifications: countUnreadNotificationsForAccount(
      opts.notifications,
      opts.accountId ?? getSelfAccount()?.id,
    ),
  }
}

/**
 * Identity-safe card projection: name/breed/type only when an access row exists
 * for this professional. Health data only via projectPetForProfessional when effective.
 */
export function buildProfessionalPetCard(
  access: PetProfessionalAccess,
  pets: Pet[],
  opts?: {
    healthRecords?: HealthRecord[]
    documents?: PetDocument[]
    now?: number
  },
): ProfessionalPetCardModel {
  const now = opts?.now ?? Date.now()
  const pet = pets.find((p) => p.id === access.petId)
  const status = resolveAccessStatus(access, now)
  const effective = isAccessEffective(access, now)

  const { view } = projectPetForProfessional(pet ?? ({ id: access.petId } as Pet), {
    access,
    healthRecords: opts?.healthRecords,
    documents: opts?.documents,
    now,
    logViews: false,
  })

  const name =
    view.name ??
    (access.status === 'pending' || access.status === 'active'
      ? pet?.name
      : undefined) ??
    access.petId
  const breed = view.breed ?? (effective || access.status === 'pending' ? pet?.breed : undefined)
  const type = view.type ?? (effective || access.status === 'pending' ? pet?.type : undefined)
  const image = effective || access.status === 'pending' ? pet?.image : undefined

  return {
    access,
    status,
    effective,
    view,
    name,
    breed,
    type,
    image,
    permissionCount: access.permissions.length,
  }
}

export function listProfessionalPetCards(
  professionalId: string,
  pets: Pet[],
  opts?: {
    healthRecords?: HealthRecord[]
    documents?: PetDocument[]
    now?: number
    statuses?: Array<PetProfessionalAccess['status']>
  },
): ProfessionalPetCardModel[] {
  const statuses = opts?.statuses ?? ['active', 'pending']
  return listAccessForProfessional(loadPetProfessionalAccess(), professionalId)
    .filter((a) => statuses.includes(a.status))
    .map((a) => buildProfessionalPetCard(a, pets, opts))
}

export function buildRecentActivity(opts: {
  professionalId: string
  pets: Pet[]
  notifications?: AppNotification[]
  logs?: ProfessionalAccessLog[]
  limit?: number
}): ProfessionalActivityItem[] {
  const limit = opts.limit ?? 8
  const { logs: storedLogs } = loadAccessState()
  const logs = filterLogsForProfessional(opts.logs ?? storedLogs, opts.professionalId)
  const items: ProfessionalActivityItem[] = logs.map((log) => {
    const pet = opts.pets.find((p) => p.id === log.petId)
    return {
      id: log.id,
      petId: log.petId,
      petName: pet?.name ?? log.petId,
      label: AUDIT_ACTION_LABELS[log.action] ?? log.action,
      timestamp: log.timestamp,
      source: 'audit' as const,
    }
  })

  const accountId = getSelfAccount()?.id
  for (const n of opts.notifications ?? []) {
    if (n.recipientAccountId && accountId && n.recipientAccountId !== accountId) continue
    if (!String(n.type).startsWith('professional_access_')) continue
    items.push({
      id: `notif_${n.id}`,
      petId: n.petId ?? '',
      petName: n.petName ?? 'Mazlíček',
      label: n.title,
      timestamp: n.createdAt,
      source: 'notification',
    })
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items.slice(0, limit)
}

/**
 * Quick WRITE actions: suggested-for-role ∩ actual write permissions on any active access.
 * Role alone never enables an action.
 */
export function listAvailableQuickActions(
  profile: ProfessionalProfile,
  now: number = Date.now(),
): ProfessionalQuickAction[] {
  const suggested = suggestedPermissionsForRole(profile.type).filter(isWritePermission)
  const accessList = listAccessForProfessional(loadPetProfessionalAccess(), profile.id).filter(
    (a) => isAccessEffective(a, now),
  )
  const actions: ProfessionalQuickAction[] = []

  for (const perm of suggested) {
    const withPerm = accessList.find((a) => {
      if (perm === 'addVisit') return canProfessionalAddVisit(a, now)
      if (perm === 'addVaccination') return canProfessionalAddVaccination(a, now)
      if (perm === 'addHealthRecord') return canProfessionalAddHealthRecord(a, now)
      if (perm === 'addNote') return canProfessionalAddNote(a, now)
      return a.permissions.includes(perm)
    })
    if (!withPerm) continue
    actions.push({
      permission: perm,
      label: QUICK_ACTION_LABELS[perm] ?? perm,
      petId: withPerm.petId,
    })
  }
  return actions
}

export function formatActivityTime(iso: string, today: Date = APP_TODAY): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    if (isSameDay(d, today)) {
      return `dnes ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`
    }
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (isSameDay(d, yesterday)) return 'včera'
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

export function professionalRoleLabel(type: string): string {
  return getRoleMeta(type).label
}

/** True when account can switch between consumer and professional UI. */
export function canSwitchWorkspace(): boolean {
  const account = getSelfAccount()
  if (!account) return false
  const hasOwner = account.roles.includes('owner')
  const hasPro = isProfessionalAccount(account)
  return hasOwner && hasPro
}

export function loadProfessionalAccessRows(professionalId: string): PetProfessionalAccess[] {
  return loadPetProfessionalAccess().filter((a) => a.professionalId === professionalId)
}
