import {
  Building2,
  ChevronLeft,
  Home,
  PawPrint,
  Scissors,
  Stethoscope,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useApp } from '../context/AppContext'
import { BRAND_NAME } from '../lib/brand'
import {
  completeOnboarding,
  type ProfessionalProfileDraft,
} from '../lib/account'
import {
  SERVICE_SUB_ROLES,
  getRoleMeta,
  listOnboardingOptions,
  type OnboardingChoiceId,
  type AccountRole,
} from '../lib/professional'
import { cn } from '../lib/utils'

type Step =
  | 'choice'
  | 'service'
  | 'privacy'
  | 'pets'
  | 'morePets'
  | 'breederHint'
  | 'profile'

const CHOICE_ICONS: Record<OnboardingChoiceId, typeof PawPrint> = {
  owner: PawPrint,
  breeder: Trophy,
  veterinarian: Stethoscope,
  veterinary_clinic: Building2,
  shelter: Home,
  pet_services: Scissors,
}

/**
 * Onboarding orchestrates existing Add Pet / role / breeding systems.
 * Does not create parallel pet, role, privacy, or completion models.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const { pets, setActiveModal, activeModal } = useApp()
  const choices = useMemo(() => listOnboardingOptions(), [])
  const [step, setStep] = useState<Step>('choice')
  const [choiceId, setChoiceId] = useState<OnboardingChoiceId | null>(null)
  const [serviceRole, setServiceRole] = useState<AccountRole | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const petsBaseline = useRef(pets.length)
  const awaitingPetAdd = useRef(false)

  const selectedChoice = choices.find((c) => c.id === choiceId) ?? null
  const needsProfile =
    choiceId != null &&
    choiceId !== 'owner' &&
    (choiceId !== 'pet_services' || serviceRole != null)

  const finishOwner = () => {
    completeOnboarding({ choiceId: 'owner' })
    navigate('/', { replace: true })
  }

  const finishWithProfile = () => {
    if (!choiceId) return
    const draft: ProfessionalProfileDraft | undefined = needsProfile
      ? {
          displayName: displayName.trim() || 'Profesionální profil',
          organizationName: organizationName.trim() || undefined,
          city: city.trim() || undefined,
          description: description.trim() || undefined,
          publicVisibility: 'private',
        }
      : undefined
    completeOnboarding({
      choiceId,
      serviceRole: serviceRole ?? undefined,
      profileDraft: draft,
      displayName: displayName.trim() || undefined,
    })
    navigate('/', { replace: true })
  }

  const afterPetsFlow = () => {
    if (choiceId === 'owner') {
      finishOwner()
      return
    }
    if (choiceId === 'breeder') {
      setStep('breederHint')
      return
    }
    setStep('profile')
  }

  const openAddPet = () => {
    petsBaseline.current = pets.length
    awaitingPetAdd.current = true
    setActiveModal('addPet')
  }

  useEffect(() => {
    if (!awaitingPetAdd.current) return
    if (activeModal === 'addPet') return
    if (pets.length > petsBaseline.current) {
      awaitingPetAdd.current = false
      setStep('morePets')
      return
    }
    // Modal closed without add — stay on pets step
    awaitingPetAdd.current = false
  }, [pets.length, activeModal])

  const onSelectChoice = (id: OnboardingChoiceId) => {
    setChoiceId(id)
    setServiceRole(null)
    const choice = choices.find((c) => c.id === id)
    if (!choice) return
    if (choice.needsServiceSubPick) {
      setStep('service')
      return
    }
    if (id === 'owner' || id === 'breeder') {
      setStep('privacy')
      return
    }
    setStep('profile')
  }

  const onSelectService = (role: AccountRole) => {
    setServiceRole(role)
    setStep('profile')
  }

  const startAsOwner = () => {
    setChoiceId('owner')
    setServiceRole(null)
    setStep('privacy')
  }

  return (
    <div
      data-testid="onboarding-page"
      className="min-h-screen bg-[#FAF8F5] px-4 py-10 sm:px-6"
    >
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B8934A]">
          {BRAND_NAME}
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#191E1B] sm:text-3xl">
          {step === 'choice'
            ? `Jak budete ${BRAND_NAME} používat?`
            : step === 'privacy'
              ? 'Soukromí je na vás'
              : step === 'pets' || step === 'morePets'
                ? 'Vaši mazlíčci'
                : step === 'breederHint'
                  ? 'Chovatelský profil'
                  : step === 'service'
                    ? 'Jaká služba?'
                    : 'Základní údaje'}
        </h1>
        {step === 'choice' && (
          <p className="mt-2 text-sm leading-relaxed text-[#5A6660]">
            Vyberte typ účtu. Role můžete později rozšířit v Nastavení — bez nového
            přihlášení. Role neznamená ověření, Premium ani přístup k cizím datům.
          </p>
        )}

        {step === 'choice' && (
          <div className="mt-8 space-y-3" data-testid="onboarding-choices">
            {choices.map((choice) => {
              const Icon = CHOICE_ICONS[choice.id]
              return (
                <button
                  key={choice.id}
                  type="button"
                  data-testid={`onboarding-choice-${choice.id}`}
                  onClick={() => onSelectChoice(choice.id)}
                  className={cn(
                    'w-full rounded-2xl border border-[#E8E4DC] bg-white p-4 text-left',
                    'transition hover:border-[#B8934A]/50 hover:bg-[#FFFEFB]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8934A]/40',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF2EE] text-[#2C4A3E]">
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[#191E1B]">
                        {choice.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#7D8B82]">
                        {choice.shortDescription}
                      </span>
                    </span>
                  </div>
                </button>
              )
            })}
            <p className="pt-2 text-center text-xs leading-relaxed text-[#7D8B82]">
              Nejste si jistí? Začněte jako majitel mazlíčka. Typ účtu můžete později
              rozšířit.
            </p>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              data-testid="onboarding-default-owner"
              onClick={startAsOwner}
            >
              Pokračovat jako majitel
            </Button>
          </div>
        )}

        {step === 'service' && (
          <div className="mt-8 space-y-3" data-testid="onboarding-services">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
              onClick={() => setStep('choice')}
            >
              <ChevronLeft size={14} />
              Zpět
            </button>
            <p className="text-xs text-[#7D8B82]">
              Vyberte konkrétní typ. Ověření a Premium zůstávají oddělené.
            </p>
            {SERVICE_SUB_ROLES.map((role) => {
              const meta = getRoleMeta(role)
              return (
                <button
                  key={role}
                  type="button"
                  data-testid={`onboarding-service-${role}`}
                  onClick={() => onSelectService(role)}
                  className="w-full rounded-2xl border border-[#E8E4DC] bg-white p-4 text-left transition hover:border-[#B8934A]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8934A]/40"
                >
                  <span className="block text-sm font-bold text-[#191E1B]">
                    {meta.label}
                  </span>
                  <span className="mt-1 block text-xs text-[#7D8B82]">
                    {meta.shortDescription}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {step === 'privacy' && (
          <div className="mt-8 space-y-4" data-testid="onboarding-privacy">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
              onClick={() => setStep('choice')}
            >
              <ChevronLeft size={14} />
              Zpět
            </button>
            <p className="text-sm leading-relaxed text-[#5A6660]">
              Vy rozhodujete, co je veřejné. Zdraví, léky, očkování, čip, dokumenty i
              kontakty zůstávají ve výchozím stavu soukromé — nic citlivého se
              automaticky nezveřejní.
            </p>
            <Button
              variant="primary"
              fullWidth
              data-testid="onboarding-privacy-continue"
              onClick={() => setStep('pets')}
            >
              Pokračovat
            </Button>
          </div>
        )}

        {step === 'pets' && (
          <div className="mt-8 space-y-4" data-testid="onboarding-pets">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
              onClick={() => setStep('privacy')}
            >
              <ChevronLeft size={14} />
              Zpět
            </button>
            <p className="text-sm leading-relaxed text-[#5A6660]">
              Přidejte mazlíčka přes stávající registraci. Můžete přeskočit a doplnit
              později v sekci Moji mazlíčci.
            </p>
            <Button
              variant="primary"
              fullWidth
              data-testid="onboarding-add-pet"
              onClick={openAddPet}
            >
              + Přidat mazlíčka
            </Button>
            <Button
              variant="ghost"
              fullWidth
              data-testid="onboarding-skip-pet"
              onClick={afterPetsFlow}
            >
              Přeskočit
            </Button>
          </div>
        )}

        {step === 'morePets' && (
          <div className="mt-8 space-y-4" data-testid="onboarding-more-pets">
            <p className="text-sm leading-relaxed text-[#5A6660]">
              Mazlíček je uložen. Chcete přidat ještě dalšího?
            </p>
            <Button
              variant="primary"
              fullWidth
              data-testid="onboarding-continue-after-pet"
              onClick={afterPetsFlow}
            >
              Pokračovat
            </Button>
            <Button
              variant="outline"
              fullWidth
              data-testid="onboarding-add-another-pet"
              onClick={openAddPet}
            >
              Přidat dalšího mazlíčka
            </Button>
          </div>
        )}

        {step === 'breederHint' && (
          <div className="mt-8 space-y-4" data-testid="onboarding-breeder-hint">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
              onClick={() => setStep(pets.length > 0 ? 'morePets' : 'pets')}
            >
              <ChevronLeft size={14} />
              Zpět
            </button>
            <p className="text-sm leading-relaxed text-[#5A6660]">
              Chovatelský profil můžete vytvořit u svého mazlíčka — v profilu mazlíčka
              zapnete existující chovný profil. Nevytváří se samostatný chovatelský
              účet mimo Pet.
            </p>
            <Button
              variant="primary"
              fullWidth
              data-testid="onboarding-breeder-continue"
              onClick={() => setStep('profile')}
            >
              Pokračovat k profilu
            </Button>
            <Button
              variant="ghost"
              fullWidth
              data-testid="onboarding-breeder-skip-profile"
              onClick={finishWithProfile}
            >
              Přeskočit a dokončit
            </Button>
          </div>
        )}

        {step === 'profile' && selectedChoice && (
          <div className="mt-8 space-y-4" data-testid="onboarding-profile">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54]"
              onClick={() => {
                if (choiceId === 'breeder') {
                  setStep('breederHint')
                  return
                }
                setStep(selectedChoice.needsServiceSubPick ? 'service' : 'choice')
              }}
            >
              <ChevronLeft size={14} />
              Zpět
            </button>
            <p className="text-xs leading-relaxed text-[#7D8B82]">
              Profesionální profil začíná jako neověřený a soukromý. Ověření, členství,
              platby a veřejnost řešíte později — role sama o sobě nic z toho
              neaktivuje.
            </p>
            <Input
              id="onboarding-display-name"
              label="Zobrazované jméno"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={selectedChoice.label}
              labelClassName="normal-case tracking-normal"
            />
            {(selectedChoice.organizationStyle || choiceId === 'breeder') && (
              <Input
                id="onboarding-org-name"
                label="Název organizace / stanice"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                labelClassName="normal-case tracking-normal"
              />
            )}
            <Input
              id="onboarding-city"
              label="Město"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              labelClassName="normal-case tracking-normal"
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[#4A564F]">
                Krátký popis
              </span>
              <textarea
                data-testid="onboarding-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-sm text-[#191E1B] outline-none focus:border-[#B8934A]/60"
              />
            </label>
            <Button
              variant="primary"
              fullWidth
              data-testid="onboarding-finish"
              onClick={finishWithProfile}
            >
              Dokončit profesionální profil
            </Button>
            <Button
              variant="ghost"
              fullWidth
              data-testid="onboarding-skip-profile"
              onClick={finishWithProfile}
            >
              Přeskočit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
