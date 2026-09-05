import { CheckCircle2, Info, Loader2, Search, ShieldAlert, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import {
  isMicrochipDevMockMode,
  lookupLovedKnownPetByMicrochip,
  MICROCHIP_REGISTRY_INFO_LINKS,
  microchipValidationMessage,
  normalizeMicrochipInput,
  verifyMicrochip,
  type LovedKnownMicrochipMatch,
  type MicrochipVerificationResult,
} from '../../../lib/microchip'
import { formatIsoDateToCzech } from '../../../lib/petProfileUtils'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'

type ModalView = 'form' | 'result' | 'registry_info'

interface VerifyMicrochipModalProps {
  open: boolean
  onClose: () => void
  /** Prefill from pet profile. */
  initialChip?: string
  /** When set, persist verification result onto this pet. */
  petId?: string
  /** Start in "report found pet" flow. */
  mode?: 'verify' | 'found_pet'
}

function formatCheckedAt(iso: string): string {
  const day = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return formatIsoDateToCzech(day)
  try {
    return new Date(iso).toLocaleString('cs-CZ')
  } catch {
    return iso
  }
}

export function VerifyMicrochipModal({
  open,
  onClose,
  initialChip = '',
  petId,
  mode = 'verify',
}: VerifyMicrochipModalProps) {
  const { pets, updatePet, showToast } = useApp()
  const navigate = useNavigate()
  const [view, setView] = useState<ModalView>('form')
  const [chip, setChip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MicrochipVerificationResult | null>(null)
  const [lkMatch, setLkMatch] = useState<LovedKnownMicrochipMatch | null>(null)
  const [flow, setFlow] = useState<'verify' | 'found_pet'>(mode)

  useEffect(() => {
    if (!open) return
    setChip(normalizeMicrochipInput(initialChip))
    setError(null)
    setLoading(false)
    setResult(null)
    setLkMatch(null)
    setView('form')
    setFlow(mode)
  }, [open, initialChip, mode])

  const title =
    view === 'registry_info'
      ? 'Kde může být čip registrovaný'
      : flow === 'found_pet'
        ? 'Nahlásit nalezeného mazlíčka'
        : 'Ověřit mikročip'

  const subtitle =
    view === 'form' && flow === 'verify'
      ? 'Zkontrolujte, zda je mikročip vašeho mazlíčka evidovaný v dostupných registrech.'
      : view === 'form' && flow === 'found_pet'
        ? 'Zadejte číslo mikročipu. Osobní údaje majitele nezobrazujeme.'
        : undefined

  const handleChipChange = (value: string) => {
    setChip(normalizeMicrochipInput(value).slice(0, 15))
    if (error) setError(null)
  }

  const persistResult = (verification: MicrochipVerificationResult) => {
    if (!petId) return
    const foundRegistry = verification.registries.find((r) => r.status === 'found')
    updatePet(petId, {
      microchip: verification.chipNumber,
      microchipVerification: {
        status: verification.aggregate,
        verifiedAt: verification.checkedAt,
        registryLabel: foundRegistry?.label,
        mode: verification.mode,
        chipNumber: verification.chipNumber,
      },
    })
  }

  const runVerify = async () => {
    const message = microchipValidationMessage(chip)
    if (message) {
      setError(message)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const normalized = normalizeMicrochipInput(chip)
      const verification = await verifyMicrochip(normalized)
      setResult(verification)
      persistResult(verification)

      if (flow === 'found_pet') {
        const match = lookupLovedKnownPetByMicrochip(normalized, pets)
        setLkMatch(match)
      } else {
        setLkMatch(lookupLovedKnownPetByMicrochip(normalized, pets))
      }
      setView('result')
    } catch {
      setError('Ověření se nepodařilo dokončit. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  const handleContactOwner = () => {
    if (!lkMatch) return
    showToast(
      'Anonymní kontakt',
      'V produkci by se otevřela bezpečná konverzace bez sdílení telefonu nebo e-mailu nálezce.',
      'gold',
    )
    // Household demo: chip matched a local pet — open profile instead of exposing PII.
    navigate(`/pets/${lkMatch.petId}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} maxWidth="sm">
      {isMicrochipDevMockMode() && (
        <div className="mb-4 rounded-xl border border-[#E8D8B5] bg-[#FAF4E6]/80 px-3 py-2 text-[11px] font-medium text-[#8A6A2E]">
          Vývojový režim — není skutečné ověření v registru.
        </div>
      )}

      {view === 'form' && (
        <div className="space-y-4">
          <Input
            id="verify-microchip-input"
            label="Číslo mikročipu"
            value={chip}
            onChange={(e) => handleChipChange(e.target.value)}
            placeholder="Zadejte 15místné číslo"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />
          {error && (
            <p className="text-xs text-[#A85B4A]" role="alert">
              {error}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-[#7D8B82]">
            Z bezpečnostních důvodů nikdy nezobrazujeme osobní údaje majitele zvířete.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button
              type="button"
              variant="primary"
              className="gap-1.5"
              disabled={loading}
              onClick={() => void runVerify()}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {flow === 'found_pet' ? 'Hledat mikročip' : 'Ověřit mikročip'}
            </Button>
          </div>
          {flow === 'verify' && (
            <button
              type="button"
              onClick={() => {
                setFlow('found_pet')
                setView('form')
                setResult(null)
              }}
              className="text-[11px] font-semibold text-[#2C4A3E] hover:underline cursor-pointer"
            >
              Nahlásit nalezeného mazlíčka
            </button>
          )}
        </div>
      )}

      {view === 'result' && result && (
        <div className="space-y-4">
          {result.aggregate === 'found' && (
            <div className="rounded-xl border border-[#D1E0D8] bg-[#EBF2EE]/70 p-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2C4A3E]" />
                <div>
                  <p className="text-sm font-bold text-[#191E1B]">Mikročip nalezen</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A564F]">
                    Tento mikročip je evidovaný v registru.
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#7D8B82]">
                    Z bezpečnostních důvodů nezobrazujeme osobní údaje majitele.
                  </p>
                </div>
              </div>
            </div>
          )}

          {result.aggregate === 'not_found' && (
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4">
              <div className="flex items-start gap-2.5">
                <XCircle size={20} className="mt-0.5 shrink-0 text-[#7D8B82]" />
                <div>
                  <p className="text-sm font-bold text-[#191E1B]">Mikročip nebyl nalezen</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A564F]">
                    V dostupných registrech se k tomuto číslu nepodařilo najít záznam.
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#7D8B82]">
                    To nemusí znamenat, že mikročip není registrovaný. Může být vedený v jiném
                    registru, který momentálně není dostupný.
                  </p>
                </div>
              </div>
            </div>
          )}

          {result.aggregate === 'unavailable' && (
            <div className="rounded-xl border border-[#E8D8B5] bg-[#FAF4E6]/50 p-4">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={20} className="mt-0.5 shrink-0 text-[#B8934A]" />
                <div>
                  <p className="text-sm font-bold text-[#191E1B]">Registr není připojený</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4A564F]">
                    LOVED &amp; KNOWN momentálně nemá napojený živý registr mikročipů. Ověření v
                    externí evidenci proto nelze dokončit.
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#7D8B82]">
                    Číslo můžete uložit v profilu mazlíčka a ověření zopakovat, až bude registr
                    dostupný.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5 text-xs text-[#5A6660]">
            <p>
              <span className="font-semibold text-[#191E1B]">Číslo: </span>
              <span className="font-mono">{result.chipNumber}</span>
            </p>
            <p>
              <span className="font-semibold text-[#191E1B]">Ověřeno: </span>
              {formatCheckedAt(result.checkedAt)}
            </p>
            {result.registries.map((reg) => (
              <p key={reg.id}>
                <span className="font-semibold text-[#191E1B]">Zdroj: </span>
                {reg.label}
                {reg.note ? ` — ${reg.note}` : ''}
              </p>
            ))}
          </div>

          {lkMatch && (
            <div className="rounded-xl border border-[#D1E0D8] bg-white p-3.5">
              <p className="text-sm font-bold text-[#191E1B]">
                Tento mazlíček má aktivní profil v LOVED &amp; KNOWN.
              </p>
              <p className="mt-1 text-[11px] text-[#7D8B82]">
                Mazlíček: {lkMatch.petName}. Kontakt probíhá anonymně přes aplikaci — údaje
                nálezce se majiteli neposílají automaticky.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={handleContactOwner}
              >
                Kontaktovat majitele
              </Button>
              <p className="mt-2 text-[10px] text-[#A3AEA7]">
                Kontakt probíhá jen přes LOVED &amp; KNOWN — telefon, e-mail ani adresa se
                nepředávají automaticky.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setView('form')
                setResult(null)
              }}
            >
              {result.aggregate === 'not_found' ? 'Zkusit ověřit znovu' : 'Ověřit znovu'}
            </Button>
            {result.aggregate === 'not_found' || result.aggregate === 'unavailable' ? (
              <Button type="button" variant="outline" onClick={() => setView('registry_info')}>
                Zjistit, kde může být čip registrovaný
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              Zavřít
            </Button>
          </div>
        </div>
      )}

      {view === 'registry_info' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-[#FAF8F5] p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-[#B8934A]" />
            <p className="text-xs leading-relaxed text-[#4A564F]">
              Tyto odkazy vedou na veřejné informační stránky registrů. LOVED &amp; KNOWN z nich
              nenačítá osobní údaje majitele.
            </p>
          </div>
          <ul className="space-y-2">
            {MICROCHIP_REGISTRY_INFO_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block rounded-xl border border-[#E8E4DC] px-3.5 py-2.5 text-sm font-semibold text-[#2C4A3E] hover:bg-[#FAF8F5] transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" onClick={() => setView(result ? 'result' : 'form')}>
            Zpět
          </Button>
        </div>
      )}
    </Modal>
  )
}
