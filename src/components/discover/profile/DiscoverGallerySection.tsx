import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { DiscoverPublicPhoto } from '../../../types'
import { Button } from '../../ui/Button'
import { DiscoverProfileSection } from './DiscoverProfileSection'

interface DiscoverGallerySectionProps {
  photos: DiscoverPublicPhoto[]
  petName: string
}

const PREVIEW_COUNT = 4

export function DiscoverGallerySection({ photos, petName }: DiscoverGallerySectionProps) {
  const [showAll, setShowAll] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!photos.length) {
    return (
      <DiscoverProfileSection
        title="Galerie"
        icon={<Camera size={14} className="text-[#B8934A]" />}
      >
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E8E4DC] bg-[#FAF8F5] px-4 py-8 text-center"
          data-testid="discover-gallery-empty"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#B8934A] shadow-sm">
            <Camera size={18} />
          </span>
          <p className="mt-3 text-sm font-semibold text-[#191E1B]">Zatím bez veřejné galerie</p>
          <p className="mt-1 max-w-xs text-xs text-[#7D8B82]">
            Majitel zatím nesdílí další fotografie tohoto mazlíčka.
          </p>
        </div>
      </DiscoverProfileSection>
    )
  }

  const visible = showAll ? photos : photos.slice(0, PREVIEW_COUNT)
  const hasMore = photos.length > PREVIEW_COUNT

  return (
    <>
      <DiscoverProfileSection
        title="Galerie"
        icon={<Camera size={14} className="text-[#B8934A]" />}
        action={
          hasMore ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[11px] font-semibold text-[#2C4A3E] hover:underline cursor-pointer"
            >
              {showAll ? 'Zobrazit méně' : `Celá galerie (${photos.length})`}
            </button>
          ) : undefined
        }
      >
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          data-testid="discover-gallery-grid"
        >
          {visible.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIndex(showAll ? index : index)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-stone-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4A3E]/40"
            >
              <img
                src={photo.url}
                alt={photo.caption || `${petName} — foto ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {photo.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1.5 text-left text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.caption}
                </span>
              )}
            </button>
          ))}
        </div>
        {hasMore && !showAll && (
          <div className="mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
              Otevřít kompletní veřejnou galerii
            </Button>
          </div>
        )}
      </DiscoverProfileSection>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#171B18]/90 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-medium">
              {photos[lightboxIndex]?.caption || `${petName} · ${lightboxIndex + 1} / ${photos.length}`}
            </p>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="rounded-lg p-2 hover:bg-white/10 cursor-pointer"
              aria-label="Zavřít"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center px-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || petName}
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
          {photos.length > 1 && (
            <div className="flex justify-center gap-2 pb-6">
              <Button
                variant="secondary"
                size="sm"
                disabled={lightboxIndex === 0}
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
                }}
              >
                Předchozí
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={lightboxIndex >= photos.length - 1}
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIndex((i) =>
                    i !== null && i < photos.length - 1 ? i + 1 : i,
                  )
                }}
              >
                Další
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
