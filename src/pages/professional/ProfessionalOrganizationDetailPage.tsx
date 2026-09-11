import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getSelfAccount } from '../../lib/account'
import { loadAccounts } from '../../lib/professional/storage'
import {
  ORGANIZATION_ROLE_LABELS,
  ORGANIZATION_ROLES,
  OrganizationPermissionError,
  getOrganizationById,
  hasOrganizationPermission,
  inviteOrganizationMember,
  isOrganizationMembershipEffective,
  listMembershipsForOrganization,
  loadOrganizationMemberships,
  removeOrganizationMember,
  suspendOrganizationMember,
  updateOrganizationMemberRole,
  type OrganizationRole,
} from '../../lib/organization'
import { emitOrganizationMembershipNotification } from '../../lib/notifications'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'

export function ProfessionalOrganizationDetailPage() {
  const { organizationId = '' } = useParams()
  const { showToast, upsertNotification } = useApp()
  const self = getSelfAccount()
  const [refreshKey, setRefreshKey] = useState(0)
  const [inviteAccountId, setInviteAccountId] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('staff')

  const org = useMemo(() => getOrganizationById(organizationId), [organizationId, refreshKey])
  const memberships = useMemo(
    () => listMembershipsForOrganization(loadOrganizationMemberships(), organizationId),
    [organizationId, refreshKey],
  )
  const myMembership = useMemo(
    () => memberships.find((m) => m.accountId === self?.id),
    [memberships, self?.id],
  )
  const canManageMembers = Boolean(
    org &&
      myMembership &&
      hasOrganizationPermission(myMembership, 'organization_members_manage', org),
  )

  const accountLabel = (accountId: string) => {
    const acct = loadAccounts().find((a) => a.id === accountId)
    return acct?.displayName?.trim() || accountId
  }

  if (!org) {
    return (
      <div data-testid="org-detail-missing">
        <PageHeader title="Organizace nenalezena" />
        <Link to="/professional/organizations" className="mt-4 inline-block text-sm text-[#2C4A3E]">
          ← Zpět na seznam
        </Link>
      </div>
    )
  }

  if (!self?.id || !isOrganizationMembershipEffective(myMembership)) {
    return (
      <div data-testid="org-detail-forbidden">
        <PageHeader title={org.displayName} description="Nejste aktivním členem této organizace." />
        <Link to="/professional/organizations" className="mt-4 inline-block text-sm text-[#2C4A3E]">
          ← Zpět
        </Link>
      </div>
    )
  }

  const refresh = () => setRefreshKey((k) => k + 1)

  const onInvite = () => {
    try {
      const membership = inviteOrganizationMember({
        organizationId: org.id,
        actorAccountId: self.id,
        inviteeAccountId: inviteAccountId,
        role: inviteRole,
      })
      emitOrganizationMembershipNotification(upsertNotification, {
        event: 'invited',
        membership,
        organization: org,
      })
      showToast('Pozvánka odeslána', accountLabel(inviteAccountId), 'success')
      setInviteAccountId('')
      refresh()
    } catch (err) {
      showToast(
        'Pozvánka selhala',
        err instanceof OrganizationPermissionError || err instanceof Error
          ? err.message
          : 'Chyba',
        'error',
      )
    }
  }

  const onRoleChange = (membershipId: string, role: OrganizationRole) => {
    try {
      const membership = updateOrganizationMemberRole(org.id, self.id, membershipId, role)
      emitOrganizationMembershipNotification(upsertNotification, {
        event: 'role_changed',
        membership,
        organization: org,
      })
      showToast('Role změněna', ORGANIZATION_ROLE_LABELS[role], 'success')
      refresh()
    } catch (err) {
      showToast('Nelze změnit roli', err instanceof Error ? err.message : 'Chyba', 'error')
    }
  }

  const onSuspend = (membershipId: string) => {
    try {
      suspendOrganizationMember(org.id, self.id, membershipId)
      showToast('Člen pozastaven', '', 'info')
      refresh()
    } catch (err) {
      showToast('Nelze pozastavit', err instanceof Error ? err.message : 'Chyba', 'error')
    }
  }

  const onRemove = (membershipId: string) => {
    try {
      const membership = removeOrganizationMember(org.id, self.id, membershipId)
      emitOrganizationMembershipNotification(upsertNotification, {
        event: 'removed',
        membership,
        organization: org,
      })
      showToast('Člen odebrán', '', 'info')
      refresh()
    } catch (err) {
      showToast('Nelze odebrat', err instanceof Error ? err.message : 'Chyba', 'error')
    }
  }

  return (
    <div data-testid="professional-organization-detail">
      <PageHeader
        title={org.displayName}
        description={`${org.organizationType} · ${org.publicVisibility} · ${org.status}`}
      />
      <Link
        to="/professional/organizations"
        className="mt-2 inline-block text-sm text-[#2C4A3E]"
        data-testid="org-detail-back"
      >
        ← Organizace
      </Link>

      <Card className="mt-6 p-4" data-testid="org-detail-meta">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#7D8B82]">Viditelnost</dt>
            <dd className="font-medium" data-testid="org-detail-visibility">
              {org.publicVisibility}
            </dd>
          </div>
          <div>
            <dt className="text-[#7D8B82]">Stav</dt>
            <dd className="font-medium" data-testid="org-detail-status">
              {org.status}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[#7D8B82]">
          Členství v organizaci nedává automatický přístup ke zdravotním údajům, dokumentům ani
          microchipu.
        </p>
      </Card>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-[#A3AEA7]">Členové</h2>
      <ul className="mt-3 space-y-2" data-testid="org-members-list">
        {memberships.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-[#E8E4DC] bg-white px-4 py-3"
            data-testid={`org-member-${m.id}`}
            data-status={m.status}
            data-role={m.role}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#191E1B]">{accountLabel(m.accountId)}</p>
                <p className="text-xs text-[#7D8B82]">
                  {ORGANIZATION_ROLE_LABELS[m.role]} · {m.status}
                </p>
              </div>
              {canManageMembers && m.status !== 'removed' ? (
                <div className="flex flex-wrap items-center gap-2">
                  {(m.status === 'active' || m.status === 'invited') && (
                    <select
                      className="rounded-lg border border-[#E8E4DC] px-2 py-1 text-xs"
                      value={m.role}
                      onChange={(e) => onRoleChange(m.id, e.target.value as OrganizationRole)}
                      data-testid={`org-member-role-${m.id}`}
                    >
                      {ORGANIZATION_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ORGANIZATION_ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  )}
                  {m.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSuspend(m.id)}
                      data-testid={`org-member-suspend-${m.id}`}
                    >
                      Suspend
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onRemove(m.id)}
                    data-testid={`org-member-remove-${m.id}`}
                  >
                    Odebrat
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {canManageMembers ? (
        <Card className="mt-6 space-y-3 p-4" data-testid="org-invite-form">
          <h3 className="text-sm font-semibold text-[#191E1B]">Pozvat člena</h3>
          <label className="block text-sm">
            Account ID
            <Input
              className="mt-1"
              value={inviteAccountId}
              onChange={(e) => setInviteAccountId(e.target.value)}
              placeholder="acct_…"
              data-testid="org-invite-account-id"
            />
          </label>
          <label className="block text-sm">
            Role
            <select
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
              data-testid="org-invite-role"
            >
              {ORGANIZATION_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ORGANIZATION_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            onClick={onInvite}
            disabled={!inviteAccountId.trim()}
            data-testid="org-invite-submit"
          >
            Poslat pozvánku
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
