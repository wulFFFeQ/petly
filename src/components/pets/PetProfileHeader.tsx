import {
  ArrowLeft,
  Check,
  Copy,
  AlertTriangle,
  Camera,
  ImagePlus,
  Phone,
  Share2,
  ShieldAlert,
  Sparkles,
  Calendar,
  Stethoscope,
  HeartHandshake,
  Pencil,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { importantContacts, petTypeLabel } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type { Pet } from '../../types'
import { BRAND_NAME } from '../../lib/brand'
import { copyTextToClipboard } from '../../lib/clipboard'
import { APP_TODAY } from '../../lib/dashboardDates'
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
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../lib/readImageFile'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { OptionSelect } from '../ui/OptionSelect'

interface PetProfileHeaderProps {
  pet: Pet
}

type DetailsForm = {
  dateOfBirthIso: string
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
    age: pet.age != null && pet.age >= 0 ? String(pet.age) : '',
    ageMonths: pet.ageMonths != null && pet.ageMonths > 0 ? String(pet.ageMonths) : '',
    gender: pet.gender ?? '',
    weight: pet.weight != null && pet.weight > 0 ? String(pet.weight).replace('.', ',') : '',
    microchip: pet.microchip ?? '',
    neutered: pet.neutered == null ? '' : pet.neutered ? 'yes' : 'no',
  }
}

