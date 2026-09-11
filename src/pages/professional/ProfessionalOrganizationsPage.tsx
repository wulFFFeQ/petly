import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getSelfAccount } from '../../lib/account'
import {
  ORGANIZATION_TYPE_LABELS,
  ORGANIZATION_TYPES,
  backfillMembershipsFromStubMemberIds,
  createOrganization,
  listOrganizationsForAccount,
  type OrganizationType,
} from '../../lib/organization'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'

export function ProfessionalOrganizationsPage() {
  const { showToast } = useApp()
  const self = getSelfAccount()
  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [organizationType, setOrganizationType] = useState<OrganizationType>('veterinary_clinic')

  const orgs = useMemo(() => {
    backfillMembershipsFromStubMemberIds()
    if (!self?.id) return []
    return listOrganizationsForAccount(self.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey forces reload
  }, [self?.id, refreshKey])

  const onCreate = () => {
    if (!self?.id) {
      showToast('Chyba', 'Nejste přihlášeni', 'error')
      return
    }
    try {
      const { organization } = createOrganization({
        actorAccountId: self.id,
        displayName,
        organizationType,
      })
      showToast('Organizace vytvořena', organization.displayName, 'success')
      setDisplayName('')
      setShowCreate(false)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      showToast('Nelze vytvořit', err instanceof Error ? err.message : 'Chyba', 'error')
    }
  }

  return (
    <div data-testid="professional-organizations-page">
      <PageHeader
        title="Organizace"
        description="Správa organizací a členství (odděleně od přístupu k mazlíčkům)."
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
          data-testid="org-create-toggle"
        >
          {showCreate ? 'Zrušit' : 'Nová organizace'}
        </Button>
        <Link
          to="/organization-invitations"
          className="text-sm text-[#2C4A3E] underline-offset-2 hover:underline"
          data-testid="org-invitations-link"
        >
          Pozvánky
        </Link>
      </div>

      {showCreate ? (
        <Card className="mt-4 space-y-3 p-4" data-testid="org-create-form">
          <label className="block text-sm font-medium text-[#191E1B]">
            Název
            <Input
              className="mt-1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Např. Klinika U parku"
              data-testid="org-create-name"
            />
          </label>
          <label className="block text-sm font-medium text-[#191E1B]">
            Typ
            <select
              className="mt-1 w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm"
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
              data-testid="org-create-type"
            >
              {ORGANIZATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORGANIZATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-[#7D8B82]">
            Výchozí viditelnost: soukromá. Veřejný katalog se v tomto kroku nemění.
          </p>
          <Button
            size="sm"
            onClick={onCreate}
            disabled={!displayName.trim()}
            data-testid="org-create-submit"
          >
            Vytvořit
          </Button>
        </Card>
      ) : null}

      <ul className="mt-6 space-y-3" data-testid="org-list">
        {orgs.length === 0 ? (
          <Card className="flex items-start gap-3 p-4 text-sm text-[#4A564F]">
            <Building2 className="mt-0.5 shrink-0 text-[#7D8B82]" size={20} />
            <div>
              <p className="font-medium text-[#191E1B]">Zatím žádná organizace</p>
              <p className="mt-1 text-[#7D8B82]">
                Vytvořte organizaci pro správu týmu. Toto nepřidává přístup ke zdravotním údajům
                mazlíčků.
              </p>
            </div>
          </Card>
        ) : (
          orgs.map((org) => (
            <li key={org.id}>
              <Link
                to={`/professional/organizations/${org.id}`}
                className="block rounded-xl border border-[#E8E4DC] bg-white px-4 py-3 transition hover:border-[#2C4A3E]/40"
                data-testid={`org-list-item-${org.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#191E1B]" data-testid="org-list-name">
                      {org.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7D8B82]">
                      {ORGANIZATION_TYPE_LABELS[
                        org.organizationType as keyof typeof ORGANIZATION_TYPE_LABELS
                      ] ?? org.organizationType}{' '}
                      · {org.publicVisibility === 'public' ? 'veřejná' : 'soukromá'} · {org.status}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#2C4A3E]">Detail →</span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
