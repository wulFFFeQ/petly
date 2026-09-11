import { Link2, Shield, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { findProfessionalProfileById, getSelfAccount } from '../../../lib/account'
import { SELF_OWNER_ID } from '../../../lib/discover/owner'
import {
  ensureDemoHouseholdAccounts,
  formatHouseholdPermissionList,
  getHouseholdAccessListForPet,
  grantOwnerHouseholdAccess,
  HOUSEHOLD_PERMISSION_LABELS,
  HOUSEHOLD_PERMISSION_OPTIONS,
  HOUSEHOLD_ROLE_LABELS,
  loadHouseholdAccessState,
  filterHouseholdLogsForPet,
  revokePetHouseholdAccess,
  resolvePetOwnerAccountId,
  suggestedHouseholdPermissionsForRole,
  updatePetHouseholdAccess,
  type HouseholdPetPermission,
  type HouseholdPetRole,
  type PetHouseholdAccess,
  type PetHouseholdAccessLog,
} from '../../../lib/household'
import {
  emitHouseholdAccessNotification,
  emitProfessionalAccessNotification,
} from '../../../lib/notifications'
import {
  approvePetProfessionalAccess,
  cancelPetProfessionalAccessRequest,
  filterLogsForPet,
  formatPermissionList,
  getAccessListForPet,
  getRoleMeta,
  loadAccessState,
  loadAccounts,
  PERMISSION_LABELS,
  READ_PERMISSION_OPTIONS,
  revokePetProfessionalAccess,
  updatePetProfessionalAccessPermissions,
  WRITE_PERMISSION_OPTIONS,
  type PetProfessionalAccess,
  type ProfessionalAccessLog,
  type ProfessionalPermission,
} from '../../../lib/professional'
import { cn } from '../../../lib/utils'
import type { Pet } from '../../../types'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Modal } from '../../ui/Modal'

function proStatusLabel(status: PetProfessionalAccess['status']): string {
  switch (status) {
    case 'active':
      return 'Aktivní přístup'
    case 'pending':
      return 'Čeká na schválení'
    case 'revoked':
      return 'Odebráno'
    case 'expired':
      return 'Vypršelo'
    default:
      return status
  }
}

function hhStatusLabel(status: PetHouseholdAccess['status']): string {
  switch (status) {
    case 'active':
      return 'Aktivní'
    case 'pending':
      return 'Čeká'
    case 'revoked':
      return 'Odebráno'
    case 'expired':
      return 'Vypršelo'
    default:
      return status
  }
}

