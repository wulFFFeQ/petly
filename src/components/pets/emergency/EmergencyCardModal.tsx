import { Copy, Download, Eye, QrCode, Settings2, Share2, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { getSelfAccount } from '../../../lib/account'
import { BRAND_NAME } from '../../../lib/brand'
import { copyTextToClipboard } from '../../../lib/clipboard'
import { SELF_OWNER_ID } from '../../../lib/discover/owner'
import {
  buildEmergencyCardPublicView,
  buildEmergencyCardUrl,
  ensureEmergencyCardSettings,
  printEmergencyCard,
} from '../../../lib/emergencyCard'
import {
  canReadPetEmergency,
  canWritePetEmergency,
  loadPetHouseholdAccess,
} from '../../../lib/household'
import { findActiveAnnouncementForPet } from '../../../lib/lostPet'
import { generateFoundPetQrDataUrl, downloadDataUrl } from '../../../lib/foundPet'
import type { Pet } from '../../../types'
import type { EmergencyCardSettings } from '../../../types/emergencyCard'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { EmergencyCardOwnerBody } from './EmergencyCardOwnerBody'
import { EmergencyCardPublicBody } from './EmergencyCardPublicBody'
import { EmergencyCardSettingsPanel } from './EmergencyCardSettingsPanel'

type PreviewMode = 'owner' | 'finder'

interface EmergencyCardModalProps {
  pet: Pet
  open: boolean
  onClose: () => void
}

export function EmergencyCardModal({ pet, open, onClose }: EmergencyCardModalProps) {
  const { updatePet, lostAnnouncements, showToast } = useApp()
  const [mode, setMode] = useState<PreviewMode>('owner')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sharing, setSharing] = useState(false)

  const actorAccountId = getSelfAccount()?.id ?? SELF_OWNER_ID
  const accessList = loadPetHouseholdAccess()
  const canWriteEmergency = canWritePetEmergency(pet, actorAccountId, accessList)
  const canReadEmergency = canReadPetEmergency(pet, actorAccountId, accessList)

  const activeLost = useMemo(
    () => findActiveAnnouncementForPet(lostAnnouncements, pet.id) ?? null,
    [lostAnnouncements, pet.id],
  )

  const publicView = useMemo(
    () => buildEmergencyCardPublicView(pet, { activeLostAnnouncement: activeLost }),
    [pet, activeLost],
  )

  const card = ensureEmergencyCardSettings(pet)
  const publicUrl = buildEmergencyCardUrl(card.publicSlug)

  const persistSettings = (next: EmergencyCardSettings) => {
    if (!canWriteEmergency) {
      showToast(
        'Nedostatečná oprávnění',
        'Nouzovou kartu může upravovat majitel nebo člen domácnosti s oprávněním emergency_write.',
        'info',
      )
      return
    }
    updatePet(pet.id, { emergencyCard: next })
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const ok = await copyTextToClipboard(publicUrl)
      if (ok) {
        showToast(
          'Veřejná nouzová karta',
          'Odkaz pro nálezce je ve schránce. Nesdílí interní profil.',
          'gold',
        )
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `Nouzová karta · ${pet.name}`,
          text: `${pet.name} — bezpečná nouzová karta ${BRAND_NAME}`,
          url: publicUrl,
        })
        showToast('Sdíleno', 'Veřejná nouzová karta byla sdílena.', 'gold')
      } else {
        showToast('Odkaz', publicUrl, 'info')
      }
    } catch {
      showToast('Sdílení zrušeno', 'Odkaz můžete zkopírovat ručně.', 'info')
    } finally {
      setSharing(false)
    }
  }

  const handlePrint = () => {
    const phone =
      card.visibility.showOwnerPhoneOnPrint && card.ownerPhoneForPrint?.trim()
        ? card.ownerPhoneForPrint.trim()
        : null
    printEmergencyCard({ view: publicView, ownerPhoneOnPrint: phone })
  }

  const handleDownloadQr = async () => {
    try {
      const dataUrl = await generateFoundPetQrDataUrl(publicUrl)
      downloadDataUrl(dataUrl, `emergency-${card.publicSlug}-qr.png`)
      showToast('QR stažen', 'QR vede na veřejnou nouzovou kartu.', 'gold')
    } catch {
      showToast('QR se nepodařilo vytvořit', 'Zkuste to prosím znovu.', 'info')
    }
  }

  if (!canReadEmergency) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Nouzová karta"
        subtitle="Přístup odepřen"
        maxWidth="lg"
      >
        <p className="text-sm text-[#4A564F]" data-testid="emergency-access-denied">
          Nemáte oprávnění zobrazit nouzovou kartu tohoto mazlíčka.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouzová karta"
      subtitle={
        mode === 'owner'
          ? canWriteEmergency
            ? 'Soukromý přehled — není veřejný'
            : 'Pouze pro čtení — úpravy vyžadují emergency_write'
          : 'Co skutečně uvidí nálezce — bez osobních údajů majitele'
      }
      maxWidth="lg"
    >
      <div className="space-y-4" data-testid="emergency-card-modal">
        <div className="flex rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-1">
          <button
            type="button"
            onClick={() => setMode('owner')}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
              mode === 'owner'
                ? 'bg-white text-[#234B54] shadow-sm'
                : 'text-[#7D8B82] hover:text-[#191E1B]',
            ].join(' ')}
          >
            <Shield size={14} />
            Náhled majitele
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('finder')
              setSettingsOpen(false)
            }}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
              mode === 'finder'
                ? 'bg-white text-[#234B54] shadow-sm'
                : 'text-[#7D8B82] hover:text-[#191E1B]',
            ].join(' ')}
          >
            <Eye size={14} />
            Co uvidí nálezce
          </button>
        </div>

        {mode === 'owner' ? (
          <EmergencyCardOwnerBody pet={pet} />
        ) : (
          <EmergencyCardPublicBody
            view={publicView}
            onContactOwner={() =>
              showToast(
                'Bezpečný kontakt',
                `Na veřejné kartě by se otevřel anonymní chat přes ${BRAND_NAME} — bez telefonu a e-mailu.`,
                'gold',
              )
            }
          />
        )}

        {mode === 'owner' && (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canWriteEmergency ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5 sm:flex-1"
                  onClick={() => setSettingsOpen((o) => !o)}
                  data-testid="emergency-settings-toggle"
                >
                  <Settings2 size={15} />
                  {settingsOpen ? 'Skrýt nastavení' : 'Co zobrazit veřejně'}
                </Button>
              ) : (
                <p
                  className="flex-1 self-center text-xs text-[#7D8B82]"
                  data-testid="emergency-read-only"
                >
                  Pouze pro čtení — úpravy nouzové karty nejsou povoleny.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 sm:flex-1"
                onClick={handleDownloadQr}
              >
                <QrCode size={15} />
                Stáhnout QR
              </Button>
            </div>

            {settingsOpen && canWriteEmergency && (
              <div className="rounded-xl border border-[#E8E4DC] bg-white p-3">
                <EmergencyCardSettingsPanel pet={pet} onChange={persistSettings} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="gold"
                fullWidth
                className="gap-1.5"
                onClick={handleShare}
                disabled={sharing}
              >
                <Share2 size={15} />
                Sdílet nouzovou kartu
              </Button>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" className="gap-1.5" onClick={handlePrint}>
                  <Download size={15} />
                  Stáhnout / vytisknout
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={async () => {
                    const ok = await copyTextToClipboard(publicUrl)
                    showToast(
                      ok ? 'Odkaz zkopírován' : 'Odkaz',
                      ok ? publicUrl : 'Zkopírujte ručně: ' + publicUrl,
                      'info',
                    )
                  }}
                >
                  <Copy size={15} />
                  Kopírovat veřejný odkaz
                </Button>
              </div>
              <p className="text-center text-[11px] text-[#7D8B82]">
                Veřejná URL: <span className="font-medium text-[#4A564F]">{publicUrl}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
