import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { BRAND_NAME } from '../lib/brand'
import {
  buildEmergencyCardPublicView,
  findPetByEmergencySlug,
} from '../lib/emergencyCard'
import { findActiveAnnouncementForPet } from '../lib/lostPet'
import { EmergencyCardPublicBody } from '../components/pets/emergency/EmergencyCardPublicBody'
import { ReportFoundModal } from '../components/pets/lost/ReportFoundModal'
import { ReportSightingModal } from '../components/pets/lost/ReportSightingModal'
import { SafeContactChat } from '../components/pets/lost/SafeContactChat'

export function EmergencyPetPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { pets, lostAnnouncements, submitEmergencySafeContact } = useApp()
  const [sightingOpen, setSightingOpen] = useState(false)
  const [foundOpen, setFoundOpen] = useState(false)
  const [chatConversationId, setChatConversationId] = useState<string | undefined>()
  const [contactBusy, setContactBusy] = useState(false)

  const pet = useMemo(() => findPetByEmergencySlug(pets, slug), [pets, slug])
  const activeLost = useMemo(
    () => (pet ? findActiveAnnouncementForPet(lostAnnouncements, pet.id) ?? null : null),
    [pet, lostAnnouncements],
  )
  const view = useMemo(
    () => (pet ? buildEmergencyCardPublicView(pet, { activeLostAnnouncement: activeLost }) : null),
    [pet, activeLost],
  )

  const handleContactOwner = () => {
    if (!pet || !view?.contactEnabled) return
    setContactBusy(true)
    try {
      const result = submitEmergencySafeContact(pet.id, {
        kind: 'contact',
        message: `Někdo se pokusil kontaktovat vás kvůli ${pet.name} přes nouzovou kartu.`,
      })
      if (result) {
        setChatConversationId(result.conversationId)
      }
    } finally {
      setContactBusy(false)
    }
  }

  if (!view || !pet) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B8934A]">{BRAND_NAME}</p>
        <h1 className="mt-4 text-2xl font-bold text-[#191E1B]">Karta není dostupná</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#5A6660]">
          Tento odkaz nepatří k žádné nouzové kartě, nebo byl zrušen.
        </p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-[#2C4A3E] hover:underline">
          Zpět na LOVED &amp; KNOWN
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8934A]">
        {BRAND_NAME}
      </p>
      <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-[#191E1B] sm:text-3xl">
        Nouzová karta
      </h1>
      <p className="mt-2 text-center text-sm text-[#5A6660]">
        Bezpečné informace pro nálezce — bez registrace
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl border border-[#E8E4DC] bg-white p-5 shadow-[0_8px_30px_rgba(25,30,27,0.06)] sm:p-6">
        <EmergencyCardPublicBody
          view={view}
          contactBusy={contactBusy}
          onContactOwner={handleContactOwner}
          onReportSighting={
            view.isLost && view.lost ? () => setSightingOpen(true) : undefined
          }
          onReportFound={
            view.isLost && view.lost ? () => setFoundOpen(true) : undefined
          }
        />
      </div>

      <SafeContactChat
        role="finder"
        announcementId={view.lost?.announcementId}
        conversationId={chatConversationId}
        className="mt-6"
      />

      {view.lost && (
        <>
          <ReportSightingModal
            open={sightingOpen}
            onClose={() => setSightingOpen(false)}
            announcementId={view.lost.announcementId}
            petName={view.name}
          />
          <ReportFoundModal
            open={foundOpen}
            onClose={() => setFoundOpen(false)}
            announcementId={view.lost.announcementId}
            petName={view.name}
            onContactOpened={setChatConversationId}
          />
        </>
      )}
    </div>
  )
}
