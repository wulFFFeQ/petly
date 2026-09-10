import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { getSelfAccount } from '../../lib/account'
import { emitProfessionalAccessNotification } from '../../lib/notifications'
import {
  getOpenAccessForPair,
  getRoleMeta,
  grantOwnerPetAccess,
  PERMISSION_LABELS,
  READ_PERMISSION_OPTIONS,
  suggestedPermissionsForRole,
  WRITE_PERMISSION_OPTIONS,
  type ProfessionalPermission,
  type ProfessionalProfile,
} from '../../lib/professional'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/utils'

type Step = 'form' | 'summary'

interface ConnectProfessionalModalProps {
  open: boolean
  onClose: () => void
  professional: ProfessionalProfile
  /** Prefill a single pet when opened from pet profile. */
  initialPetId?: string
  onCompleted?: () => void
}

export function ConnectProfessionalModal({
  open,
  onClose,
  professional,
  initialPetId,
  onCompleted,
}: ConnectProfessionalModalProps) {
  const { pets, showToast, upsertNotification } = useApp()
  const [step, setStep] = useState<Step>('form')
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(
    initialPetId ? [initialPetId] : pets[0] ? [pets[0].id] : [],
  )
  const [permissions, setPermissions] = useState<ProfessionalPermission[]>([])
  const [error, setError] = useState<string | null>(null)

  const roleLabel = getRoleMeta(professional.type).label

  const selectedPets = useMemo(
    () => pets.filter((p) => selectedPetIds.includes(p.id)),
    [pets, selectedPetIds],
  )

  const readSelected = permissions.filter((p) =>
    READ_PERMISSION_OPTIONS.some((o) => o.id === p),
  )
  const writeSelected = permissions.filter((p) =>
    WRITE_PERMISSION_OPTIONS.some((o) => o.id === p),
  )

  const reset = () => {
    setStep('form')
    setSelectedPetIds(initialPetId ? [initialPetId] : pets[0] ? [pets[0].id] : [])
    setPermissions([])
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const togglePet = (petId: string) => {
    setSelectedPetIds((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId],
    )
  }

  const togglePermission = (perm: ProfessionalPermission) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    )
  }

  const applySuggested = () => {
    setPermissions(suggestedPermissionsForRole(professional.type))
  }

  const goSummary = () => {
    setError(null)
    if (selectedPetIds.length === 0) {
      setError('Vyberte alespoň jednoho mazlíčka.')
      return
    }
    for (const petId of selectedPetIds) {
      const openAccess = getOpenAccessForPair(petId, professional.id)
      if (openAccess) {
        const pet = pets.find((p) => p.id === petId)
        setError(
          `Pro ${pet?.name ?? 'mazlíčka'} už existuje aktivní nebo čekající propojení.`,
        )
        return
      }
    }
    setStep('summary')
  }

  const confirm = () => {
    setError(null)
    const accountId = getSelfAccount()?.id || 'owner_self'
    try {
      for (const petId of selectedPetIds) {
        const { access } = grantOwnerPetAccess({
          petId,
          professionalId: professional.id,
          permissions,
          grantedByAccountId: accountId,
          status: 'active',
        })
        const pet = pets.find((p) => p.id === petId)
        emitProfessionalAccessNotification(upsertNotification, {
          access,
          event: 'approved',
          petName: pet?.name,
          professional,
          roleLabel,
        })
      }
      showToast(
        'Propojení uloženo',
        `${professional.displayName} · ${selectedPets.map((p) => p.name).join(', ')}`,
        'success',
      )
      handleClose()
      onCompleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Propojení se nepodařilo uložit.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Propojit s profesionálem"
      subtitle="Vyberte, ke kterému mazlíčkovi chcete profesionála propojit a co mu dovolíte zobrazit nebo přidat."
      maxWidth="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div data-testid="connect-professional-modal" className="space-y-5">
        <p className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2 text-[11px] leading-relaxed text-[#5A6660]">
          Propojení samo o sobě <strong>neznamená</strong> plný přístup ke zdravotním údajům.
          Nic není povoleno, dokud to zde výslovně nezaškrtnete. Mikročip a kontakty majitele
          nelze udělit.
        </p>

        <div className="text-xs text-[#7D8B82]">
          Profesionál:{' '}
          <span className="font-bold text-[#191E1B]">{professional.displayName}</span>
          <span className="text-[#A3AEA7]"> · {roleLabel}</span>
        </div>

        {step === 'form' ? (
          <>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                1. Mazlíček
              </p>
              {pets.length === 0 ? (
                <p className="text-xs text-[#7D8B82]">Nejdříve přidejte mazlíčka.</p>
              ) : (
                <div className="flex flex-wrap gap-2" data-testid="connect-pet-picker">
                  {pets.map((pet) => {
                    const selected = selectedPetIds.includes(pet.id)
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        data-testid={`connect-pet-${pet.id}`}
                        onClick={() => togglePet(pet.id)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                          selected
                            ? 'bg-[#2C4A3E] text-white'
                            : 'bg-white text-[#4A564F] ring-1 ring-[#E8E4DC]',
                        )}
                      >
                        {pet.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  2. Co může profesionál zobrazit?
                </p>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[#234B54] hover:underline"
                  onClick={applySuggested}
                  data-testid="connect-apply-suggested"
                >
                  Navrhnout dle role
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {READ_PERMISSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs text-[#191E1B]"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(opt.id)}
                      onChange={() => togglePermission(opt.id)}
                      data-testid={`connect-perm-${opt.id}`}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                3. Co může profesionál přidávat?
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {WRITE_PERMISSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs text-[#191E1B]"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(opt.id)}
                      onChange={() => togglePermission(opt.id)}
                      data-testid={`connect-perm-${opt.id}`}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {error ? (
              <p className="text-xs font-medium text-rose-700" data-testid="connect-error">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Zrušit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={goSummary}
                data-testid="connect-continue"
              >
                Pokračovat
              </Button>
            </div>
          </>
        ) : (
          <>
            <div data-testid="connect-summary" className="space-y-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4">
              <p className="text-xs font-bold text-[#191E1B]">Udělíte přístup:</p>
              <p className="text-sm font-bold text-[#191E1B]">
                {selectedPets.map((p) => p.name).join(', ')}
              </p>
              <p className="text-xs text-[#4A564F]">{professional.displayName}</p>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Může zobrazit
                </p>
                {readSelected.length === 0 ? (
                  <p className="text-xs text-[#A3AEA7]">Nic</p>
                ) : (
                  <ul className="mt-1 list-disc pl-4 text-xs text-[#4A564F]">
                    {readSelected.map((p) => (
                      <li key={p}>{PERMISSION_LABELS[p]}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Může přidat
                </p>
                {writeSelected.length === 0 ? (
                  <p className="text-xs text-[#A3AEA7]">Nic</p>
                ) : (
                  <ul className="mt-1 list-disc pl-4 text-xs text-[#4A564F]">
                    {writeSelected.map((p) => (
                      <li key={p}>{PERMISSION_LABELS[p]}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {error ? (
              <p className="text-xs font-medium text-rose-700" data-testid="connect-error">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('form')}>
                Zpět
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirm}
                data-testid="connect-confirm"
              >
                Potvrdit propojení
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
