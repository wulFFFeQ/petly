import { Image, MapPin, Sparkles, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
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
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [taggedPet, setTaggedPet] = useState<Pet | null>(null)
  const [petPickerOpen, setPetPickerOpen] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const petPickerRef = useRef<HTMLDivElement>(null)

  const canPublish = Boolean(text.trim() || imagePreview) && !uploading

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

  const handleTagPetClick = () => {
    if (pets.length === 0) {
      showToast('Žádní mazlíčci', 'Nejdříve přidejte mazlíčka v sekci Moji mazlíčci.', 'info')
      return
    }
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
    })
    setText('')
    setImagePreview(null)
    setTaggedPet(null)
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

            {taggedPet && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#D1E0D8] bg-[#EBF2EE] px-2.5 py-1 text-[11px] font-semibold text-[#2C4A3E]">
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
            <button
              type="button"
              onClick={() => showToast('Lokalita nastavena', 'Označen psí park v Kolíně.', 'info')}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-[#5A6660] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
            >
              <MapPin size={14} className="text-[#B8934A]" />
              <span className="hidden sm:inline">Lokalita</span>
            </button>

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
