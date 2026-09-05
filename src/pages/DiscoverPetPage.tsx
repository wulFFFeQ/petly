import { ArrowLeft, MapPin, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { discoverPets } from '../data/mockData'
import { petTypeLabel } from '../lib/petTypes'

export function DiscoverPetPage() {
  const { petId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useApp()
  const pet = discoverPets.find((item) => item.id === petId)

  if (!pet) {
    return (
      <Card variant="elevated" className="mx-auto max-w-lg text-center">
        <p className="text-sm font-bold text-[#191E1B]">Profil mazlíčka nenalezen</p>
        <p className="mt-1 text-xs text-[#7D8B82]">Tento profil v Objevovat už není dostupný.</p>
        <Button
          variant="primary"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/discover')}
        >
          Zpět na Objevovat
        </Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#5A6660] hover:text-[#234B54] cursor-pointer"
      >
        <ArrowLeft size={14} />
        Zpět
      </button>

      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="relative aspect-[16/10] bg-stone-100">
          <img src={pet.image} alt={pet.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
              {pet.verified && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#2C4A3E]">
                  <ShieldCheck size={14} />
                </span>
              )}
              {pet.popular && (
                <Badge variant="gold" size="sm" className="bg-white/95 text-[#191E1B]">
                  <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                  Oblíbenec
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-white/90">
              {pet.breed} · {petTypeLabel[pet.type]} · {pet.age} let
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#5A6660]">
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin size={13} className="text-[#B8934A]" />
              {pet.location}
              {pet.distance ? ` · ${pet.distance}` : ''}
            </span>
          </div>

          {pet.ownerName && (
            <div className="rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Majitel
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#191E1B]">{pet.ownerName}</p>
            </div>
          )}

          {pet.bio && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                O mazlíčkovi
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#4A564F]">{pet.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                showToast(
                  `Propojeno s ${pet.name}`,
                  pet.ownerName
                    ? `Můžete domluvit schůzku s ${pet.ownerName} ve zprávách.`
                    : 'Nyní můžete domlouvat schůzky ve zprávách.',
                  'gold',
                )
              }
            >
              <MessageCircle size={14} />
              Oslovit majitele
            </Button>
            <Link
              to="/discover"
              className="inline-flex items-center rounded-xl border border-[#E8E4DC] px-3 py-2 text-xs font-semibold text-[#5A6660] hover:bg-[#FAF8F5] transition-colors"
            >
              Zpět na Objevovat
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
