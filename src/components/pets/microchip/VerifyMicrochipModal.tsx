import { Info, Loader2, Search, ShieldAlert, XCircle, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import {
  isMicrochipDevMockMode,
  microchipValidationMessage,
  normalizeMicrochipInput,
  verifyMicrochip,
  type MicrochipVerificationResult,
} from '../../../lib/microchip'
import { formatIsoDateToCzech } from '../../../lib/petProfileUtils'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'

type ModalView = 'form' | 'result'

interface VerifyMicrochipModalProps {
  open: boolean
  onClose: () => void
  /** Prefill from pet profile. */
  initialChip?: string
  /** When set, persist verification result onto this pet. */
  petId?: string
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

/**
 * Owner-private registry check infrastructure.
 * Not a public found-pet tool — use QR /found/:token for that.
 */
export function VerifyMicrochipModal({
  open,
  onClose,
  initialChip = '',
  petId,
}: VerifyMicrochipModalProps) {
  const { updatePet } = useApp()
  const [view, setView] = useState<ModalView>('form')
  const [chip, setChip] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MicrochipVerificationResult | null>(null)

  useEffect(() => {
    if (!open) return
    setChip(normalizeMicrochipInput(initialChip))
    setError(null)
    setLoading(false)
    setResult(null)
    setView('form')
  }, [open, initialChip])

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
      setView('result')
    } catch {
      setError('Kontrola se nepodařila dokončit. Zkuste to prosím znovu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kontrola mikročipu"
      subtitle={
        view === 'form'
          ? 'Identifikační údaj pro veterináře a oprávněné organizace. Není určený pro veřejné hledání mazlíčka.'
          : undefined
      }
      maxWidth="sm"
    >
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
            LOVED &amp; KNOWN zatím nemá napojený živý registr. Tato kontrola je připravená
            infrastruktura — pro nalezení mazlíčka použijte QR kód na obojku.
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
              Zkontrolovat
            </Button>
          </div>
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
                    Tento mikročip je evidovaný v dostupném zdroji kontroly.
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
                    V dostupných zdrojích se k tomuto číslu nepodařilo najít záznam.
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
                    LOVED &amp; KNOWN momentálně nemá napojený živý registr mikročipů. Kontrola v
                    externí evidenci proto nelze dokončit.
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#7D8B82]">
                    Číslo zůstává uložené jako soukromý identifikátor. Pro kontakt při nálezu
                    použijte QR kód.
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
              <span className="font-semibold text-[#191E1B]">Kontrola: </span>
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

          <div className="flex items-start gap-2 rounded-xl bg-[#FAF8F5] p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-[#B8934A]" />
            <p className="text-xs leading-relaxed text-[#4A564F]">
              Mikročip slouží veterinářům a oprávněným organizacím. Veřejné hledání mazlíčka podle
              čísla čipu v aplikaci není dostupné.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setView('form')
                setResult(null)
              }}
            >
              Zkontrolovat znovu
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Zavřít
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