function statusTone(status: string): string {
  switch (status) {
    case 'active':
      return 'text-emerald-700'
    case 'pending':
      return 'text-amber-700'
    default:
      return 'text-[#7D8B82]'
  }
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function proActionLabel(action: string): string {
  switch (action) {
    case 'access_requested':
      return 'žádost o přístup'
    case 'access_granted':
      return 'přístup aktivován / upraven'
    case 'access_revoked':
      return 'přístup odebrán'
    case 'record_viewed':
      return 'zobrazena zdravotní historie'
    case 'document_viewed':
      return 'zobrazeny dokumenty'
    case 'record_added':
      return 'přidán záznam'
    case 'vaccination_added':
      return 'přidáno očkování'
    default:
      return action
  }
}

function hhActionLabel(action: string): string {
  switch (action) {
    case 'access_granted':
      return 'přístup udělen'
    case 'access_revoked':
      return 'přístup odebrán'
    case 'role_changed':
      return 'změna role'
    case 'permissions_updated':
      return 'upravená oprávnění'
    default:
      return action
  }
}

interface WhoHasAccessSectionProps {
  pet: Pet
}

export function WhoHasAccessSection({ pet }: WhoHasAccessSectionProps) {
  const petId = pet.id
  const petName = pet.name
  const { showToast, upsertNotification } = useApp()
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const ownerAccountId = resolvePetOwnerAccountId(pet)
  const accounts = useMemo(() => {
    ensureDemoHouseholdAccounts()
    return loadAccounts()
  }, [tick])

  const accountName = useCallback(
    (accountId: string) => {
      const a = accounts.find((x) => x.id === accountId)
      return a?.displayName?.trim() || accountId
    },
    [accounts],
  )

  // ── Professional access (unchanged domain) ──
  const proAccessList = useMemo(() => getAccessListForPet(petId), [petId, tick])
  const proLogs = useMemo(() => {
    const { logs: all } = loadAccessState()
    return filterLogsForPet(all, petId).slice().reverse()
  }, [petId, tick])
  const proVisible = proAccessList.filter((a) => a.status === 'active' || a.status === 'pending')
  const proHistory = proAccessList.filter((a) => a.status === 'revoked' || a.status === 'expired')

  const [manageProId, setManageProId] = useState<string | null>(null)
  const [revokeProId, setRevokeProId] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [editProPerms, setEditProPerms] = useState<ProfessionalPermission[]>([])

  const manageProAccess = manageProId ? proAccessList.find((a) => a.id === manageProId) : null
  const managePro = manageProAccess
    ? findProfessionalProfileById(manageProAccess.professionalId)
    : null

  useEffect(() => {
    if (manageProAccess) setEditProPerms([...manageProAccess.permissions])
  }, [manageProAccess])

  // ── Household access ──
  const hhAccessList = useMemo(() => getHouseholdAccessListForPet(petId), [petId, tick])
  const hhLogs = useMemo(() => {
    const { logs: all } = loadHouseholdAccessState()
    return filterHouseholdLogsForPet(all, petId).slice().reverse()
  }, [petId, tick])
  const hhVisible = hhAccessList.filter((a) => a.status === 'active' || a.status === 'pending')

  const [grantOpen, setGrantOpen] = useState(false)
  const [manageHhId, setManageHhId] = useState<string | null>(null)
  const [revokeHhId, setRevokeHhId] = useState<string | null>(null)
  const [grantAccountId, setGrantAccountId] = useState('')
  const [grantRole, setGrantRole] = useState<HouseholdPetRole>('co_owner')
  const [grantPerms, setGrantPerms] = useState<HouseholdPetPermission[]>(
    suggestedHouseholdPermissionsForRole('co_owner'),
  )
  const [editHhRole, setEditHhRole] = useState<HouseholdPetRole>('caregiver')
  const [editHhPerms, setEditHhPerms] = useState<HouseholdPetPermission[]>([])

  const manageHh = manageHhId ? hhAccessList.find((a) => a.id === manageHhId) : null

  useEffect(() => {
    if (manageHh) {
      setEditHhRole(manageHh.role)
      setEditHhPerms([...manageHh.permissions])
    }
  }, [manageHh])

  const grantCandidates = useMemo(() => {
    const taken = new Set(
      hhAccessList
        .filter((a) => a.status === 'active' || a.status === 'pending')
        .map((a) => a.accountId),
    )
    return accounts.filter((a) => a.id !== ownerAccountId && !taken.has(a.id))
  }, [accounts, hhAccessList, ownerAccountId])

  const openGrant = () => {
    ensureDemoHouseholdAccounts()
    refresh()
    const role: HouseholdPetRole = 'co_owner'
    setGrantRole(role)
    setGrantPerms(suggestedHouseholdPermissionsForRole(role))
    setGrantAccountId('')
    setGrantOpen(true)
  }

  const onGrantRoleChange = (role: HouseholdPetRole) => {
    setGrantRole(role)
    setGrantPerms(suggestedHouseholdPermissionsForRole(role))
  }

  const confirmGrant = () => {
    if (!grantAccountId) {
      showToast('Vyberte osobu', 'Zvolte účet, kterému chcete udělit přístup.', 'info')
      return
    }
    const actorId = getSelfAccount()?.id ?? SELF_OWNER_ID
    try {
      const { access } = grantOwnerHouseholdAccess({
        pet,
        accountId: grantAccountId,
        role: grantRole,
        permissions: grantPerms,
        grantedByAccountId: actorId,
      })
      emitHouseholdAccessNotification(upsertNotification, {
        access,
        event: 'granted',
        petName,
        memberDisplayName: accountName(access.accountId),
        roleLabel: HOUSEHOLD_ROLE_LABELS[access.role],
      })
      showToast('Přístup udělen', accountName(access.accountId), 'success')
      setGrantOpen(false)
      refresh()
    } catch (err) {
      showToast(
        'Nelze udělit přístup',
        err instanceof Error ? err.message : 'Operace selhala',
        'info',
      )
    }
  }

  const saveHhManage = () => {
    if (!manageHhId || !manageHh) return
    const actorId = getSelfAccount()?.id ?? SELF_OWNER_ID
    try {
      const { access } = updatePetHouseholdAccess(manageHhId, {
        pet,
        actorAccountId: actorId,
        role: editHhRole,
        permissions: editHhPerms,
      })
      if (access && access.role !== manageHh.role) {
        emitHouseholdAccessNotification(upsertNotification, {
          access,
          event: 'role_changed',
          petName,
          memberDisplayName: accountName(access.accountId),
          roleLabel: HOUSEHOLD_ROLE_LABELS[access.role],
        })
      }
      showToast('Oprávnění uložena', accountName(manageHh.accountId), 'success')
      setManageHhId(null)
      refresh()
    } catch (err) {
      showToast(
        'Nelze uložit',
        err instanceof Error ? err.message : 'Operace selhala',
        'info',
      )
    }
  }

  const confirmHhRevoke = () => {
    if (!revokeHhId) return
    const actorId = getSelfAccount()?.id ?? SELF_OWNER_ID
    try {
      const { access } = revokePetHouseholdAccess(revokeHhId, {
        pet,
        actorAccountId: actorId,
      })
      if (access) {
        emitHouseholdAccessNotification(upsertNotification, {
          access,
          event: 'revoked',
          petName,
          memberDisplayName: accountName(access.accountId),
        })
      }
      showToast('Přístup odebrán', petName, 'info')
      setRevokeHhId(null)
      setManageHhId(null)
      refresh()
    } catch (err) {
      showToast(
        'Nelze odebrat',
        err instanceof Error ? err.message : 'Operace selhala',
        'info',
      )
    }
  }

  // ── Professional handlers (unchanged) ──
  const openProManage = (access: PetProfessionalAccess) => {
    setManageProId(access.id)
    setEditProPerms([...access.permissions])
  }

  const saveProManage = () => {
    if (!manageProId || !manageProAccess) return
    if (manageProAccess.status === 'pending') {
      const { access } = approvePetProfessionalAccess(manageProId, editProPerms)
      if (access) {
        emitProfessionalAccessNotification(upsertNotification, {
          access,
          event: 'approved',
          petName,
          professional: managePro,
          roleLabel: managePro ? getRoleMeta(managePro.type).label : null,
        })
      }
      showToast('Přístup schválen', managePro?.displayName ?? 'Profesionál', 'success')
    } else {
      updatePetProfessionalAccessPermissions(manageProId, editProPerms)
      showToast('Oprávnění uložena', managePro?.displayName ?? 'Profesionál', 'success')
    }
    setManageProId(null)
    refresh()
  }

  const confirmProRevoke = () => {
    if (!revokeProId) return
    const { access } = revokePetProfessionalAccess(revokeProId)
    if (access) {
      const pro = findProfessionalProfileById(access.professionalId)
      emitProfessionalAccessNotification(upsertNotification, {
        access,
        event: 'revoked',
        petName,
        professional: pro,
        roleLabel: pro ? getRoleMeta(pro.type).label : null,
      })
    }
    showToast('Přístup odebrán', petName, 'info')
    setRevokeProId(null)
    setManageProId(null)
    refresh()
  }

  const cancelPending = (accessId: string) => {
    const { access } = cancelPetProfessionalAccessRequest(accessId)
    if (access) {
      const pro = findProfessionalProfileById(access.professionalId)
      emitProfessionalAccessNotification(upsertNotification, {
        access,
        event: 'revoked',
        petName,
        professional: pro,
        roleLabel: pro ? getRoleMeta(pro.type).label : null,
      })
    }
    showToast('Žádost zrušena', petName, 'info')
    refresh()
  }

  const togglePerm = <T extends string>(
    list: T[],
    setList: (next: T[]) => void,
    id: T,
  ) => {
    setList(list.includes(id) ? list.filter((p) => p !== id) : [...list, id])
  }

  return (
    <>
      <Card variant="elevated" id="who-has-access" data-testid={`who-has-access-${petId}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EBF2EE] text-[#2C4A3E]">
              <Shield size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#191E1B]">
                Kdo má přístup k tomuto mazlíčkovi
              </h3>
              <p className="text-xs text-[#7D8B82]">
                Domácnost a profesionálové jsou oddělené. Role ≠ oprávnění.
              </p>
            </div>
          </div>
        </div>

        {/* ── Domácnost ── */}
        <div className="mb-6" data-testid={`household-access-${petId}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[#2C4A3E]" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Domácnost
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={openGrant}
              data-testid={`household-add-${petId}`}
            >
              <UserPlus size={13} />
              Přidat osobu
            </Button>
          </div>

          <div className="space-y-3">
            {/* Owner row — not an access record */}
            <div
              className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
              data-testid={`household-owner-${petId}`}
            >
              <p className="text-sm font-bold text-[#191E1B]">{accountName(ownerAccountId)}</p>
              <p className="text-xs text-[#7D8B82]">Majitel</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">● Plný přístup</p>
            </div>

            {hhVisible.map((access) => (
              <div
                key={access.id}
                data-testid={`household-card-${access.id}`}
                className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#191E1B]">
                      {accountName(access.accountId)}
                    </p>
                    <p className="text-xs text-[#7D8B82]">
                      {HOUSEHOLD_ROLE_LABELS[access.role]}
                    </p>
                    <p className={cn('mt-1 text-xs font-semibold', statusTone(access.status))}>
                      ● {hhStatusLabel(access.status)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#A3AEA7]">
                      Od {formatTs(access.grantedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => setManageHhId(access.id)}
                      data-testid={`household-manage-${access.id}`}
                    >
                      Spravovat
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => setRevokeHhId(access.id)}
                      data-testid={`household-revoke-${access.id}`}
                    >
                      Odebrat
                    </Button>
                  </div>
                </div>
                {access.permissions.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {formatHouseholdPermissionList(access.permissions)
                      .slice(0, 6)
                      .map((label) => (
                        <li key={label}>
                          <Badge variant="outline" size="sm">
                            ✓ {label}
                          </Badge>
                        </li>
                      ))}
                    {access.permissions.length > 6 ? (
                      <li>
                        <Badge variant="outline" size="sm">
                          +{access.permissions.length - 6}
                        </Badge>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* ── Profesionálové ── */}
        <div data-testid={`professional-access-${petId}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Profesionálové
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setConnectOpen(true)}
              data-testid={`who-has-access-find-${petId}`}
            >
              <Link2 size={13} />
              Najít profesionála
            </Button>
          </div>

          {proVisible.length === 0 ? (
            <p className="text-xs text-[#7D8B82]" data-testid={`who-has-access-empty-${petId}`}>
              Zatím žádný profesionál nemá přístup k datům {petName}.
            </p>
          ) : (
            <div className="space-y-3">
              {proVisible.map((access) => {
                const pro = findProfessionalProfileById(access.professionalId)
                const name = pro?.displayName ?? 'Profesionál'
                const role = pro ? getRoleMeta(pro.type).label : 'Profesionál'
                return (
                  <div
                    key={access.id}
                    data-testid={`access-card-${access.id}`}
                    className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#191E1B]">{name}</p>
                        <p className="text-xs text-[#7D8B82]">{role}</p>
                        <p className={cn('mt-1 text-xs font-semibold', statusTone(access.status))}>
                          ● {proStatusLabel(access.status)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => openProManage(access)}
                          data-testid={`access-manage-${access.id}`}
                        >
                          Spravovat přístup
                        </Button>
                        {access.status === 'pending' ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => cancelPending(access.id)}
                            data-testid={`access-cancel-${access.id}`}
                          >
                            Zrušit žádost
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => setRevokeProId(access.id)}
                            data-testid={`access-revoke-${access.id}`}
                          >
                            Odebrat přístup
                          </Button>
                        )}
                      </div>
                    </div>
                    {access.permissions.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {formatPermissionList(access.permissions).map((label) => (
                          <li key={label}>
                            <Badge variant="outline" size="sm">
                              ✓ {label}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[11px] text-[#A3AEA7]">Žádná oprávnění (zatím)</p>
                    )}
                    {pro ? (
                      <Link
                        to={`/professionals/${pro.id}`}
                        className="mt-2 inline-block text-[11px] font-semibold text-[#234B54] hover:underline"
                      >
                        Veřejný profil
                      </Link>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {(proHistory.length > 0 || proLogs.length > 0 || hhLogs.length > 0) && (
          <div className="mt-5 border-t border-[#E8E4DC] pt-4" data-testid={`access-history-${petId}`}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Historie přístupu
            </p>
            <ul className="space-y-1.5">
              {hhLogs.slice(0, 6).map((log: PetHouseholdAccessLog) => (
                <li key={log.id} className="text-[11px] text-[#5A6660]">
                  <span className="font-semibold text-[#4A564F]">{formatTs(log.timestamp)}</span>
                  {' — '}
                  {accountName(log.accountId)}
                  {': '}
                  {hhActionLabel(log.action)}
                </li>
              ))}
              {proLogs.slice(0, 12).map((log: ProfessionalAccessLog) => {
                const pro = findProfessionalProfileById(log.professionalId)
                return (
                  <li key={log.id} className="text-[11px] text-[#5A6660]">
                    <span className="font-semibold text-[#4A564F]">
                      {formatTs(log.timestamp)}
                    </span>
                    {' — '}
                    {pro?.displayName ?? 'Profesionál'}
                    {': '}
                    {proActionLabel(log.action)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Card>

      {/* Household grant modal */}
      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title="Přidat osobu do domácnosti"
        subtitle="Vyberte účet, roli a oprávnění. Role pouze navrhuje výchozí oprávnění."
        maxWidth="lg"
      >
        <div className="space-y-4" data-testid="household-grant-modal">
          <label className="block text-xs font-semibold text-[#4A564F]">
            Osoba
            <select
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
              value={grantAccountId}
              onChange={(e) => setGrantAccountId(e.target.value)}
              data-testid="household-grant-account"
            >
              <option value="">Vyberte účet…</option>
              {grantCandidates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName ?? a.id}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-[#4A564F]">Role</legend>
            <div className="flex flex-col gap-2">
              {(['co_owner', 'caregiver', 'viewer'] as HouseholdPetRole[]).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] px-3 py-2 text-xs"
                >
                  <input
                    type="radio"
                    name="hh-grant-role"
                    checked={grantRole === role}
                    onChange={() => onGrantRoleChange(role)}
                    data-testid={`household-grant-role-${role}`}
                  />
                  {HOUSEHOLD_ROLE_LABELS[role]}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-xs font-semibold text-[#4A564F]">Oprávnění</p>
            <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
              {HOUSEHOLD_PERMISSION_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={grantPerms.includes(opt.id)}
                    onChange={() => togglePerm(grantPerms, setGrantPerms, opt.id)}
                    data-testid={`household-grant-perm-${opt.id}`}
                  />
                  {HOUSEHOLD_PERMISSION_LABELS[opt.id]}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setGrantOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmGrant}
              data-testid="household-grant-save"
            >
              Uložit přístup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Household manage modal */}
      <Modal
        open={Boolean(manageHh)}
        onClose={() => setManageHhId(null)}
        title="Spravovat přístup"
        subtitle="Upravte roli nebo oprávnění člena domácnosti."
        maxWidth="lg"
      >
        {manageHh ? (
          <div className="space-y-4" data-testid="household-manage-modal">
            <p className="text-sm font-bold text-[#191E1B]">
              {accountName(manageHh.accountId)}
            </p>
            <p className="text-xs text-[#7D8B82]">
              Status: {hhStatusLabel(manageHh.status)} · Od {formatTs(manageHh.grantedAt)}
            </p>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-[#4A564F]">Role</legend>
              <div className="flex flex-col gap-2">
                {(['co_owner', 'caregiver', 'viewer'] as HouseholdPetRole[]).map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] px-3 py-2 text-xs"
                  >
                    <input
                      type="radio"
                      name="hh-edit-role"
                      checked={editHhRole === role}
                      onChange={() => {
                        setEditHhRole(role)
                        setEditHhPerms(suggestedHouseholdPermissionsForRole(role))
                      }}
                      data-testid={`household-edit-role-${role}`}
                    />
                    {HOUSEHOLD_ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
              {HOUSEHOLD_PERMISSION_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={editHhPerms.includes(opt.id)}
                    onChange={() => togglePerm(editHhPerms, setEditHhPerms, opt.id)}
                    data-testid={`household-edit-perm-${opt.id}`}
                  />
                  {HOUSEHOLD_PERMISSION_LABELS[opt.id]}
                </label>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setManageHhId(null)}>
                Zavřít
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setRevokeHhId(manageHh.id)}
                data-testid="household-manage-revoke"
              >
                Odebrat přístup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveHhManage}
                data-testid="household-manage-save"
              >
                Uložit
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(revokeHhId)}
        onClose={() => setRevokeHhId(null)}
        title="Odebrat přístup?"
        subtitle={`Opravdu chcete odebrat této osobě přístup k ${petName}? Záznam zůstane v historii.`}
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2" data-testid="household-revoke-confirm-modal">
          <Button variant="ghost" size="sm" onClick={() => setRevokeHhId(null)}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirmHhRevoke}
            data-testid="household-revoke-confirm"
          >
            Odebrat přístup
          </Button>
        </div>
      </Modal>

      {/* Professional manage modal */}
      <Modal
        open={Boolean(manageProAccess && managePro)}
        onClose={() => setManageProId(null)}
        title="Spravovat přístup"
        subtitle={
          manageProAccess?.status === 'pending'
            ? 'Nastavte oprávnění a schvalte žádost.'
            : 'Upravte, co smí profesionál zobrazit nebo přidat.'
        }
        maxWidth="lg"
      >
        {manageProAccess && managePro ? (
          <div className="space-y-4" data-testid="access-manage-modal">
            <p className="text-sm font-bold text-[#191E1B]">{managePro.displayName}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[...READ_PERMISSION_OPTIONS, ...WRITE_PERMISSION_OPTIONS].map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] px-3 py-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={editProPerms.includes(opt.id)}
                    onChange={() =>
                      setEditProPerms((prev) =>
                        prev.includes(opt.id)
                          ? prev.filter((p) => p !== opt.id)
                          : [...prev, opt.id],
                      )
                    }
                    data-testid={`manage-perm-${opt.id}`}
                  />
                  {PERMISSION_LABELS[opt.id]}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setManageProId(null)}>
                Zavřít
              </Button>
              {manageProAccess.status === 'active' ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRevokeProId(manageProAccess.id)}
                >
                  Odebrat přístup
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                onClick={saveProManage}
                data-testid="access-manage-save"
              >
                {manageProAccess.status === 'pending' ? 'Schválit přístup' : 'Uložit oprávnění'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(revokeProId)}
        onClose={() => setRevokeProId(null)}
        title="Odebrat přístup?"
        subtitle={`Opravdu chcete odebrat tomuto profesionálovi přístup k ${petName}? Po odebrání nebude mít profesionál přístup k datům, která mu byla zpřístupněna.`}
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2" data-testid="access-revoke-confirm-modal">
          <Button variant="ghost" size="sm" onClick={() => setRevokeProId(null)}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirmProRevoke}
            data-testid="access-revoke-confirm"
          >
            Odebrat přístup
          </Button>
        </div>
      </Modal>

      {connectOpen ? (
        <Modal
          open={connectOpen}
          onClose={() => setConnectOpen(false)}
          title="Najít profesionála"
          subtitle="Vyberte profesionála v katalogu a na jeho profilu klikněte Propojit s mazlíčkem."
          maxWidth="sm"
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConnectOpen(false)}>
              Zavřít
            </Button>
            <Link
              to="/professionals"
              data-testid="who-has-access-catalog-link"
              className="inline-flex items-center justify-center rounded-lg border border-[#20362E]/20 bg-[#2C4A3E] px-3.5 py-1.5 text-xs font-medium text-white"
              onClick={() => setConnectOpen(false)}
            >
              Otevřít katalog
            </Link>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
