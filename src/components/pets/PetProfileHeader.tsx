import {
  ArrowLeft,
  Check,
  Copy,
  Camera,
  ImagePlus,
  Share2,
  ShieldAlert,
  Sparkles,
  Calendar,
  Stethoscope,
  HeartHandshake,
  Pencil,
  Trash2,
  Search,
  Home,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { petTypeLabel } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type { Pet } from '../../types'
import { BRAND_NAME } from '../../lib/brand'
import { markPetProfileShared } from '../../lib/badges/badgeData'
import { copyTextToClipboard } from '../../lib/clipboard'
import { APP_TODAY } from '../../lib/dashboardDates'
import { maskMicrochip } from '../../lib/microchip'
import {
  EMPTY_PROFILE_LABEL,
  formatHealthStatus,
  formatNeuteredStatus,
  formatOptionalAge,
  formatOptionalText,
  formatOptionalWeight,
  hasMicrochip,
} from '../../lib/petProfileDisplay'
import {
  formatCzechDateToIso,
  formatIsoDateToCzech,
} from '../../lib/petProfileUtils'
import { getPetCoverColor } from '../../lib/petCoverColors'
import { getGenderOptions } from '../../lib/petTypes'
import {
  canHaveBreedingProfile,
  hasActiveBreedingProfile,
} from '../../lib/breedingProfile'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../lib/readImageFile'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { OptionSelect } from '../ui/OptionSelect'
import { VerifyMicrochipModal } from './microchip/VerifyMicrochipModal'
import { MarkLostModal } from './lost/MarkLostModal'
import { LostPetStatusBadge } from './lost/LostPetStatusBadge'
import { EmergencyCardModal } from './emergency/EmergencyCardModal'
import { getSelfAccount } from '../../lib/account'
import { canManagePetLostFound, loadPetHouseholdAccess } from '../../lib/household'
import { SELF_OWNER_ID } from '../../lib/discover/owner'

interface PetProfileHeaderProps {
  pet: Pet
}

type DetailsForm = {
  dateOfBirthIso: string
  arrivedAtIso: string
  age: string
  ageMonths: string
  gender: string
  weight: string
  microchip: string
  neutered: '' | 'yes' | 'no'
}

function agePartsFromIso(
  iso: string,
  today = APP_TODAY,
): { years: number; months: number } | undefined {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
  if (Number.isNaN(birth.getTime()) || birth > today) return { years: 0, months: 0 }

  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years: Math.max(0, years), months: Math.max(0, months) }
}

function buildDetailsForm(pet: Pet): DetailsForm {
  return {
    dateOfBirthIso: pet.dateOfBirth ? formatCzechDateToIso(pet.dateOfBirth) : '',
    arrivedAtIso:
      pet.arrivedAt && /^\d{4}-\d{2}-\d{2}$/.test(pet.arrivedAt)
        ? pet.arrivedAt
        : pet.arrivedAt
          ? formatCzechDateToIso(pet.arrivedAt)
          : '',
    age: pet.age != null && pet.age >= 0 ? String(pet.age) : '',
    ageMonths: pet.ageMonths != null && pet.ageMonths > 0 ? String(pet.ageMonths) : '',
    gender: pet.gender ?? '',
    weight: pet.weight != null && pet.weight > 0 ? String(pet.weight).replace('.', ',') : '',
    microchip: pet.microchip ?? '',
    neutered: pet.neutered == null ? '' : pet.neutered ? 'yes' : 'no',
  }
}

