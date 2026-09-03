import {
  ArrowLeft,
  Check,
  Copy,
  AlertTriangle,
  Camera,
  Phone,
  Share2,
  ShieldAlert,
  Sparkles,
  Calendar,
  Stethoscope,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { importantContacts, petTypeLabel } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type { Pet } from '../../types'
import { BRAND_NAME } from '../../lib/brand'
import {
  EMPTY_PROFILE_LABEL,
  formatHealthStatus,
  formatNeuteredStatus,
  formatOptionalAge,
  formatOptionalText,
  formatOptionalWeight,
  hasMicrochip,
} from '../../lib/petProfileDisplay'
import { getPetCoverImage } from '../../lib/petBreedImages'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl } from '../../lib/readImageFile'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface PetProfileHeaderProps {
  pet: Pet
}

export function PetProfileHeader({ pet }: PetProfileHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const { setActiveModal, showToast, updatePetImage } = useApp()

  const statusVariant =
    pet.healthStatus === 'excellent'
      ? 'success'
      : pet.healthStatus === 'good'
        ? 'primary'
        : 'warning'

  const microchipValue = pet.microchip?.trim() ?? ''
  const coverImage = getPetCoverImage(pet)

  const emergencyVet = importantContacts.find((c) => c.type === 'emergency')
  const mainVet = importantContacts.find((c) => c.type === 'vet')
  const emergencyPerson = importantContacts.find((c) => c.type === 'emergency_person')
  const shareLink = `https://lovedandknown.app/pets/${pet.id}?share=verified`

  const handleCopyChip = () => {
    if (!hasMicrochip(microchipValue)) return
    navigator.clipboard?.writeText(microchipValue)
    setCopied(true)
    showToast('Mikročip zkopírován do schránky', microchipValue, 'info')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCopyShareLink = () => {
    navigator.clipboard?.writeText(shareLink)
    setLinkCopied(true)
    showToast('Odkaz zkopírován', 'Profil mazlíčka je připraven ke sdílení.', 'gold')
    setTimeout(() => setLinkCopied(false), 2500)
  }

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingPhoto(true)
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      updatePetImage(pet.id, dataUrl)
      showToast('Profilová fotografie aktualizována', undefined, 'success')
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
      setUploadingPhoto(false)
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
          onClick={() => setActiveModal('addHealthRecord')}
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
        <div className="relative h-48 sm:h-64 lg:h-72 w-full overflow-hidden bg-stone-100">
          <img
            src={coverImage}
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          <div className="absolute top-4 right-4 flex items-center gap-2">
            {hasMicrochip(microchipValue) && (
              <Badge variant="gold" size="sm" className="bg-white/95 backdrop-blur-md">
                <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                Ověřený pas
              </Badge>
            )}
          </div>
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
                  onChange={handlePhotoSelect}
                />
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
                    {pet.name}
                  </h1>
                  {pet.healthStatus && (
                    <Badge variant={statusVariant} size="sm" withDot pulseDot>
                      {formatHealthStatus(pet.healthStatus)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-[#4A564F] mt-0.5">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl bg-[#FAF8F5] p-4 sm:p-5 border border-[#E8E4DC]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Datum narození
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B] flex items-center gap-1">
                <Calendar size={13} className="text-[#234B54]" />
                {formatOptionalText(pet.dateOfBirth)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Věk a stádium
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">
                {formatOptionalAge(pet.age)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Pohlaví
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">{formatOptionalText(pet.gender)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Aktuální hmotnost
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">{formatOptionalWeight(pet.weight)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                ID mikročipu
              </p>
              {hasMicrochip(microchipValue) ? (
                <button
                  onClick={handleCopyChip}
                  className="mt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-[#234B54] hover:underline cursor-pointer"
                  title="Klikněte pro zkopírování ID mikročipu"
                >
                  <span className="truncate max-w-[90px]">{microchipValue}</span>
                  {copied ? (
                    <Check size={12} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Copy size={12} className="text-[#A3AEA7] shrink-0" />
                  )}
                </button>
              ) : (
                <p className="mt-1 text-sm font-bold text-[#7D8B82]">{EMPTY_PROFILE_LABEL}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Kastrace
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">
                {formatNeuteredStatus(pet.neutered)}
              </p>
            </div>
          </div>
        </div>
      </div>

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
