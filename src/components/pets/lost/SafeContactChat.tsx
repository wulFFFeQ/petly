import { Heart, MapPin, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import {
  GeolocationRequestError,
  geolocationErrorMessage,
  resolveCurrentLocation,
} from '../../../lib/geolocation'
import {
  FINDER_QUICK_REPLIES,
  OWNER_QUICK_REPLIES,
  buildApproxLocation,
  getOrCreateReporterAnonymousId,
  getVoiceProxyConfig,
} from '../../../lib/lostPet'
import type { SafeContactChannel } from '../../../types'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Input } from '../../ui/Input'
import { Modal } from '../../ui/Modal'

interface SafeContactChatProps {
  role: 'finder' | 'owner'
  announcementId?: string
  conversationId?: string
  channelId?: string
  className?: string
}

export function SafeContactChat({
  role,
  announcementId,
  conversationId,
  channelId,
  className,
}: SafeContactChatProps) {
  const {
    getSafeContactChannel,
    getLostChatThreadForFinder,
    sendLostFinderMessage,
    shareSafeApproxLocation,
    thankSafeContactFinder,
    offerSafeContactPhone,
    respondSafeContactPhoneOffer,
    showToast,
    safeContactChannels,
  } = useApp()

  const finderId = role === 'finder' ? getOrCreateReporterAnonymousId() : undefined

  const channel: SafeContactChannel | undefined = useMemo(() => {
    if (channelId) {
      return safeContactChannels.find((c) => c.id === channelId)
    }
    if (conversationId) {
      return (
        safeContactChannels.find((c) => c.conversationId === conversationId) ||
        getSafeContactChannel(conversationId)
      )
    }
    if (role === 'finder' && announcementId && finderId) {
      return getLostChatThreadForFinder(announcementId, finderId)
    }
    return undefined
  }, [
    channelId,
    conversationId,
    announcementId,
    finderId,
    role,
    safeContactChannels,
    getSafeContactChannel,
    getLostChatThreadForFinder,
  ])

  const [text, setText] = useState('')
  const [locationConsentOpen, setLocationConsentOpen] = useState(false)
  const [sharingLocation, setSharingLocation] = useState(false)
  const [phoneOfferOpen, setPhoneOfferOpen] = useState(false)
  const [offerPhoneValue, setOfferPhoneValue] = useState('')
  const voice = getVoiceProxyConfig()

  if (!channel) return null

  const isClosed = channel.status === 'closed'
  const quickReplies = role === 'finder' ? FINDER_QUICK_REPLIES : OWNER_QUICK_REPLIES
  const placeholder = role === 'finder' ? 'Vaše zpráva...' : 'Zpráva nálezci...'

  const incomingOffer =
    role === 'owner'
      ? channel.contactExchange?.finderOffer
      : channel.contactExchange?.ownerOffer
  const myOffer =
    role === 'owner'
      ? channel.contactExchange?.ownerOffer
      : channel.contactExchange?.finderOffer
  const pendingIncoming =
    incomingOffer && !incomingOffer.acceptedAt && !incomingOffer.declinedAt
  const revealedIncoming = incomingOffer?.acceptedAt ? incomingOffer.phone : null
  const canOfferPhone =
    !isClosed && (!myOffer || !!myOffer.declinedAt)

  const handleSend = (raw: string, kind: 'text' | 'quick_reply' = 'text') => {
    if (!raw.trim() || isClosed) return
    sendLostFinderMessage(channel.conversationId, raw, role, kind)
    setText('')
  }

  const handleShareLocation = async () => {
    setSharingLocation(true)
    try {
      const resolved = await resolveCurrentLocation()
      const approx = await buildApproxLocation(
        resolved.latitude,
        resolved.longitude,
        resolved.label,
      )
      shareSafeApproxLocation(channel.id, {
        publicLabel: approx.publicLabel,
        publicLat: approx.publicLat,
        publicLng: approx.publicLng,
        accuracyNote: 'přibližně 200 m od tohoto místa',
      })
      setLocationConsentOpen(false)
    } catch (error) {
      const code =
        error instanceof GeolocationRequestError ? error.code : 'position_unavailable'
      const message = geolocationErrorMessage(code)
      showToast(message.title, message.description, 'info')
    } finally {
      setSharingLocation(false)
    }
  }

  return (
    <Card variant="elevated" padding="md" className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#B8934A]">
        Bezpečný kontakt · {channel.petName}
      </p>

      {isClosed ? (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-center">
          <p className="text-base font-bold text-emerald-900">Mazlíček je doma. ❤️</p>
          <p className="mt-1 text-sm text-emerald-800/80">Děkujeme, že jste pomohli.</p>
        </div>
      ) : role === 'finder' ? (
        <div className="mt-2 space-y-1 text-sm text-[#4A564F]">
          <p className="font-semibold text-[#191E1B]">Kontakt s majitelem byl navázán.</p>
          <p className="text-xs text-[#7D8B82]">
            Napište majiteli, kde se mazlíček nachází. Telefon se nezobrazí, dokud ho sami
            nenabídnete a druhá strana to neodsouhlasí.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[#7D8B82]">
          Identita nálezce zůstává anonymní, dokud obě strany neodsouhlasí výměnu telefonu.
        </p>
      )}

      {pendingIncoming && (
        <div className="mt-3 rounded-2xl border border-[#E8D8B5] bg-[#FAF4E6] p-3">
          <p className="text-sm font-semibold text-[#191E1B]">
            {role === 'owner'
              ? 'Nálezce nabízí své telefonní číslo'
              : 'Majitel nabízí své telefonní číslo'}
          </p>
          <p className="mt-1 text-xs text-[#7A6230]">
            Číslo uvidíte až po souhlasu. Můžete odmítnout a zůstat u anonymního chatu.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="flex-1"
              onClick={() => respondSafeContactPhoneOffer(channel.id, role, true)}
            >
              Souhlasím a zobrazit číslo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => respondSafeContactPhoneOffer(channel.id, role, false)}
            >
              Ne, zůstat anonymní
            </Button>
          </div>
        </div>
      )}

      {revealedIncoming && (
        <div className="mt-3 rounded-2xl border border-[#D1E0D8] bg-[#EBF2EE] px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
            Telefon {role === 'owner' ? 'nálezce' : 'majitele'}
          </p>
          <a
            href={`tel:${revealedIncoming.replace(/\s/g, '')}`}
            className="mt-0.5 block text-lg font-bold text-[#2C4A3E] hover:underline"
          >
            {revealedIncoming}
          </a>
        </div>
      )}

      {myOffer && !myOffer.declinedAt && !myOffer.acceptedAt && (
        <p className="mt-2 text-xs text-[#7D8B82]">
          Vaše číslo ({myOffer.phone}) čeká na souhlas druhé strany.
        </p>
      )}

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-[#FAF8F5] p-3">
        {channel.messages.map((msg) => {
          if (
            msg.sender === 'system' ||
            msg.kind === 'system' ||
            msg.kind === 'thank_you' ||
            msg.kind === 'contact_offer'
          ) {
            return (
              <div
                key={msg.id}
                className="mx-auto max-w-[90%] rounded-xl bg-white/80 px-3 py-2 text-center text-xs text-[#5A6660]"
              >
                {msg.text}
              </div>
            )
          }
          const mine =
            (role === 'finder' && msg.sender === 'finder') ||
            (role === 'owner' && msg.sender === 'owner')
          return (
            <div
              key={msg.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                mine
                  ? 'ml-6 bg-[#2C4A3E] text-white'
                  : 'mr-6 border border-[#E8E4DC] bg-white text-[#191E1B]'
              }`}
            >
              {msg.kind === 'approx_location' && msg.approxLocation ? (
                <span>
                  📍 {msg.approxLocation.publicLabel}
                  <span
                    className={
                      mine
                        ? 'mt-0.5 block text-xs text-white/80'
                        : 'mt-0.5 block text-xs text-[#7D8B82]'
                    }
                  >
                    {msg.approxLocation.accuracyNote}
                  </span>
                </span>
              ) : (
                msg.text
              )}
            </div>
          )
        })}
      </div>

      {!isClosed && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => handleSend(reply, 'quick_reply')}
                className="cursor-pointer rounded-full border border-[#E8E4DC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4A564F] hover:border-[#D1E0D8] hover:bg-[#EBF2EE]"
              >
                {reply}
              </button>
            ))}
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(text)
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="h-10 flex-1 rounded-xl border border-[#E8E4DC] px-3 text-sm outline-none focus:border-[#2C4A3E]"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!text.trim()}>
              Odeslat
            </Button>
          </form>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {role === 'finder' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setLocationConsentOpen(true)}
              >
                <MapPin size={14} />
                Sdílet přibližnou polohu
              </Button>
            )}
            {canOfferPhone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setPhoneOfferOpen(true)}
              >
                <Phone size={14} />
                Předat telefon
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1 gap-1.5 opacity-70"
              disabled
              title={voice.unavailableReason}
            >
              <Phone size={14} />
              {voice.label}
              <span className="text-[10px] font-normal text-[#7D8B82]">· připraveno</span>
            </Button>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[#A3AEA7]">
            Proxy hovor (bez zobrazení čísla) — zatím nedostupné. Výměna telefonu je dobrovolná a
            vyžaduje souhlas obou stran.
          </p>
        </>
      )}

      {role === 'owner' && !channel.thankYouSentAt && (
        <Button
          type="button"
          variant="gold"
          size="sm"
          className="mt-3 w-full gap-1.5"
          onClick={() => thankSafeContactFinder(channel.id)}
        >
          <Heart size={14} />
          Poděkovat nálezci ❤️
        </Button>
      )}

      {channel.thankYouSentAt && role === 'owner' && (
        <p className="mt-2 text-center text-xs text-[#7D8B82]">Poděkování bylo odesláno.</p>
      )}

      <Modal
        open={locationConsentOpen}
        onClose={() => setLocationConsentOpen(false)}
        title="Sdílet přibližnou polohu"
        subtitle="Majitel neuvidí přesnou adresu"
        maxWidth="sm"
      >
        <p className="text-sm leading-relaxed text-[#4A564F]">
          Sdílíte pouze přibližnou oblast (zaokrouhlenou polohu), například „přibližně 200 m od
          tohoto místa“. Přesná adresa ani GPS domova se neodešlou.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setLocationConsentOpen(false)}>
            Zrušit
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={sharingLocation}
            onClick={() => void handleShareLocation()}
          >
            {sharingLocation ? 'Sdílím…' : 'Souhlasím a sdílet'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={phoneOfferOpen}
        onClose={() => setPhoneOfferOpen(false)}
        title="Předat telefonní číslo"
        subtitle="Druhá strana ho uvidí až po svém souhlasu"
        maxWidth="sm"
      >
        <p className="mb-3 text-sm leading-relaxed text-[#4A564F]">
          Číslo se neodešle automaticky viditelně. Druhá strana musí nejdřív odsouhlasit zobrazení.
        </p>
        <Input
          label="Telefonní číslo"
          type="tel"
          inputMode="tel"
          placeholder="+420 …"
          value={offerPhoneValue}
          onChange={(e) => setOfferPhoneValue(e.target.value)}
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => setPhoneOfferOpen(false)}>
            Zrušit
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              const ok = offerSafeContactPhone(channel.id, role, offerPhoneValue)
              if (ok) {
                setPhoneOfferOpen(false)
                setOfferPhoneValue('')
              }
            }}
          >
            Nabídnout číslo
          </Button>
        </div>
      </Modal>
    </Card>
  )
}
