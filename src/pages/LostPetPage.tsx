import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { AlertTriangle, Eye, HeartHandshake, Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { BRAND_NAME } from '../lib/brand'
import {
  buildLostPetPublicView,
  formatCzechDateTime,
  publicBehaviorLabel,
  temperamentLabel,
  temperamentPeopleLabel,
} from '../lib/lostPet'
import { petTypeLabel } from '../lib/petTypes'
import { Button } from '../components/ui/Button'
import { LostPetStatusBadge } from '../components/pets/lost/LostPetStatusBadge'
import { ReportFoundModal } from '../components/pets/lost/ReportFoundModal'
import { ReportSightingModal } from '../components/pets/lost/ReportSightingModal'
import { SafeContactChat } from '../components/pets/lost/SafeContactChat'

export function LostPetPage() {
  const { token = '' } = useParams<{ token: string }>()
  const { pets, getLostAnnouncementByToken } = useApp()
  const [sightingOpen, setSightingOpen] = useState(false)
  const [foundOpen, setFoundOpen] = useState(false)
  const [chatConversationId, setChatConversationId] = useState<string | undefined>()

  const announcement = useMemo(
    () => getLostAnnouncementByToken(token),
    [getLostAnnouncementByToken, token],
  )
  const pet = useMemo(
    () => (announcement ? pets.find((item) => item.id === announcement.petId) : undefined),
    [announcement, pets],
  )
  const view = useMemo(
    () => (pet && announcement ? buildLostPetPublicView(pet, announcement) : null),
    [pet, announcement],
  )

  if (!view || !announcement) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8934A]">{BRAND_NAME}</p>
        <h1 className="mt-4 text-2xl font-bold text-[#191E1B]">Oznámení není dostupná</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5A6660]">
          Tento odkaz nepatří k žádnému aktivnímu oznámení, nebo byl zrušen.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#2C4A3E] hover:underline">
          Zpět na LOVED &amp; KNOWN
        </Link>
      </div>
    )
  }

  const isActive = view.status === 'lost'
  const isFound = view.status === 'found'
  const isClosed = view.status === 'closed'
  const idMeta = [
    view.breed || null,
    petTypeLabel[view.type],
    view.ageLabel,
    view.gender,
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8934A]">
        {BRAND_NAME}
      </p>

      <div className="mt-4 flex justify-center">
        <LostPetStatusBadge status={view.status} size="md" />
      </div>

      <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-[#191E1B] sm:text-3xl">
        {isFound
          ? `${view.name} je doma`
          : isClosed
            ? 'Pátrání ukončeno'
            : 'Ztracený mazlíček'}
      </h1>
      {isFound && (
        <p className="mt-2 text-center text-sm text-[#5A6660]">
          Děkujeme všem, kteří pomohli. Pátrání už není aktivní.
        </p>
      )}
      {isClosed && (
        <p className="mt-2 text-center text-sm text-[#5A6660]">
          Toto oznámení bylo ukončeno. Nová hlášení už nepřijímáme.
        </p>
      )}
      {isActive && (
        <p className="mt-2 text-center text-sm text-[#5A6660]">
          Pokud {view.name} uvidíte nebo najdete, pomozte rychle a bezpečně.
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-3xl border border-[#E8E4DC] bg-white shadow-[0_8px_30px_rgba(25,30,27,0.06)]">
        {isActive && (
          <div className="bg-[#7A1F1F] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            Aktivní pátrání
          </div>
        )}
        <div className="aspect-[4/3] w-full bg-[#EBF2EE]">
          <img src={view.image} alt={view.name} className="h-full w-full object-cover" />
        </div>
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-2xl font-bold text-[#191E1B]">{view.name}</h2>
            <p className="mt-1 text-sm font-medium text-[#4A564F]">{idMeta.join(' · ')}</p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Naposledy viděn (přibližně)
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">{view.lastSeenPublicLabel}</p>
              <p className="text-xs text-[#7D8B82]">{formatCzechDateTime(view.lastSeenAt)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Na jaké jméno slyší
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">
                {view.respondsToName}
                {view.nickname ? ` · přezdívka ${view.nickname}` : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Pokud ho uvidíte
              </p>
              <p className="mt-0.5 font-semibold text-[#191E1B]">
                {publicBehaviorLabel(view.publicBehavior)}
              </p>
            </div>
            {view.possibleAreaPublicLabel && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                  Možná oblast
                </p>
                <p className="mt-0.5 font-semibold text-[#191E1B]">{view.possibleAreaPublicLabel}</p>
              </div>
            )}
          </div>

          {view.importantInstructions && (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                <AlertTriangle size={14} />
                Důležité informace pro nalezení
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-950">
                {view.importantInstructions}
              </p>
            </div>
          )}

          {(view.reactionToPeople || view.reactionToAnimals || view.specialCaution) && (
            <div className="space-y-2 rounded-2xl border border-[#E8E4DC] p-4 text-sm text-[#4A564F]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Bezpečnostní informace
              </p>
              {view.reactionToPeople && (
                <p>Reakce na lidi: {temperamentPeopleLabel(view.reactionToPeople)}</p>
              )}
              {view.reactionToAnimals && (
                <p>Reakce na zvířata: {temperamentLabel(view.reactionToAnimals)}</p>
              )}
              {view.specialCaution && <p>{view.specialCaution}</p>}
            </div>
          )}

          {isActive && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="gap-2 font-bold"
                  onClick={() => setSightingOpen(true)}
                >
                  <Eye size={18} />
                  Viděl/a jsem ho
                </Button>
                <Button
                  type="button"
                  variant="gold"
                  size="lg"
                  className="gap-2 font-bold"
                  onClick={() => setFoundOpen(true)}
                >
                  <HeartHandshake size={18} />
                  Našel/a jsem ho
                </Button>
              </div>
              <div className="grid gap-2 text-[11px] leading-relaxed text-[#7D8B82] sm:grid-cols-2">
                <p className="rounded-xl bg-[#EBF2EE]/80 px-3 py-2">
                  <span className="font-semibold text-[#2C4A3E]">Spatření</span> — nahlásíte místo a
                  čas. Chat se neotevírá, zůstanete anonymní.
                </p>
                <p className="rounded-xl bg-[#FAF4E6]/90 px-3 py-2">
                  <span className="font-semibold text-[#7A6230]">Nález</span> — mazlíček je u vás nebo
                  v bezpečí.
                  {view.allowAppContact
                    ? ' Můžete bezpečně kontaktovat majitele přes aplikaci.'
                    : ' Hlášení se doručí majiteli bez přímého chatu.'}
                </p>
              </div>
            </div>
          )}

          {view.foundContactToken && view.foundContactEnabled && isActive && (
            <Link
              to={`/found/${view.foundContactToken}`}
              className="block text-center text-xs font-semibold text-[#2C4A3E] hover:underline"
            >
              Nebo kontaktujte přes QR stránku mazlíčka
            </Link>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-[#EBF2EE]/70 px-3 py-2 text-xs text-[#4A564F]">
            <Shield size={14} className="mt-0.5 shrink-0 text-[#2C4A3E]" />
            <span>
              Adresa majitele, telefon, e-mail a mikročip se veřejně nezobrazují. Lokalita je vždy
              jen přibližná. Kontakt probíhá anonymně přes {BRAND_NAME}.
            </span>
          </div>
        </div>
      </div>

      {view.allowAppContact && (
        <SafeContactChat
          role="finder"
          announcementId={announcement.id}
          conversationId={chatConversationId}
          className="mt-6"
        />
      )}

      <ReportSightingModal
        open={sightingOpen}
        onClose={() => setSightingOpen(false)}
        announcementId={announcement.id}
        petName={view.name}
      />
      <ReportFoundModal
        open={foundOpen}
        onClose={() => setFoundOpen(false)}
        announcementId={announcement.id}
        petName={view.name}
        allowAppContact={view.allowAppContact}
        onContactOpened={setChatConversationId}
      />
    </div>
  )
}
