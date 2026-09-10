import { Link2, Shield } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { findProfessionalProfileById } from '../../../lib/account'
import { emitProfessionalAccessNotification } from '../../../lib/notifications'
import {
  approvePetProfessionalAccess,
  cancelPetProfessionalAccessRequest,
  filterLogsForPet,
  formatPermissionList,
  getAccessListForPet,
  getRoleMeta,
  loadAccessState,
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
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Modal } from '../../ui/Modal'

function statusLabel(status: PetProfessionalAccess['status']): string {
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

function statusTone(status: PetProfessionalAccess['status']): string {
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

function actionLabel(action: string): string {
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

interface WhoHasAccessSectionProps {
  petId: string
  petName: string
}

export function WhoHasAccessSection({ petId, petName }: WhoHasAccessSectionProps) {
  const { showToast, upsertNotification } = useApp()
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const accessList = useMemo(() => getAccessListForPet(petId), [petId, tick])
  const logs = useMemo(() => {
    const { logs: all } = loadAccessState()
    return filterLogsForPet(all, petId).slice().reverse()
  }, [petId, tick])

  const visible = accessList.filter((a) => a.status === 'active' || a.status === 'pending')
  const history = accessList.filter((a) => a.status === 'revoked' || a.status === 'expired')

  const [manageId, setManageId] = useState<string | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [editPerms, setEditPerms] = useState<ProfessionalPermission[]>([])

  const manageAccess = manageId ? accessList.find((a) => a.id === manageId) : null
  const managePro = manageAccess
    ? findProfessionalProfileById(manageAccess.professionalId)
    : null

  useEffect(() => {
    if (manageAccess) setEditPerms([...manageAccess.permissions])
  }, [manageAccess])

  const openManage = (access: PetProfessionalAccess) => {
    setManageId(access.id)
    setEditPerms([...access.permissions])
  }

  const saveManage = () => {
    if (!manageId || !manageAccess) return
    if (manageAccess.status === 'pending') {
      const { access } = approvePetProfessionalAccess(manageId, editPerms)
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
      updatePetProfessionalAccessPermissions(manageId, editPerms)
      showToast('Oprávnění uložena', managePro?.displayName ?? 'Profesionál', 'success')
    }
    setManageId(null)
    refresh()
  }

  const confirmRevoke = () => {
    if (!revokeId) return
    const { access } = revokePetProfessionalAccess(revokeId)
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
    setRevokeId(null)
    setManageId(null)
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
                Profesionální přístup je oddělený od důležitých kontaktů. Role ≠ oprávnění.
              </p>
            </div>
          </div>
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

        {visible.length === 0 ? (
          <p className="text-xs text-[#7D8B82]" data-testid={`who-has-access-empty-${petId}`}>
            Zatím nikdo nemá přístup k datům {petName}.
          </p>
        ) : (
          <div className="space-y-3">
            {visible.map((access) => {
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
                        ● {statusLabel(access.status)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => openManage(access)}
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
                          onClick={() => setRevokeId(access.id)}
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

        {(history.length > 0 || logs.length > 0) && (
          <div className="mt-5 border-t border-[#E8E4DC] pt-4" data-testid={`access-history-${petId}`}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Historie přístupu
            </p>
            <ul className="space-y-1.5">
              {logs.slice(0, 12).map((log: ProfessionalAccessLog) => {
                const pro = findProfessionalProfileById(log.professionalId)
                return (
                  <li key={log.id} className="text-[11px] text-[#5A6660]">
                    <span className="font-semibold text-[#4A564F]">
                      {formatTs(log.timestamp)}
                    </span>
                    {' — '}
                    {pro?.displayName ?? 'Profesionál'}
                    {': '}
                    {actionLabel(log.action)}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(manageAccess && managePro)}
        onClose={() => setManageId(null)}
        title="Spravovat přístup"
        subtitle={
          manageAccess?.status === 'pending'
            ? 'Nastavte oprávnění a schvalte žádost.'
            : 'Upravte, co smí profesionál zobrazit nebo přidat.'
        }
        maxWidth="lg"
      >
        {manageAccess && managePro ? (
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
                    checked={editPerms.includes(opt.id)}
                    onChange={() =>
                      setEditPerms((prev) =>
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
              <Button variant="ghost" size="sm" onClick={() => setManageId(null)}>
                Zavřít
              </Button>
              {manageAccess.status === 'active' ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRevokeId(manageAccess.id)}
                >
                  Odebrat přístup
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                onClick={saveManage}
                data-testid="access-manage-save"
              >
                {manageAccess.status === 'pending' ? 'Schválit přístup' : 'Uložit oprávnění'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(revokeId)}
        onClose={() => setRevokeId(null)}
        title="Odebrat přístup?"
        subtitle={`Opravdu chcete odebrat tomuto profesionálovi přístup k ${petName}? Po odebrání nebude mít profesionál přístup k datům, která mu byla zpřístupněna.`}
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2" data-testid="access-revoke-confirm-modal">
          <Button variant="ghost" size="sm" onClick={() => setRevokeId(null)}>
            Zrušit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirmRevoke}
            data-testid="access-revoke-confirm"
          >
            Odebrat přístup
          </Button>
        </div>
      </Modal>

      {/* Connect from pet: jump to catalog if no specific pro; section CTA opens catalog */}
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
