import {
  Check,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  QrCode,
  Search,
  Settings2,
  Share2,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { BRAND_NAME } from '../../lib/brand'
import { markPetProfileShared } from '../../lib/badges/badgeData'
import { copyTextToClipboard } from '../../lib/clipboard'
import { maskMicrochip } from '../../lib/microchip'
import {
  EMPTY_PROFILE_LABEL,
  hasMicrochip,
} from '../../lib/petProfileDisplay'
import { cn } from '../../lib/utils'
import type { Pet } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { FoundQrModal } from './found/PetFoundQrCard'
import { MarkLostModal } from './lost/MarkLostModal'
import { EmergencyCardModal } from './emergency/EmergencyCardModal'
import { getSelfAccount } from '../../lib/account'
import { canManagePetLostFound, loadPetHouseholdAccess } from '../../lib/household'
import { SELF_OWNER_ID } from '../../lib/discover/owner'

interface PetGridCardMenuProps {
  pet: Pet
}

type MenuAction =
  | 'view'
  | 'edit'
  | 'share'
  | 'qr'
  | 'emergency'
  | 'lost'
  | 'privacy'
  | 'delete'

export function PetGridCardMenu({ pet }: PetGridCardMenuProps) {
  const navigate = useNavigate()
  const { deletePet, updatePet, showToast, refreshBadges } = useApp()
  const menuId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0 })
  const [shareOpen, setShareOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [markLostOpen, setMarkLostOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const shareLink = `https://lovedandknown.app/pets/${pet.id}?share=verified`
  const qrAvailable = Boolean(pet.foundContactToken) && pet.qrContactEnabled !== false
  const isLost = pet.lostStatus === 'lost'
  const microchipValue = pet.microchip?.trim() ?? ''
  const actorAccountId = getSelfAccount()?.id ?? SELF_OWNER_ID
  const canManageLost = canManagePetLostFound(pet, actorAccountId, loadPetHouseholdAccess())

  useEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = 220
      const left = Math.min(rect.right - width, window.innerWidth - width - 8)
      setPanelStyle({
        top: rect.bottom + 6,
        left: Math.max(8, left),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (document.getElementById(menuId)?.contains(target)) return
      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, menuId])

  const runAction = (action: MenuAction) => {
    setOpen(false)
    switch (action) {
      case 'view':
        navigate(`/pets/${pet.id}`)
        break
      case 'edit':
        navigate(`/pets/${pet.id}?edit=details`)
        break
      case 'share':
        setShareOpen(true)
        break
      case 'qr':
        if (qrAvailable) setQrOpen(true)
        else {
          showToast(
            'QR kontakt není aktivní',
            'Zapněte QR kontakt při nálezu v nastavení soukromí.',
            'info',
          )
          setPrivacyOpen(true)
        }
        break
      case 'emergency':
        setEmergencyOpen(true)
        break
      case 'lost':
        if (!canManageLost) {
          showToast(
            'Nedostatečná oprávnění',
            'Označit mazlíčka jako ztraceného může majitel nebo člen domácnosti s oprávněním Lost & Found.',
            'info',
          )
          break
        }
        if (isLost) navigate(`/pets/${pet.id}`)
        else setMarkLostOpen(true)
        break
      case 'privacy':
        setPrivacyOpen(true)
        break
      case 'delete':
        setDeleteOpen(true)
        break
    }
  }

  const handleCopyShareLink = async () => {
    const copied = await copyTextToClipboard(shareLink)
    if (!copied) {
      showToast('Kopírování se nepodařilo', 'Zkuste odkaz zkopírovat ručně.', 'info')
      return
    }
    setLinkCopied(true)
    markPetProfileShared(pet.id)
    refreshBadges()
    showToast('Odkaz zkopírován', 'Profil mazlíčka je připraven ke sdílení.', 'gold')
    setTimeout(() => setLinkCopied(false), 2500)
  }

  const handleConfirmDelete = () => {
    deletePet(pet.id)
    setDeleteOpen(false)
    showToast('Profil smazán', `${pet.name} byl odstraněn.`, 'info')
  }

  const menuItems: {
    action: MenuAction
    label: string
    icon: typeof Eye
    danger?: boolean
    disabled?: boolean
  }[] = [
    { action: 'view', label: 'Zobrazit profil', icon: Eye },
    { action: 'edit', label: 'Upravit profil', icon: Pencil },
    { action: 'share', label: 'Sdílet profil', icon: Share2 },
    { action: 'qr', label: 'Zobrazit QR kód', icon: QrCode },
    { action: 'emergency', label: 'Nouzová karta', icon: ShieldAlert },
    {
      action: 'lost',
      label: isLost ? 'Otevřít pátrání' : 'Označit jako ztraceného',
      icon: Search,
      disabled: !canManageLost && !isLost,
    },
    { action: 'privacy', label: 'Nastavení soukromí', icon: Settings2 },
    { action: 'delete', label: 'Smazat profil', icon: Trash2, danger: true },
  ]

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Další akce pro ${pet.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E4DC] bg-white/95 text-[#5A6660] shadow-xs backdrop-blur-md transition-colors hover:border-[#D1E0D8] hover:text-[#191E1B]"
      >
        <MoreHorizontal size={15} />
      </button>

      {open &&
        createPortal(
          <div
            id={menuId}
            role="menu"
            style={{ top: panelStyle.top, left: panelStyle.left }}
            className="fixed z-[60] w-[220px] overflow-hidden rounded-xl border border-[#E8E4DC] bg-white py-1.5 shadow-[0_12px_40px_rgba(25,30,27,0.14)]"
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon
              const showDivider = item.danger && index > 0
              return (
                <div key={item.action}>
                  {showDivider && <div className="my-1.5 border-t border-[#E8E4DC]" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    title={
                      item.disabled
                        ? 'Vyžaduje oprávnění Lost & Found (lost_manage)'
                        : undefined
                    }
                    onClick={() => {
                      if (item.disabled) return
                      runAction(item.action)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                      item.disabled && 'cursor-not-allowed opacity-50',
                      item.danger
                        ? 'font-semibold text-[#A85B4A] hover:bg-rose-50'
                        : 'text-[#191E1B] hover:bg-[#FAF8F5]',
                      item.disabled && 'hover:bg-transparent',
                    )}
                    data-testid={item.action === 'lost' ? 'menu-mark-lost' : undefined}
                  >
                    <Icon size={14} className="shrink-0 opacity-70" />
                    {item.label}
                  </button>
                </div>
              )
            })}
          </div>,
          document.body,
        )}

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Sdílet profil"
        subtitle={`Ověřený profil ${pet.name}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4">
            <img src={pet.image} alt={pet.name} className="h-16 w-16 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-bold text-[#191E1B]">
                {pet.name} · {pet.breed}
              </p>
              <p className="mt-0.5 text-xs text-[#7D8B82]">
                Čip:{' '}
                {hasMicrochip(microchipValue)
                  ? maskMicrochip(microchipValue)
                  : EMPTY_PROFILE_LABEL}
              </p>
              {hasMicrochip(microchipValue) && (
                <Badge variant="gold" size="sm" className="mt-1.5">
                  Ověřený profil {BRAND_NAME}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E8E4DC] p-3">
            <p className="truncate font-mono text-xs text-[#5A6660]">{shareLink}</p>
            <Button size="sm" variant="outline" onClick={handleCopyShareLink} className="shrink-0 gap-1">
              {linkCopied ? <Check size={14} /> : <Copy size={14} />}
              Kopírovat
            </Button>
          </div>
        </div>
      </Modal>

      <EmergencyCardModal
        pet={pet}
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
      />

      <Modal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Nastavení soukromí"
        subtitle={`${pet.name} — co je soukromé a co může být veřejné`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[#4A564F]">
            Na stránce Moji mazlíčci jsou všechny údaje soukromé. Veřejně se zobrazí jen to, co
            výslovně povolíte (např. QR kontakt při nálezu).
          </p>
          <button
            type="button"
            onClick={() => {
              const next = pet.qrContactEnabled === false
              updatePet(pet.id, { qrContactEnabled: next })
              showToast(
                next ? 'QR kontakt zapnut' : 'QR kontakt vypnut',
                next
                  ? 'Nálezce vás může bezpečně kontaktovat přes LOVED & KNOWN.'
                  : 'Sken QR již neotevře kontakt na majitele.',
                'info',
              )
            }}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] px-4 py-3 text-left transition-colors hover:bg-white"
          >
            <div>
              <p className="text-sm font-bold text-[#191E1B]">QR kontakt při nálezu</p>
              <p className="mt-0.5 text-xs text-[#7D8B82]">
                Bez telefonu a e-mailu — pouze bezpečný kontakt v aplikaci.
              </p>
            </div>
            <span
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                pet.qrContactEnabled !== false ? 'bg-[#2C4A3E]' : 'bg-[#D1D9D4]',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  pet.qrContactEnabled !== false ? 'left-5' : 'left-0.5',
                )}
              />
            </span>
          </button>
          <Button variant="outline" fullWidth onClick={() => navigate(`/pets/${pet.id}`)}>
            Další nastavení v profilu
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Smazat profil mazlíčka"
        subtitle="Tato akce je nevratná"
        maxWidth="md"
        closeOnBackdrop={false}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[#4A564F]">
            Opravdu chcete smazat profil <span className="font-bold text-[#191E1B]">{pet.name}</span>?
            Spolu s ním zmizí fotografie, dokumenty, zdravotní záznamy a související události
            v kalendáři.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Zrušit
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete}>
              <Trash2 size={14} />
              Ano, smazat profil
            </Button>
          </div>
        </div>
      </Modal>

      <MarkLostModal
        pet={pet}
        open={markLostOpen}
        onClose={() => setMarkLostOpen(false)}
        onCreated={() => navigate(`/pets/${pet.id}`)}
      />

      {pet.foundContactToken && (
        <FoundQrModal open={qrOpen} onClose={() => setQrOpen(false)} pet={pet} />
      )}
    </>
  )
}