export function PetProfileHeader({ pet }: PetProfileHeaderProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [markLostOpen, setMarkLostOpen] = useState(false)
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [verifyChipOpen, setVerifyChipOpen] = useState(false)
  const [detailsForm, setDetailsForm] = useState<DetailsForm>(() => buildDetailsForm(pet))
  const photoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const { setActiveModal, showToast, updatePetImage, updatePetCoverImage, updatePet, deletePet, refreshBadges, resolveLostAnnouncement } =
    useApp()

  const actorAccountId = getSelfAccount()?.id ?? SELF_OWNER_ID
  const canManageLost = canManagePetLostFound(pet, actorAccountId, loadPetHouseholdAccess())

  useEffect(() => {
    if (!detailsOpen) setDetailsForm(buildDetailsForm(pet))
  }, [pet, detailsOpen])

  useEffect(() => {
    if (searchParams.get('edit') !== 'details') return
    setDetailsOpen(true)
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const statusVariant =
    pet.healthStatus === 'excellent'
      ? 'success'
      : pet.healthStatus === 'good'
        ? 'primary'
        : pet.healthStatus === 'attention'
          ? 'warning'
          : pet.healthStatus === 'vet_check' || pet.healthStatus === 'urgent'
            ? 'danger'
            : 'warning'

  const microchipValue = pet.microchip?.trim() ?? ''
  const chipVerification = pet.microchipVerification
  const chipVerifiedFound = chipVerification?.status === 'found'
  const coverColor = getPetCoverColor(pet)
  const breedingEligible = canHaveBreedingProfile(pet)
  const breedingActive = hasActiveBreedingProfile(pet)

  const shareLink = `https://lovedandknown.app/pets/${pet.id}?share=verified`

  const openDetailsEditor = () => {
    setDetailsForm(buildDetailsForm(pet))
    setDetailsOpen(true)
  }

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault()
    const weightRaw = detailsForm.weight.trim().replace(',', '.')
    const weightNum = weightRaw ? Number(weightRaw) : undefined
    let ageNum = detailsForm.age.trim() ? Number(detailsForm.age) : undefined
    let ageMonthsNum = detailsForm.ageMonths.trim()
      ? Number(detailsForm.ageMonths)
      : undefined

    if (
      (ageNum == null || Number.isNaN(ageNum)) &&
      (ageMonthsNum == null || Number.isNaN(ageMonthsNum)) &&
      detailsForm.dateOfBirthIso
    ) {
      const parts = agePartsFromIso(detailsForm.dateOfBirthIso)
      if (parts) {
        ageNum = parts.years
        ageMonthsNum = parts.months
      }
    }

    if (ageMonthsNum != null && !Number.isNaN(ageMonthsNum)) {
      ageMonthsNum = Math.min(11, Math.max(0, Math.floor(ageMonthsNum)))
    }

    const hasAge =
      (ageNum != null && !Number.isNaN(ageNum) && ageNum >= 0) ||
      (ageMonthsNum != null && !Number.isNaN(ageMonthsNum) && ageMonthsNum > 0)

    updatePet(pet.id, {
      dateOfBirth: detailsForm.dateOfBirthIso
        ? formatIsoDateToCzech(detailsForm.dateOfBirthIso)
        : undefined,
      arrivedAt: detailsForm.arrivedAtIso.trim() || undefined,
      age: hasAge
        ? ageNum != null && !Number.isNaN(ageNum)
          ? Math.max(0, Math.floor(ageNum))
          : 0
        : undefined,
      ageMonths:
        ageMonthsNum != null && !Number.isNaN(ageMonthsNum) && ageMonthsNum > 0
          ? ageMonthsNum
          : undefined,
      gender: detailsForm.gender || undefined,
      weight: weightNum != null && !Number.isNaN(weightNum) ? weightNum : undefined,
      microchip: detailsForm.microchip.trim() || undefined,
      neutered:
        detailsForm.neutered === ''
          ? undefined
          : detailsForm.neutered === 'yes',
    })
    setDetailsOpen(false)
    showToast('Údaje profilu uloženy', `${pet.name} — základní informace aktualizovány.`, 'gold')
  }

  const handleCopyChip = async () => {
    if (!hasMicrochip(microchipValue)) return
    const copied = await copyTextToClipboard(microchipValue)
    if (!copied) {
      showToast('Kopírování se nepodařilo', 'Zkuste číslo zkopírovat ručně.', 'info')
      return
    }
    setCopied(true)
    showToast('Mikročip zkopírován do schránky', microchipValue, 'info')
    setTimeout(() => setCopied(false), 2500)
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
    navigate('/pets', { replace: true })
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: 'photo' | 'banner',
  ) => {
    const [file] = takeSelectedFiles(event.currentTarget)
    if (!file) return

    const setUploading = kind === 'photo' ? setUploadingPhoto : setUploadingBanner
    setUploading(true)
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      if (kind === 'photo') {
        updatePetImage(pet.id, dataUrl)
        showToast('Profilová fotografie aktualizována', undefined, 'success')
      } else {
        updatePetCoverImage(pet.id, dataUrl)
        showToast('Banner aktualizován', undefined, 'success')
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Použijte JPG, PNG nebo WEBP.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrání se nezdařilo', 'Zkuste to prosím znovu.', 'info')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/pets"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7D8B82] transition-colors hover:text-[#234B54]"
        >
          <ArrowLeft size={15} />
          Zpět ke všem mazlíčkům
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveModal('addHealthRecord', pet.id)}
          className="hidden sm:inline-flex"
        >
          <Stethoscope size={14} />
          <span>Přidat záznam</span>
        </Button>
      </div>

      {/* Prominent action bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {pet.lostStatus === 'lost' ? (
          canManageLost ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setResolveConfirmOpen(true)}
              className="flex-1 gap-2 font-bold shadow-sm bg-emerald-700 hover:bg-emerald-800"
              data-testid="resolve-lost-button"
            >
              <Home size={18} />
              Mazlíček je doma
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              disabled
              title="Vyžaduje oprávnění Lost & Found (lost_manage)"
              className="flex-1 gap-2 font-bold shadow-sm opacity-60"
              data-testid="resolve-lost-disabled"
            >
              <Home size={18} />
              Mazlíček je doma
            </Button>
          )
        ) : canManageLost ? (
          <Button
            variant="danger"
            size="lg"
            onClick={() => setMarkLostOpen(true)}
            className="flex-1 gap-2 font-bold shadow-sm"
            data-testid="mark-lost-button"
          >
            <Search size={18} />
            Ztratil se!
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            disabled
            title="Vyžaduje oprávnění Lost & Found (lost_manage)"
            className="flex-1 gap-2 font-bold shadow-sm opacity-60"
            data-testid="mark-lost-disabled"
          >
            <Search size={18} />
            Ztratil se!
          </Button>
        )}
        <Button
          variant="gold"
          size="lg"
          onClick={() => setShareOpen(true)}
          className="flex-1 gap-2 font-bold shadow-sm"
        >
          <Share2 size={18} />
          Sdílet profil
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setEmergencyOpen(true)}
          className="flex-1 gap-2 font-bold border-[#234B54]/30 text-[#234B54] hover:bg-[#E0EAEC]"
          data-testid="emergency-card-button"
        >
          <ShieldAlert size={18} />
          Nouzová karta
        </Button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#E8E4DC] bg-white shadow-[0_4px_25px_rgba(25,30,27,0.05)]">
        <div
          className="relative h-48 sm:h-64 lg:h-72 w-full overflow-hidden group/banner"
          style={{ backgroundColor: coverColor }}
        >
          {pet.coverImage && (
            <img
              src={pet.coverImage}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          )}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {chipVerifiedFound && (
              <Badge variant="gold" size="sm" className="bg-white/95 backdrop-blur-md">
                <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                Ověřený čip
              </Badge>
            )}
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#234B54] shadow-sm backdrop-blur-md transition-opacity hover:bg-white disabled:cursor-wait"
              aria-label="Změnit fotku banneru"
              title="Změnit fotku banneru"
            >
              <ImagePlus size={14} />
              <span>Změnit banner</span>
            </button>
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept={PET_IMAGE_ACCEPT}
            className="sr-only"
            onChange={(event) => handleImageUpload(event, 'banner')}
          />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-stone-200 shrink-0 group">
                <img src={pet.image} alt={pet.name} className="h-full w-full object-cover object-center" />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/35 focus-visible:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234B54] focus-visible:ring-offset-2 disabled:cursor-wait"
                  aria-label="Změnit profilovou fotku"
                  title="Změnit profilovou fotku"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#234B54] text-white shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                    <Camera size={16} />
                  </span>
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept={PET_IMAGE_ACCEPT}
                  className="sr-only"
                  onChange={(event) => handleImageUpload(event, 'photo')}
                />
              </div>
              <div className="pb-1">
                {/* NAME ROW — name + badges share one flex line, centered to the name */}
                <div className="flex items-center gap-2.5">
                  <h1 className="m-0 text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#191E1B]">
                    {pet.name}
                  </h1>
                  {pet.healthStatus && (
                    <Badge
                      variant={statusVariant}
                      size="sm"
                      withDot
                      pulseDot
                      className="shrink-0"
                    >
                      {formatHealthStatus(pet.healthStatus)}
                    </Badge>
                  )}
                  {pet.lostStatus && (
                    <LostPetStatusBadge status={pet.lostStatus} className="shrink-0" />
                  )}
                  {breedingActive && (
                    <Badge
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                    >
                      Chovný profil
                    </Badge>
                  )}
                </div>
                {(pet.lostStatus === 'found' || pet.lostStatus === 'closed') && (
                  <p className="mt-1.5 text-xs font-medium text-[#7D8B82]">
                    Ztracený mazlíček – pátrání ukončeno
                  </p>
                )}
                {/* BREED ROW */}
                <p className={`${pet.lostStatus === 'found' || pet.lostStatus === 'closed' ? 'mt-0.5' : 'mt-1.5'} text-sm font-medium leading-normal text-[#4A564F]`}>
                  {pet.breed} · {petTypeLabel[pet.type]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              {pet.healthScore != null && (
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Skóre vitality
                  </span>
                  <p className="text-lg font-bold text-[#234B54]">
                    {pet.healthScore} / 100
                  </p>
                </div>
              )}
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={openDetailsEditor}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openDetailsEditor()
              }
            }}
            className="group flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-4 rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 sm:gap-x-6 sm:p-5 cursor-pointer transition-colors hover:border-[#D1E0D8] hover:bg-[#F7F4EE]"
            title="Upravit údaje"
          >
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Datum narození
              </p>
              <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                <Calendar size={13} className="shrink-0 text-[#234B54]" />
                {formatOptionalText(pet.dateOfBirth)}
              </p>
            </div>
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Datum příchodu
              </p>
              <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                <Home size={13} className="shrink-0 text-[#234B54]" />
                {pet.arrivedAt
                  ? formatIsoDateToCzech(pet.arrivedAt)
                  : formatOptionalText(undefined)}
              </p>
            </div>
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Věk
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                {formatOptionalAge(pet.age, pet.ageMonths)}
              </p>
            </div>
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Pohlaví
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                {formatOptionalText(pet.gender)}
              </p>
            </div>
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Aktuální hmotnost
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                {formatOptionalWeight(pet.weight)}
              </p>
            </div>
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Mikročip
              </p>
              <p className="mt-0.5 text-[9px] font-medium text-[#A3AEA7]">
                Identifikační údaj mazlíčka
              </p>
              {hasMicrochip(microchipValue) ? (
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="whitespace-nowrap font-mono text-xs font-bold text-[#234B54]"
                      title="Celé číslo je soukromé — zobrazuje se maskované"
                    >
                      {maskMicrochip(microchipValue)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleCopyChip()
                      }}
                      className="rounded-md p-0.5 text-[#A3AEA7] hover:bg-[#EBF2EE] hover:text-[#2C4A3E] cursor-pointer"
                      title="Zkopírovat celé číslo mikročipu"
                      aria-label="Zkopírovat celé číslo mikročipu"
                    >
                      {copied ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                  {chipVerifiedFound && chipVerification && (
                    <p className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-[#2C4A3E]">
                      <Check size={11} className="text-emerald-600" />
                      Ověřený
                      <span className="text-[#7D8B82]">
                        · Naposledy ověřeno:{' '}
                        {formatIsoDateToCzech(chipVerification.verifiedAt.slice(0, 10))}
                      </span>
                    </p>
                  )}
                  {chipVerification && !chipVerifiedFound && (
                    <p className="text-[10px] text-[#7D8B82]">
                      Naposledy ověřeno:{' '}
                      {formatIsoDateToCzech(chipVerification.verifiedAt.slice(0, 10))}
                      {chipVerification.status === 'unavailable'
                        ? ' · registr nepřipojen'
                        : ' · nenalezeno'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setVerifyChipOpen(true)
                    }}
                    className="block text-[10px] font-medium text-[#7D8B82] hover:text-[#2C4A3E] hover:underline cursor-pointer"
                  >
                    Kontrola registru (pro odborníky)
                  </button>
                </div>
              ) : (
                <div className="mt-1 space-y-1">
                  <p className="whitespace-nowrap text-sm font-bold text-[#191E1B]">
                    {EMPTY_PROFILE_LABEL}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setVerifyChipOpen(true)
                    }}
                    className="block text-[10px] font-medium text-[#7D8B82] hover:text-[#2C4A3E] hover:underline cursor-pointer"
                  >
                    Přidat a zkontrolovat čip
                  </button>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Kastrace
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                  {formatNeuteredStatus(pet.neutered, pet.gender)}
                </p>
              </div>
              <span
                className="ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E8E4DC] bg-white text-[#7D8B82] transition-colors group-hover:border-[#D1E0D8] group-hover:bg-[#EBF2EE] group-hover:text-[#2C4A3E]"
                aria-hidden
              >
                <Pencil size={15} strokeWidth={1.75} />
              </span>
            </div>
          </div>

          {breedingEligible && (
          <div
            className={`mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${
              breedingActive
                ? 'border-[#D1E0D8] bg-[#EBF2EE]/70'
                : 'border-[#E8E4DC] bg-white'
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  breedingActive
                    ? 'border-[#D1E0D8] bg-white text-[#2C4A3E]'
                    : 'border-[#E8E4DC] bg-[#FAF8F5] text-[#7D8B82]'
                }`}
              >
                <HeartHandshake size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#191E1B]">Chovný profil</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#5A6660]">
                  Zapnutím otevřete záložku Chovný profil a chovatelské události v kalendáři
                  (hárání, krytí, vrh…).
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={breedingActive}
              aria-label={
                breedingActive
                  ? 'Vypnout chovný profil'
                  : 'Zapnout chovný profil'
              }
              onClick={() => {
                if (!canHaveBreedingProfile(pet)) return
                const next = !breedingActive
                updatePet(pet.id, { breedingProfile: next })
                showToast(
                  next ? 'Chovný profil zapnut' : 'Chovný profil vypnut',
                  next
                    ? 'Záložka Chovný profil a chovatelské události v kalendáři jsou dostupné.'
                    : 'Kalendářní chov se skryje; uložená chovatelská data zůstávají.',
                  'info',
                )
              }}
              className="inline-flex shrink-0 cursor-pointer items-center gap-3 self-stretch rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 transition-colors hover:border-[#D1E0D8] sm:self-auto"
            >
              <span
                className={`text-xs font-bold ${
                  breedingActive ? 'text-[#2C4A3E]' : 'text-[#7D8B82]'
                }`}
              >
                {breedingActive ? 'Zapnuto' : 'Vypnuto'}
              </span>
              <span
                aria-hidden
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  breedingActive ? 'bg-[#2C4A3E]' : 'bg-[#D1D9D4]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    breedingActive ? 'left-5' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </div>
          )}

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#191E1B]">Smazat profil</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#5A6660]">
                Trvale odstraní {pet.name} včetně fotek, dokumentů, zdravotních záznamů a událostí
                v kalendáři.
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 self-stretch sm:self-auto"
            >
              <Trash2 size={14} />
              Smazat profil
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Upravit údaje"
        subtitle={`Základní informace o ${pet.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveDetails} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="pet-details-dob"
              label="Datum narození"
              type="date"
              value={detailsForm.dateOfBirthIso}
              onChange={(e) => {
                const dateOfBirthIso = e.target.value
                const parts = dateOfBirthIso ? agePartsFromIso(dateOfBirthIso) : undefined
                setDetailsForm((prev) => ({
                  ...prev,
                  dateOfBirthIso,
                  age: parts ? String(parts.years) : prev.age,
                  ageMonths:
                    parts && parts.months > 0 ? String(parts.months) : parts ? '' : prev.ageMonths,
                }))
              }}
            />
            <Input
              id="pet-details-arrived"
              label="Datum příchodu"
              type="date"
              value={detailsForm.arrivedAtIso}
              onChange={(e) =>
                setDetailsForm((prev) => ({ ...prev, arrivedAtIso: e.target.value }))
              }
            />
            <Input
              id="pet-details-age"
              label="Věk (roky)"
              type="number"
              min={0}
              max={40}
              step={1}
              placeholder="např. 3"
              value={detailsForm.age}
              onChange={(e) => setDetailsForm((prev) => ({ ...prev, age: e.target.value }))}
            />
            <Input
              id="pet-details-age-months"
              label="Měsíce"
              type="number"
              min={0}
              max={11}
              step={1}
              placeholder="0–11"
              value={detailsForm.ageMonths}
              onChange={(e) => setDetailsForm((prev) => ({ ...prev, ageMonths: e.target.value }))}
              hint="Při vyplnění data narození se věk dopočítá automaticky."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <OptionSelect
              id="pet-details-gender"
              label="Pohlaví"
              value={detailsForm.gender}
              onChange={(gender) => setDetailsForm((prev) => ({ ...prev, gender }))}
              options={[
                { value: '', label: 'Zatím nevyplněno' },
                ...getGenderOptions(pet.type),
              ]}
              placeholder="Vyberte pohlaví"
            />
            <Input
              id="pet-details-weight"
              label="Aktuální hmotnost (kg)"
              inputMode="decimal"
              placeholder="např. 12,5"
              value={detailsForm.weight}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,]/g, '')
                const sepMatch = raw.match(/[.,]/)
                const weight = !sepMatch
                  ? raw
                  : (() => {
                      const sep = sepMatch[0]
                      const [whole, ...fractionParts] = raw.split(/[.,]/)
                      return `${whole}${sep}${fractionParts.join('')}`
                    })()
                setDetailsForm((prev) => ({ ...prev, weight }))
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="pet-details-microchip"
              label="ID mikročipu"
              placeholder="15místné číslo"
              value={detailsForm.microchip}
              onChange={(e) => setDetailsForm((prev) => ({ ...prev, microchip: e.target.value }))}
            />
            <OptionSelect
              id="pet-details-neutered"
              label="Kastrace"
              value={detailsForm.neutered}
              onChange={(neutered) =>
                setDetailsForm((prev) => ({
                  ...prev,
                  neutered: neutered as DetailsForm['neutered'],
                }))
              }
              options={[
                { value: '', label: 'Zatím nevyplněno' },
                { value: 'yes', label: 'Ano' },
                { value: 'no', label: 'Ne' },
              ]}
              placeholder="Vyberte stav"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" variant="primary">
              Uložit změny
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Sdílet profil"
        subtitle={`Ověřený profil ${pet.name} pro veterináře, pet-sitting nebo nouzové situace`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-4">
            <img src={pet.image} alt={pet.name} className="h-16 w-16 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-bold text-[#191E1B]">{pet.name} · {pet.breed}</p>
              <p className="text-xs text-[#7D8B82] mt-0.5">
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
          <div className="rounded-xl border border-[#E8E4DC] p-3 flex items-center justify-between gap-2">
            <p className="text-xs text-[#5A6660] truncate font-mono">{shareLink}</p>
            <Button size="sm" variant="outline" onClick={handleCopyShareLink} className="shrink-0 gap-1">
              {linkCopied ? <Check size={14} /> : <Copy size={14} />}
              Kopírovat
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="primary"
              onClick={() => {
                showToast('Profil odeslán veterináři', `Dr. Novák obdrží profil ${pet.name}.`, 'gold')
                setShareOpen(false)
              }}
            >
              Sdílet s veterinářem
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                showToast('Export PDF', `Kompletní profil ${pet.name} připraven ke stažení.`, 'gold')
              }}
            >
              Stáhnout PDF profil
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
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Smazat profil mazlíčka"
        subtitle={`Tato akce je nevratná`}
        maxWidth="md"
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

      <VerifyMicrochipModal
        open={verifyChipOpen}
        onClose={() => setVerifyChipOpen(false)}
        initialChip={microchipValue}
        petId={pet.id}
      />

      <MarkLostModal
        key={pet.id}
        pet={pet}
        open={markLostOpen}
        onClose={() => setMarkLostOpen(false)}
      />

      <Modal
        open={resolveConfirmOpen}
        onClose={() => setResolveConfirmOpen(false)}
        title="Mazlíček je doma"
        subtitle={`Potvrdit, že ${pet.name} byl/a nalezen/a`}
        maxWidth="sm"
      >
        <p className="text-sm leading-relaxed text-[#4A564F]">
          Veřejné oznámení se deaktivuje a další hlášení nebudou možná. Historie hlášení zůstane
          zachována. Uživatelé, kteří poslali hlášení, budou informováni.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setResolveConfirmOpen(false)}>
            Zrušit
          </Button>
          <Button
            type="button"
            variant="primary"
            className="bg-emerald-700 hover:bg-emerald-800"
            onClick={() => {
              if (pet.activeLostAnnouncementId) {
                resolveLostAnnouncement(pet.activeLostAnnouncementId)
              }
              setResolveConfirmOpen(false)
            }}
          >
            <Home size={14} />
            Ano, {pet.name} je doma
          </Button>
        </div>
      </Modal>
    </div>
  )
}
