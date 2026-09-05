import { Image, LocateFixed, MapPin, Sparkles, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
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

    const trimmed = locationQuery.trim()
    if (trimmed.length < 2) {
      setLocationSuggestions([])
      setLocationSearchStatus('idle')
      return
    }

    const controller = new AbortController()
    setLocationSearchStatus('loading')

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchPlaces(trimmed, controller.signal)
          if (controller.signal.aborted) return
          setLocationSuggestions(results)
          setLocationSearchStatus(results.length === 0 ? 'empty' : 'idle')
        } catch (error) {
          if (controller.signal.aborted) return
          if (error instanceof DOMException && error.name === 'AbortError') return
          setLocationSuggestions([])
          setLocationSearchStatus('error')
        }
      })()
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [locationQuery, locationPickerOpen])

  const handlePhotoClick = () => {
    photoInputRef.current?.click()
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = takeSelectedFiles(event.currentTarget)
    if (!file) return

    setUploading(true)
    try {
      const dataUrl = await readImageFileAsDataUrl(file)
      setImagePreview(dataUrl)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'read_failed'
      if (reason === 'unsupported_type') {
        showToast('Nepodporovaný formát', 'Použijte JPG, PNG, WEBP nebo GIF.', 'info')
      } else if (reason === 'too_large') {
        showToast('Soubor je příliš velký', 'Maximální velikost je 25 MB.', 'info')
      } else {
        showToast('Nahrání se nezdařilo', 'Zkuste to prosím znovu.', 'info')
      }
    } finally {
      setUploading(false)
    }
  }

  const openLocationPicker = () => {
    setPetPickerOpen(false)
    setLocationQuery('')
    setLocationSuggestions([])
    setLocationSearchStatus('idle')
    setLocationPickerOpen((open) => !open)
  }

  const selectLocation = (label: string) => {
    setLocationLabel(label)
    setLocationPickerOpen(false)
    setLocationQuery('')
    setLocationSuggestions([])
    setLocationSearchStatus('idle')
    showToast('Lokalita nastavena', label, 'info')
  }

  const handleUseCurrentLocation = async () => {
    if (locating) return

    setLocating(true)
    try {
      const resolved = await resolveCurrentLocation()
      selectLocation(resolved.label)
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
    setLocationPickerOpen(false)
    setPetPickerOpen((open) => !open)
  }

  const selectPet = (pet: Pet) => {
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
      location: locationLabel ?? undefined,
    })
    setText('')
    setImagePreview(null)
    setTaggedPet(null)
    setLocationLabel(null)
    setLocationPickerOpen(false)
  }

  return (
    <Card variant="default" padding="sm" className="border-[#E8E4DC]/80">
      <form onSubmit={handleShare}>
        <div className="flex items-start gap-3">
          <Avatar
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85"
            alt="Tereza"
            size="sm"
            goldRing
          />
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
                      onClick={() => setLocationLabel(null)}
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
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#191E1B]/70 text-white hover:bg-[#191E1B]/90 cursor-pointer"
                  aria-label="Odstranit fotografii"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept={PET_IMAGE_ACCEPT}
          className="sr-only"
          onChange={handlePhotoChange}
        />

        <div className="mt-2.5 pt-2.5 border-t border-[#F0EDE6]/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Image size={14} className="text-[#2C4A3E]" />
              <span className="hidden sm:inline">
                {uploading ? 'Nahrávám…' : 'Fotografie'}
              </span>
            </button>

            <div ref={locationPickerRef} className="relative">
              <button
                type="button"
                onClick={openLocationPicker}
                aria-expanded={locationPickerOpen}
                aria-haspopup="listbox"
                aria-controls={locationListId}
                aria-pressed={Boolean(locationLabel)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                  locationLabel || locationPickerOpen
                    ? 'bg-[#FBF6EC] text-[#8A6A2E]'
                    : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#2C4A3E]',
                )}
              >
                <MapPin size={14} className="text-[#B8934A]" />
                <span className="hidden sm:inline">Lokalita</span>
              </button>

              {locationPickerOpen && (
                <div
                  id={locationListId}
                  className="absolute left-0 bottom-full z-30 mb-1.5 w-72 overflow-hidden rounded-xl border border-[#E8E4DC] bg-white shadow-[0_12px_32px_rgba(25,30,27,0.1)]"
                >
                  <div className="border-b border-[#F0EDE6] p-2">
                    <label className="sr-only" htmlFor={`${locationListId}-search`}>
                      Hledat lokalitu
                    </label>
                    <input
                      ref={locationInputRef}
                      id={`${locationListId}-search`}
                      type="search"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Napište místo (např. Kolín)…"
                      autoComplete="off"
                      className="w-full rounded-lg border border-[#E8E4DC] bg-[#FAF8F5] px-2.5 py-2 text-xs text-[#191E1B] outline-none placeholder:text-[#A3AEA7] focus:border-[#D1E0D8]"
                    />
                    <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-[#7D8B82]">
                      Vyberte místo ze seznamu — vlastní text nestačí.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleUseCurrentLocation()}
                    disabled={locating}
                    className="flex w-full items-center gap-2.5 border-b border-[#F0EDE6] px-3 py-2.5 text-left transition-colors hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed size={14} className="shrink-0 text-[#B8934A]" />
                    <span className="text-xs font-semibold text-[#191E1B]">
                      {locating ? 'Zjišťuji polohu…' : 'Použít aktuální polohu'}
                    </span>
                  </button>

                  <div role="listbox" aria-label="Nalezené lokality" className="max-h-52 overflow-y-auto py-1">
                    {locationSearchStatus === 'loading' && (
                      <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">Hledám místa…</p>
                    )}
                    {locationSearchStatus === 'empty' && (
                      <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">
                        Nic jsme nenašli. Zkuste jiné znění.
                      </p>
                    )}
                    {locationSearchStatus === 'error' && (
                      <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">
                        Vyhledávání se nezdařilo. Zkuste to znovu.
                      </p>
                    )}
                    {locationSearchStatus === 'idle' &&
                      locationQuery.trim().length < 2 &&
                      locationSuggestions.length === 0 && (
                        <p className="px-3 py-2.5 text-[11px] text-[#7D8B82]">
                          Začněte psát název města, parku nebo adresy.
                        </p>
                      )}
                    {locationSuggestions.map((place) => {
                      const selected = locationLabel === place.label
                      return (
                        <button
                          key={place.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => selectLocation(place.label)}
                          className={cn(
                            'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer',
                            selected ? 'bg-[#FBF6EC]' : 'hover:bg-[#FAF8F5]',
                          )}
                        >
                          <MapPin size={14} className="mt-0.5 shrink-0 text-[#B8934A]" />
                          <span className="min-w-0 text-xs font-medium text-[#191E1B]">
                            {place.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div ref={petPickerRef} className="relative">
              <button
                type="button"
                onClick={handleTagPetClick}
                aria-expanded={petPickerOpen}
                aria-haspopup="listbox"
                className={cn(
                  'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                  taggedPet || petPickerOpen
                    ? 'bg-[#EBF2EE] text-[#2C4A3E]'
                    : 'text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#2C4A3E]',
                )}
              >
                <Sparkles size={14} className="text-amber-600" />
                <span className="hidden sm:inline">
                  {taggedPet ? taggedPet.name : 'Označit mazlíčka'}
                </span>
              </button>

              {petPickerOpen && (
                <div
                  role="listbox"
                  aria-label="Vyberte mazlíčka"
                  className="absolute left-0 bottom-full z-30 mb-1.5 w-64 overflow-hidden rounded-xl border border-[#E8E4DC] bg-white py-1 shadow-[0_12px_32px_rgba(25,30,27,0.1)]"
                >
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                    Vaši mazlíčci
                  </p>
                  {pets.map((pet) => {
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
