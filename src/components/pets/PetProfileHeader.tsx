import {
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Calendar,
  Share2,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { healthStatusLabel, petTypeLabel } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import type { Pet } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

interface PetProfileHeaderProps {
  pet: Pet
}

export function PetProfileHeader({ pet }: PetProfileHeaderProps) {
  const [copied, setCopied] = useState(false)
  const { setActiveModal, showToast } = useApp()

  const statusVariant =
    pet.healthStatus === 'excellent'
      ? 'success'
      : pet.healthStatus === 'good'
        ? 'primary'
        : 'warning'

  const handleCopyChip = () => {
    navigator.clipboard?.writeText(pet.microchip)
    setCopied(true)
    showToast('Mikročip zkopírován do schránky', pet.microchip, 'info')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShare = () => {
    showToast('Odkaz na profil vytvořen', `Odkaz ke sdílení profilu ${pet.name} je připraven.`, 'gold')
  }

  return (
    <div className="space-y-4">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/pets"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#7D8B82] transition-colors hover:text-[#2C4A3E]"
        >
          <ArrowLeft size={15} />
          Zpět ke všem mazlíčkům
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 size={14} />
            <span>Sdílet</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveModal('addHealthRecord')}
          >
            <ShieldCheck size={14} />
            <span>Přidat zdravotní záznam</span>
          </Button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="overflow-hidden rounded-3xl border border-[#E8E4DC] bg-white shadow-[0_4px_25px_rgba(25,30,27,0.05)]">
        {/* Cover Photo Backdrop */}
        <div className="relative h-48 sm:h-64 lg:h-72 w-full overflow-hidden bg-stone-100">
          <img
            src={pet.image}
            alt={pet.name}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Badge variant="gold" size="sm" className="bg-white/95 backdrop-blur-md">
              <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
              Ověřený pas
            </Badge>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-stone-200 shrink-0">
                <img
                  src={pet.image}
                  alt={pet.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
                    {pet.name}
                  </h1>
                  <Badge variant={statusVariant} size="sm" withDot pulseDot>
                    {healthStatusLabel[pet.healthStatus]}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-[#4A564F] mt-0.5">
                  {pet.breed} · {petTypeLabel[pet.type]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Skóre vitality
                </span>
                <p className="text-lg font-bold text-[#2C4A3E]">
                  {pet.healthScore || 96} / 100
                </p>
              </div>
            </div>
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl bg-[#FAF8F5] p-4 sm:p-5 border border-[#E8E4DC]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Datum narození
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B] flex items-center gap-1">
                <Calendar size={13} className="text-[#2C4A3E]" />
                {pet.dateOfBirth}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Věk a stádium
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">
                {pet.age} let ({pet.age >= 7 ? 'Starší' : 'Dospělý'})
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Pohlaví
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">{pet.gender}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Aktuální hmotnost
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">{pet.weight} kg</p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                ID mikročipu
              </p>
              <button
                onClick={handleCopyChip}
                className="mt-1 flex items-center gap-1.5 text-xs font-mono font-bold text-[#2C4A3E] hover:underline cursor-pointer"
                title="Klikněte pro zkopírování ID mikročipu"
              >
                <span className="truncate max-w-[90px]">{pet.microchip}</span>
                {copied ? (
                  <Check size={12} className="text-emerald-600 shrink-0" />
                ) : (
                  <Copy size={12} className="text-[#A3AEA7] shrink-0" />
                )}
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Kastrace
              </p>
              <p className="mt-1 text-sm font-bold text-[#191E1B]">
                {pet.neutered ? 'Kastrovaný / kastrovaná' : 'Nekastrovaný'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
