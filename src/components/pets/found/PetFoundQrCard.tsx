import { Check, Download, Printer, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import {
  buildFoundPetUrl,
  downloadDataUrl,
  generateFoundPetQrDataUrl,
  printQrImage,
} from '../../../lib/foundPet'
import type { Pet } from '../../../types'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'

interface FoundQrModalProps {
  open: boolean
  onClose: () => void
  pet: Pet
}

export function FoundQrModal({ open, onClose, pet }: FoundQrModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = pet.foundContactToken
  const url = token ? buildFoundPetUrl(token) : ''

  useEffect(() => {
    if (!open || !url) return
    let cancelled = false
    setError(null)
    setDataUrl(null)
    void generateFoundPetQrDataUrl(url)
      .then((value) => {
        if (!cancelled) setDataUrl(value)
      })
      .catch(() => {
        if (!cancelled) setError('QR kód se nepodařilo vygenerovat.')
      })
    return () => {
      cancelled = true
    }
  }, [open, url])

  const handleDownload = () => {
    if (!dataUrl) return
    downloadDataUrl(dataUrl, `loved-known-${pet.name.toLowerCase()}-qr.png`)
  }

  const handlePrint = () => {
    if (!dataUrl) return
    printQrImage(dataUrl, pet.name)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="QR kód pro nalezení"
      subtitle="Vytiskněte nebo stáhněte QR na známku, obojek či kartičku mazlíčka."
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-6">
          {error && <p className="text-xs text-[#A85B4A]">{error}</p>}
          {!error && !dataUrl && (
            <div className="flex h-64 w-64 items-center justify-center text-xs text-[#7D8B82]">
              Generuji QR kód…
            </div>
          )}
          {dataUrl && (
            <img
              src={dataUrl}
              alt={`QR kód ${pet.name}`}
              className="h-64 w-64 rounded-xl bg-white p-2 shadow-sm"
            />
          )}
          <p className="mt-4 text-center text-sm font-bold text-[#191E1B]">{pet.name}</p>
          <p className="mt-1 max-w-[16rem] text-center text-[11px] leading-relaxed text-[#7D8B82]">
            Naskenováním se otevře bezpečná stránka LOVED &amp; KNOWN — ne celý profil.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            className="gap-1.5"
            disabled={!dataUrl}
            onClick={handleDownload}
          >
            <Download size={14} />
            Stáhnout QR kód
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={!dataUrl}
            onClick={handlePrint}
          >
            <Printer size={14} />
            Vytisknout
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Zavřít
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface PetFoundQrCardProps {
  pet: Pet
}

export function PetFoundQrCard({ pet }: PetFoundQrCardProps) {
  const { updatePet } = useApp()
  const [qrOpen, setQrOpen] = useState(false)
  const enabled = pet.qrContactEnabled !== false
  const token = pet.foundContactToken

  const toggleEnabled = () => {
    updatePet(pet.id, { qrContactEnabled: !enabled })
  }

  return (
    <>
      <div className="rounded-2xl border border-[#E8E4DC] bg-white p-5 shadow-[0_2px_12px_rgba(25,30,27,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <QrCode size={16} className="shrink-0 text-[#234B54]" />
              <h3 className="text-sm font-bold text-[#191E1B]">QR kód pro nalezení</h3>
            </div>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#A3AEA7]">
              Rychlý kontakt při nálezu
            </p>
          </div>
          {enabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF2EE] px-2.5 py-1 text-[10px] font-bold text-[#2C4A3E]">
              <Check size={11} />
              Aktivní
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#F3F1EC] px-2.5 py-1 text-[10px] font-bold text-[#7D8B82]">
              Vypnuto
            </span>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#5A6660]">
          {enabled
            ? 'Kdokoli, kdo LOVED & KNOWN QR kód naskenuje, vás může bezpečně kontaktovat.'
            : 'QR stránka zůstane dostupná, ale kontakt majitele je vypnutý.'}
        </p>

        <div className="mt-4 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#191E1B]">QR kontakt při nálezu</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#7D8B82]">
                Pokud někdo vašeho mazlíčka najde, může vás bezpečně kontaktovat přes LOVED &amp;
                KNOWN.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={toggleEnabled}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer ${
                enabled ? 'bg-[#2C4A3E]' : 'bg-[#D1D5D0]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[10px] font-semibold text-[#5A6660]">
            {enabled ? 'Zapnuto' : 'Vypnuto'}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="gap-1.5"
            disabled={!token}
            onClick={() => setQrOpen(true)}
          >
            <QrCode size={13} />
            Zobrazit QR kód
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!token}
            onClick={() => setQrOpen(true)}
          >
            Stáhnout / tisk
          </Button>
        </div>
      </div>

      {token && <FoundQrModal open={qrOpen} onClose={() => setQrOpen(false)} pet={pet} />}
    </>
  )
}
