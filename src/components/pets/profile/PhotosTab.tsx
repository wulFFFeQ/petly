import { Plus } from 'lucide-react'
import { PET_IMAGE_ACCEPT } from '../../../lib/readImageFile'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import type { PetProfileTabState } from './usePetProfileTabState'

type PhotosTabProps = PetProfileTabState['photos']

export function PhotosTab({
  pet,
  photos,
  galleryUploading,
  galleryFileInputRef,
  handleGalleryUpload,
  setGalleryIndex,
}: PhotosTabProps) {
  return (
    <Card variant="elevated">
      <input
        ref={galleryFileInputRef}
        type="file"
        accept={PET_IMAGE_ACCEPT}
        multiple
        className="sr-only"
        disabled={galleryUploading}
        onChange={handleGalleryUpload}
      />

      <div className="mb-6 pb-4 border-b border-[#F0EDE6] flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#191E1B]">Fotografické vzpomínky a milníky</h3>
          <p className="text-xs text-[#7D8B82] mt-0.5">
            Full-screen galerie · upravit popisek nebo smazat fotografii
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={galleryUploading}
          onClick={() => galleryFileInputRef.current?.click()}
        >
          <Plus size={14} />
          {galleryUploading ? 'Nahrávám…' : 'Nahrát fotografii'}
        </Button>
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          disabled={galleryUploading}
          onClick={() => galleryFileInputRef.current?.click()}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D1E0D8] bg-[#FAF8F5] px-6 py-12 text-center transition-colors hover:border-[#2C4A3E] hover:bg-[#EBF2EE]',
            galleryUploading && 'pointer-events-none opacity-60',
          )}
        >
          <Plus size={22} className="text-[#2C4A3E]" />
          <div>
            <p className="text-sm font-bold text-[#191E1B]">
              {galleryUploading ? 'Nahrávám fotografii…' : 'Přidejte první fotografii'}
            </p>
            <p className="mt-1 text-xs text-[#7D8B82]">
              Klepněte sem a vyberte JPG, PNG, WEBP nebo GIF (do 25 MB)
            </p>
          </div>
        </button>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              onClick={() => setGalleryIndex(i)}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-100 cursor-pointer shadow-xs border border-[#E8E4DC]"
            >
              <img
                src={photo.url}
                alt={photo.caption || `${pet.name} – fotografie ${i + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-[10px] font-medium text-white truncate">
                  {photo.caption || 'Bez popisku'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
