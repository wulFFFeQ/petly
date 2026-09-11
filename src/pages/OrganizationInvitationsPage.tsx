import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { getSelfAccount } from '../lib/account'
import {
  ORGANIZATION_ROLE_LABELS,
  acceptOrganizationInvitation,
  getOrganizationById,
  listMembershipsForAccount,
  loadOrganizationMemberships,
  rejectOrganizationInvitation,
} from '../lib/organization'
import { emitOrganizationMembershipNotification } from '../lib/notifications'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

export function OrganizationInvitationsPage() {
  const { showToast, upsertNotification } = useApp()
  const self = getSelfAccount()
  const [refreshKey, setRefreshKey] = useState(0)

  const invitations = useMemo(() => {
    if (!self?.id) return []
    return listMembershipsForAccount(loadOrganizationMemberships(), self.id).filter(
      (m) => m.status === 'invited',
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [self?.id, refreshKey])

  const onAccept = (membershipId: string) => {
    if (!self?.id) return
    try {
      const membership = acceptOrganizationInvitation(membershipId, self.id)
      const organization = getOrganizationById(membership.organizationId)
      if (organization) {
        emitOrganizationMembershipNotification(upsertNotification, {
          event: 'accepted',
          membership,
          organization,
        })
      }
      showToast('Pozvánka přijata', organization?.displayName ?? '', 'success')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      showToast('Nelze přijmout', err instanceof Error ? err.message : 'Chyba', 'error')
    }
  }

  const onReject = (membershipId: string) => {
    if (!self?.id) return
    try {
      rejectOrganizationInvitation(membershipId, self.id)
      showToast('Pozvánka odmítnuta', '', 'info')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      showToast('Nelze odmítnout', err instanceof Error ? err.message : 'Chyba', 'error')
    }
  }

  return (
    <div data-testid="organization-invitations-page">
      <PageHeader
        title="Pozvánky do organizací"
        description="Přijměte nebo odmítněte pozvánky. Členství neuděluje přístup k mazlíčkům."
      />

      <ul className="mt-6 space-y-3" data-testid="org-invitations-list">
        {invitations.length === 0 ? (
          <Card className="p-4 text-sm text-[#7D8B82]" data-testid="org-invitations-empty">
            Nemáte žádné otevřené pozvánky.
          </Card>
        ) : (
          invitations.map((m) => {
            const org = getOrganizationById(m.organizationId)
            return (
              <li
                key={m.id}
                className="rounded-xl border border-[#E8E4DC] bg-white px-4 py-3"
                data-testid={`org-invitation-${m.id}`}
              >
                <p className="font-semibold text-[#191E1B]">
                  {org?.displayName ?? m.organizationId}
                </p>
                <p className="mt-0.5 text-xs text-[#7D8B82]">
                  Role: {ORGANIZATION_ROLE_LABELS[m.role]}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => onAccept(m.id)}
                    data-testid={`org-invitation-accept-${m.id}`}
                  >
                    Přijmout
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onReject(m.id)}
                    data-testid={`org-invitation-reject-${m.id}`}
                  >
                    Odmítnout
                  </Button>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <Link
        to="/professional/organizations"
        className="mt-6 inline-block text-sm text-[#2C4A3E]"
        data-testid="org-invitations-to-orgs"
      >
        Správa organizací →
      </Link>
    </div>
  )
}
