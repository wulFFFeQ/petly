import { Image, LocateFixed, MapPin, Sparkles, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { COMMUNITY_SELF_AVATAR } from '../../lib/community'
import {
  GeolocationRequestError,
  geolocationErrorMessage,
  resolveCurrentLocation,
  searchPlaces,
  type PlaceSuggestion,
} from '../../lib/geolocation'
import { PET_IMAGE_ACCEPT, readImageFileAsDataUrl, takeSelectedFiles } from '../../lib/readImageFile'
import { cn } from '../../lib/utils'
import type { Pet } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

function formatPetTag(pet: Pet) {
  return `${pet.name} · ${pet.breed}`
}

export function CreatePostInput() {
  const { showToast, addCommunityPost, pets } = useApp()
  const locationListId = useId()
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [taggedPet, setTaggedPet] = useState<Pet | null>(null)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locationCoords, setLocationCoords] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([])
  const [locationSearchStatus, setLocationSearchStatus] = useState<
    'idle' | 'loading' | 'empty' | 'error'
  >('idle')
  const [locating, setLocating] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const petPickerRef = useRef<HTMLDivElement>(null)
  const locationPickerRef = useRef<HTMLDivElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)

  const publicPets = pets.filter((pet) => pet.publicDiscover)
  const canPublish = Boolean(text.trim() || imagePreview) && !uploading && !locating

  useEffect(() => {
    if (!petPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (petPickerRef.current && !petPickerRef.current.contains(event.target as Node)) {
        setPetPickerOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPetPickerOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [petPickerOpen])

  useEffect(() => {
    if (!locationPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (
        locationPickerRef.current &&
        !locationPickerRef.current.contains(event.target as Node)
      ) {
        setLocationPickerOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLocationPickerOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [locationPickerOpen])

  useEffect(() => {
    if (!locationPickerOpen) return
    const id = window.setTimeout(() => locationInputRef.current?.focus(), 0)
    return () => window.clearTimeout(id)
  }, [locationPickerOpen])

  useEffect(() => {
    if (!locationPickerOpen) return

    const query = locationQuery.trim()
    if (query.length < 2) {
      setLocationSuggestions([])
      setLocationSearchStatus('idle')
      return
    }

    let cancelled = false
    setLocationSearchStatus('loading')
    const timer = window.setTimeout(() => {
      void searchPlaces(query)
        .then((results) => {
          if (cancelled) return
          setLocationSuggestions(results)
          setLocationSearchStatus(results.length === 0 ? 'empty' : 'idle')
        })
        .catch(() => {
          if (cancelled) return
          setLocationSuggestions([])
          setLocationSearchStatus('error')
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [locationPickerOpen, locationQuery])

  useEffect(() => {
    if (!taggedPet) return
    const current = pets.find((pet) => pet.id === taggedPet.id)
    if (!current?.publicDiscover) setTaggedPet(null)
  }, [pets, taggedPet])

  const selectLocation = (
    label: string,
    coords?: { latitude: number; longitude: number } | null,
  ) => {
    setLocationLabel(label)
    setLocationCoords(coords ?? null)
    setLocationPickerOpen(false)
    setLocationQuery('')
    setLocationSuggestions([])
  }

  const clearLocation = () => {
    setLocationLabel(null)
    setLocationCoords(null)
  }

  const handleUseCurrentLocation = async () => {
    if (locating) return

    setLocating(true)
    try {
      const resolved = await resolveCurrentLocation()
      selectLocation(resolved.label, {
        latitude: resolved.latitude,
        longitude: resolved.longitude,
      })
    } catch (error) {
      const code =
        error instanceof GeolocationRequestError ? error.code : 'position_unavailable'
      const message = geolocationErrorMessage(code)
      showToast(message.title, message.description, 'info')
    } finally {
      setLocating(false)
    }
  }

  const handleTagPetClick = () => {
    if (pets.length === 0) {
      showToast('Žádní mazlíčci', 'Nejdříve přidejte mazlíčka v sekci Moji mazlíčci.', 'info')
      return
    }
    if (publicPets.length === 0) {
      showToast(
        'Žádný veřejný mazlíček',
        'Označit ve feedu lze jen mazlíčky s veřejným profilem Objevovat.',
        'info',
      )
      return
    }
    setLocationPickerOpen(false)
    setPetPickerOpen((open) => !open)
  }

  const selectPet = (pet: Pet) => {
    if (!pet.publicDiscover) {
      showToast(
        'Mazlíček není veřejný',
        'Nejdříve zapněte veřejný profil Objevovat u tohoto mazlíčka.',
        'info',
      )
      return
    }
    setTaggedPet(pet)
    setPetPickerOpen(false)
  }

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPublish) return
    addCommunityPost({
      text: text.trim(),
      image: imagePreview ?? undefined,
      petTag: taggedPet ? formatPetTag(taggedPet) : undefined,
      petId: taggedPet?.id,
      location: locationLabel ?? undefined,
      locationLat: locationCoords?.latitude,
      locationLng: locationCoords?.longitude,
    })
    setText('')
    setImagePreview(null)
    setTaggedPet(null)
    setLocationLabel(null)
    setLocationCoords(null)
    setLocationPickerOpen(false)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = takeSelectedFiles(e.target)
    const file = files[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      setImagePreview(dataUrl)
    } catch {
      showToast('Fotografie se nepodařilo načíst', undefined, 'info')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card variant="default" padding="sm" className="border-[#E8E4DC]/80">
      <form onSubmit={handleShare}>
        <div className="flex items-start gap-3">
          <Avatar src={COMMUNITY_SELF_AVATAR} alt="Vy" size="sm" goldRing />
          <div className="flex-1 min-w-0">
            <textarea
              placeholder="Podělte se o dobrodružství, veterinární tip nebo příběh s ostatními majiteli mazlíčků..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full text-sm leading-relaxed text-[#191E1B] placeholder:text-[#A3AEA7] outline-none resize-none bg-transparent"
            />

            {(taggedPet || locationLabel) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {taggedPet && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D1E0D8] bg-[#EBF2EE] px-2.5 py-1 text-[11px] font-semibold text-[#2C4A3E]">
                    <Sparkles size={11} className="text-amber-600" />
                    <span>{formatPetTag(taggedPet)}</span>
                    <button
                      type="button"
                      onClick={() => setTaggedPet(null)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-white/70 cursor-pointer"
                      aria-label="Zrušit označení mazlíčka"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
                {locationLabel && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8D9B8] bg-[#FBF6EC] px-2.5 py-1 text-[11px] font-semibold text-[#8A6A2E]">
                    <MapPin size={11} className="text-[#B8934A]" />
                    <span>{locationLabel}</span>
                    <button
                      type="button"
                      onClick={clearLocation}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-white/70 cursor-pointer"
                      aria-label="Odebrat lokalitu"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {imagePreview && (
              <div className="relative mt-2 flex justify-center overflow-hidden rounded-xl bg-stone-100 ring-1 ring-[#E8E4DC]/70">
                <img
                  src={imagePreview}
                  alt="Náhled příspěvku"
                  className="h-auto w-auto max-h-56 max-w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow-sm cursor-pointer"
                  aria-label="Odebrat fotografii"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EDE6]/80 pt-3">
          <div className="flex flex-wrap items-center gap-1">
            <input
              ref={photoInputRef}
              type="file"
              accept={PET_IMAGE_ACCEPT}
              className="hidden"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#5A6660] transition-colors hover:bg-[#FAF8F5] hover:text-[#191E1B] cursor-pointer disabled:opacity-50"
            >
              <Image size={14} />
              Foto
            </button>

            <div ref={petPickerRef} className="relative">
              <button
                type="button"
                onClick={handleTagPetClick}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer',
                  taggedPet
                    ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                    : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#191E1B]',
                )}
              >
                <Sparkles size={14} />
                Mazlíček
              </button>
              {petPickerOpen && (
                <div
                  role="listbox"
                  aria-label="Vyberte veřejného mazlíčka"
                  className="absolute left-0 bottom-full z-30 mb-1.5 w-64 overflow-hidden rounded-xl border border-[#E8E4DC] bg-white py-1 shadow-[0_12px_32px_rgba(25,30,27,0.1)]"
                >
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Veřejní mazlíčci
                  </p>
                  {publicPets.map((pet) => {
                    const selected = taggedPet?.id === pet.id
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => selectPet(pet)}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer',
                          selected ? 'bg-[#EBF2EE]' : 'hover:bg-[#FAF8F5]',
                        )}
                      >
                        <Avatar src={pet.image} alt={pet.name} size="xs" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#191E1B]">
                            {pet.name}
                          </p>
                          <p className="truncate text-[10px] text-[#7D8B82]">{pet.breed}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div ref={locationPickerRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setPetPickerOpen(false)
                  setLocationPickerOpen((open) => !open)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer',
                  locationLabel
                    ? 'bg-[#FBF6EC] text-[#8A6A2E]'
                    : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#191E1B]',
                )}
              >
                <MapPin size={14} />
                Lokalita
              </button>
              {locationPickerOpen && (
                <div className="absolute left-0 bottom-full z-30 mb-1.5 w-72 overflow-hidden rounded-xl border border-[#E8E4DC] bg-white p-2 shadow-[0_12px_32px_rgba(25,30,27,0.1)]">
                  <input
                    ref={locationInputRef}
                    list={locationListId}
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    placeholder="Hledat místo…"
                    className="w-full rounded-lg border border-[#E8E4DC] px-2.5 py-2 text-xs outline-none focus:border-[#2C4A3E]"
                  />
                  <datalist id={locationListId}>
                    {locationSuggestions.map((place) => (
                      <option key={place.id} value={place.label} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => void handleUseCurrentLocation()}
                    disabled={locating}
                    className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#2C4A3E] hover:bg-[#EBF2EE] cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed size={14} />
                    {locating ? 'Zjišťuji polohu…' : 'Použít aktuální polohu'}
                  </button>
                  {locationSearchStatus === 'loading' && (
                    <p className="px-2.5 py-1.5 text-[10px] text-[#7D8B82]">Hledám…</p>
                  )}
                  {locationSearchStatus === 'empty' && (
                    <p className="px-2.5 py-1.5 text-[10px] text-[#7D8B82]">Nic nenalezeno</p>
                  )}
                  {locationSuggestions.length > 0 && (
                    <div className="mt-1 max-h-40 overflow-y-auto">
                      {locationSuggestions.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() =>
                            selectLocation(place.label, {
                              latitude: place.latitude,
                              longitude: place.longitude,
                            })
                          }
                          className="flex w-full px-2.5 py-2 text-left text-xs hover:bg-[#FAF8F5] cursor-pointer"
                        >
                          {place.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!canPublish}
            variant="primary"
            className="gap-1.5 shrink-0"
          >
            <span>Publikovat</span>
            <Send size={13} />
          </Button>
        </div>
      </form>
    </Card>
  )
}
