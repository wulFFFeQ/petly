import { ExternalLink, IdCard, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import {
  addSelfAccountRole,
  ensureDefaultSelfAccount,
  getSelfAccount,
  listSelfProfessionalProfiles,
  resetOnboardingDemo,
  setProfessionalPublicVisibility,
  type ProfessionalProfileDraft,
} from '../../lib/account'
import {
  getRoleMeta,
  isProfessionalType,
  listAddableRoles,
  type Account,
  type AccountRole,
  type ProfessionalProfile,
} from '../../lib/professional'

type AddStep = 'pick' | 'profile'

/**
 * Settings → Typ účtu a role.
 * Adding a role never grants verification, entitlements, or pet data access.
 */
export function AccountRolesSection() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [profiles, setProfiles] = useState<ProfessionalProfile[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [addStep, setAddStep] = useState<AddStep>('pick')
  const [pendingRole, setPendingRole] = useState<AccountRole | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')

  const reload = useCallback(() => {
    ensureDefaultSelfAccount()
    setAccount(getSelfAccount())
    setProfiles(listSelfProfessionalProfiles())
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const addable = account ? listAddableRoles(account.roles) : []

  const openAdd = () => {
    setAddStep('pick')
    setPendingRole(null)
    setDisplayName('')
    setOrganizationName('')
    setCity('')
    setDescription('')
    setModalOpen(true)
  }

  const selectRole = (role: AccountRole) => {
    setPendingRole(role)
    if (role === 'owner' || !isProfessionalType(role)) {
      addSelfAccountRole(role)
      setModalOpen(false)
      reload()
      return
    }
    setDisplayName(getRoleMeta(role).label)
    setAddStep('profile')
  }

  const confirmProfessional = () => {
    if (!pendingRole || !isProfessionalType(pendingRole)) return
    const draft: ProfessionalProfileDraft = {
      displayName: displayName.trim() || getRoleMeta(pendingRole).label,
      organizationName: organizationName.trim() || undefined,
      city: city.trim() || undefined,
      description: description.trim() || undefined,
      publicVisibility: 'private',
    }
    addSelfAccountRole(pendingRole, draft)
    setModalOpen(false)
    reload()
  }

  const handleVisibilityToggle = (profile: ProfessionalProfile, checked: boolean) => {
    setProfessionalPublicVisibility(profile.id, checked ? 'public' : 'private')
    reload()
  }

  const handleDemoReset = () => {
    resetOnboardingDemo()
    navigate('/onboarding')
  }

  return (
    <div
      id="account-roles"
      data-testid="account-roles-section"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#191E1B]">
          <IdCard size={18} className="text-[#B8934A]" />
          <span>Typ účtu a role</span>
        </h3>
        <Badge variant="outline" size="sm">
          {account?.kind === 'professional' ? 'professional' : 'consumer'}
        </Badge>
      </div>

      <p className="text-xs leading-relaxed text-[#7D8B82]">
        Role popisuje, jak účet používáte. Neznamená ověření, Premium ani přístup k
        datům cizích mazlíčků.
      </p>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7D8B82]">
          Aktivní role
        </p>
        <ul className="space-y-2" data-testid="account-active-roles">
          {(account?.roles ?? []).map((role) => {
            const meta = getRoleMeta(role)
            return (
              <li
                key={role}
                data-testid={`account-role-${role}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3"
              >
                <div>
                  <p className="text-xs font-bold text-[#191E1B]">{meta.label}</p>
                  <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                    {meta.shortDescription}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#9AA59E]">
                  {role}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {profiles.length > 0 ? (
        <div className="space-y-3" data-testid="account-pro-profiles">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7D8B82]">
            Profesionální profily
          </p>
          {profiles.map((p) => {
            const isPublic = p.publicVisibility === 'public'
            return (
              <div
                key={p.id}
                data-testid={`pro-profile-card-${p.id}`}
                className="space-y-3 rounded-xl border border-[#E8E4DC] bg-white px-3.5 py-3"
              >
                <div>
                  <p className="text-xs font-bold text-[#191E1B]">{p.displayName}</p>
                  <p className="mt-0.5 text-[11px] text-[#7D8B82]">
                    {getRoleMeta(p.type).label} ·{' '}
                    {p.verificationStatus === 'verified' ? 'stav verified' : 'neověřeno'}
                  </p>
                </div>

                <div
                  data-testid={`pro-visibility-section-${p.id}`}
                  className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#191E1B]">
                      Veřejný profesionální profil
                    </p>
                    <span data-testid={`pro-visibility-status-${p.id}`}>
                      <Badge variant={isPublic ? 'success' : 'outline'} size="sm">
                        {isPublic ? 'Veřejný' : 'Soukromý'}
                      </Badge>
                    </span>
                  </div>

                  <label className="mt-3 flex cursor-pointer items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-[#191E1B]">
                      Zobrazovat můj profesionální profil veřejně
                    </span>
                    <input
                      type="checkbox"
                      data-testid={`pro-visibility-toggle-${p.id}`}
                      checked={isPublic}
                      onChange={(e) => handleVisibilityToggle(p, e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#2C4A3E]"
                    />
                  </label>

                  <p className="mt-2 text-[11px] leading-relaxed text-[#7D8B82]">
                    Pokud profil zveřejníte, mohou ho ostatní uživatelé najít v LOVED &
                    KNOWN. Zobrazí se pouze údaje určené pro veřejný profil.
                  </p>

                  <Link
                    to={`/professionals/${p.id}`}
                    data-testid={`pro-view-public-${p.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2C4A3E] hover:underline"
                  >
                    <ExternalLink size={12} />
                    Zobrazit veřejný profil
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <Button
        variant="secondary"
        size="sm"
        data-testid="add-role-button"
        onClick={openAdd}
        disabled={addable.length === 0}
      >
        <Plus size={14} />
        Přidat roli
      </Button>

      <p
        className="text-[11px] leading-relaxed text-[#9AA59E]"
        data-testid="account-roles-disclaimer"
      >
        ROLE ≠ VERIFIED ≠ PREMIUM ≠ PERMISSION. Přístup k mazlíčkům vzniká jen přes
        explicitní grant od majitele.
      </p>

      <div className="rounded-xl border border-dashed border-[#E8E4DC] bg-[#FFFEFB] p-3">
        <p className="text-[11px] font-semibold text-[#B8934A]">DEMO</p>
        <p className="mt-1 text-[11px] text-[#7D8B82]">
          Znovu zobrazit onboarding (pouze pro testování).
        </p>
        <Button
          variant="ghost"
          size="xs"
          className="mt-2"
          data-testid="onboarding-demo-reset"
          onClick={handleDemoReset}
        >
          Znovu projít onboarding
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={addStep === 'pick' ? 'Přidat roli' : 'Profesionální profil'}
        subtitle={
          addStep === 'pick'
            ? 'Role pouze deklaruje typ použití účtu.'
            : 'Ověření a přístup k datům se nenastavují automaticky.'
        }
        maxWidth="md"
      >
        {addStep === 'pick' ? (
          <div className="space-y-2" data-testid="add-role-list">
            {addable.map((meta) => (
              <button
                key={meta.id}
                type="button"
                data-testid={`add-role-option-${meta.id}`}
                onClick={() => selectRole(meta.id)}
                className="w-full rounded-xl border border-[#E8E4DC] px-3.5 py-3 text-left transition hover:border-[#B8934A]/50"
              >
                <span className="block text-xs font-bold text-[#191E1B]">
                  {meta.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-[#7D8B82]">
                  {meta.shortDescription}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3" data-testid="add-role-profile-form">
            <Input
              id="add-role-display-name"
              label="Zobrazované jméno"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              labelClassName="normal-case tracking-normal"
            />
            <Input
              id="add-role-org-name"
              label="Název organizace (volitelné)"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              labelClassName="normal-case tracking-normal"
            />
            <Input
              id="add-role-city"
              label="Město"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              labelClassName="normal-case tracking-normal"
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#4A564F]">
                Popis
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#B8934A]/60"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setAddStep('pick')}>
                Zpět
              </Button>
              <Button
                variant="primary"
                size="sm"
                data-testid="add-role-confirm"
                onClick={confirmProfessional}
              >
                Přidat roli
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