export function PetProfileHeader({ pet }: PetProfileHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsForm, setDetailsForm] = useState<DetailsForm>(() => buildDetailsForm(pet))
  const photoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const { setActiveModal, showToast, updatePetImage, updatePetCoverImage, updatePet } = useApp()

  useEffect(() => {
    if (!detailsOpen) setDetailsForm(buildDetailsForm(pet))
  }, [pet, detailsOpen])

  const statusVariant =
    pet.healthStatus === 'excellent'
      ? 'success'
      : pet.healthStatus === 'good'
        ? 'primary'
        : 'warning'

  const microchipValue = pet.microchip?.trim() ?? ''
  const coverColor = getPetCoverColor(pet)

  const emergencyVet = importantContacts.find((c) => c.type === 'emergency')
  const mainVet = importantContacts.find((c) => c.type === 'vet')
  const emergencyPerson = importantContacts.find((c) => c.type === 'emergency_person')
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
    showToast('Odkaz zkopírován', 'Profil mazlíčka je připraven ke sdílení.', 'gold')
    setTimeout(() => setLinkCopied(false), 2500)
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
            {hasMicrochip(microchipValue) && (
              <Badge variant="gold" size="sm" className="bg-white/95 backdrop-blur-md">
                <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                Ověřený pas
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
                <img src={pet.image} alt={pet.name} className="h-full w-full object-cover" />
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
                <div className="flex flex-row flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold leading-none tracking-tight text-[#191E1B]">
                    {pet.name}
                  </h1>
                  {pet.healthStatus && (
                    <Badge variant={statusVariant} size="sm" withDot pulseDot className="shrink-0">
                      {formatHealthStatus(pet.healthStatus)}
                    </Badge>
                  )}
                  {pet.breedingProfile && (
                    <Badge variant="primary" size="sm" className="shrink-0">
                      Chovný profil
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-[#4A564F] mt-1.5">
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
            <div className="shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                ID mikročipu
              </p>
              {hasMicrochip(microchipValue) ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleCopyChip()
                  }}
                  className="mt-1 flex cursor-pointer items-center gap-1.5 whitespace-nowrap font-mono text-xs font-bold text-[#234B54] hover:underline"
                  title="Klikněte pro zkopírování ID mikročipu"
                >
                  <span>{microchipValue}</span>
                  {copied ? (
                    <Check size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Copy size={12} className="shrink-0 text-[#A3AEA7]" />
                  )}
                </button>
              ) : (
                <p className="mt-1 whitespace-nowrap text-sm font-bold text-[#191E1B]">
                  {EMPTY_PROFILE_LABEL}
                </p>
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

          <div
            className={`mt-4 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${
              pet.breedingProfile
                ? 'border-[#D1E0D8] bg-[#EBF2EE]/70'
                : 'border-[#E8E4DC] bg-white'
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  pet.breedingProfile
                    ? 'border-[#D1E0D8] bg-white text-[#2C4A3E]'
                    : 'border-[#E8E4DC] bg-[#FAF8F5] text-[#7D8B82]'
                }`}
              >
                <HeartHandshake size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#191E1B]">Chovný profil</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#5A6660]">
                  Zapnutím zpřístupníte chovatelské události v kalendáři (hárání, krytí, vrh…).
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(pet.breedingProfile)}
              aria-label={
                pet.breedingProfile
                  ? 'Vypnout chovný profil'
                  : 'Zapnout chovný profil'
              }
              onClick={() => {
                const next = !pet.breedingProfile
                updatePet(pet.id, { breedingProfile: next })
                showToast(
                  next ? 'Chovný profil zapnut' : 'Chovný profil vypnut',
                  next
                    ? 'V kalendáři jsou teď dostupné chovatelské události.'
                    : 'Chovatelské události se v kalendáři skryjí.',
                  'info',
                )
              }}
              className="inline-flex shrink-0 cursor-pointer items-center gap-3 self-stretch rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 transition-colors hover:border-[#D1E0D8] sm:self-auto"
            >
              <span
                className={`text-xs font-bold ${
                  pet.breedingProfile ? 'text-[#2C4A3E]' : 'text-[#7D8B82]'
                }`}
              >
                {pet.breedingProfile ? 'Zapnuto' : 'Vypnuto'}
              </span>
              <span
                aria-hidden
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  pet.breedingProfile ? 'bg-[#2C4A3E]' : 'bg-[#D1D9D4]'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    pet.breedingProfile ? 'left-5' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
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
              onChange={(e) => setDetailsForm((prev) => ({ ...prev, weight: e.target.value }))}
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
                Čip: {hasMicrochip(microchipValue) ? microchipValue : EMPTY_PROFILE_LABEL}
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

      <Modal
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        title="Nouzová karta"
        subtitle="Rychlý přístup k identifikaci a kontaktům při ztrátě nebo akutní situaci"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-[#234B54]/20 bg-[#E0EAEC]/40 p-4">
            <div className="flex items-start gap-4">
              <img src={pet.image} alt={pet.name} className="h-20 w-20 rounded-xl object-cover border-2 border-white" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-[#191E1B]">{pet.name}</p>
                <p className="text-sm text-[#4A564F]">{pet.breed} · {petTypeLabel[pet.type]}</p>
                <p className="text-xs font-mono font-bold text-[#234B54] mt-1">
                  Čip: {hasMicrochip(microchipValue) ? microchipValue : EMPTY_PROFILE_LABEL}
                </p>
                <p className="text-xs text-[#5A6660] mt-1">Majitel: Tereza V. · Kolín</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {emergencyVet && (
              <a
                href={`tel:${emergencyVet.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 hover:bg-white transition-colors"
              >
                <AlertTriangle size={18} className="text-[#B8934A] shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                    {emergencyVet.label}
                  </p>
                  <p className="text-sm font-bold text-[#191E1B]">{emergencyVet.phone}</p>
                </div>
              </a>
            )}
            {mainVet && (
              <a
                href={`tel:${mainVet.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 hover:bg-white transition-colors"
              >
                <Stethoscope size={18} className="text-[#234B54] shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                    {mainVet.label}
                  </p>
                  <p className="text-sm font-bold text-[#191E1B]">{mainVet.name}</p>
                  <p className="text-xs text-[#7D8B82]">{mainVet.phone}</p>
                </div>
              </a>
            )}
            {emergencyPerson && (
              <a
                href={`tel:${emergencyPerson.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 hover:bg-white transition-colors sm:col-span-2"
              >
                <Phone size={18} className="text-[#234B54] shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                    {emergencyPerson.label}
                  </p>
                  <p className="text-sm font-bold text-[#191E1B]">
                    {emergencyPerson.name} · {emergencyPerson.phone}
                  </p>
                </div>
              </a>
            )}
          </div>

          <div className="rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] p-3 text-xs text-[#5A6660] leading-relaxed">
            <p className="font-bold text-[#191E1B] mb-1">Zdravotní poznámky</p>
            <p>
              Alergie: žádné známé · Aktivní léky: dle profilu · Další očkování:{' '}
              {formatOptionalText(pet.nextVaccination)}
            </p>
          </div>

          <Button
            variant="gold"
            fullWidth
            onClick={() => {
              showToast('Nouzová karta sdílena', 'Odkaz s identifikací a kontakty je připraven.', 'gold')
            }}
          >
            Sdílet nouzovou kartu
          </Button>
        </div>
      </Modal>
    </div>
  )
}
