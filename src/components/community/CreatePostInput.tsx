import { Image, MapPin, Sparkles, Send } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function CreatePostInput() {
  const { showToast } = useApp()
  const [text, setText] = useState('')

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    showToast('Příspěvek publikován v komunitě', 'Váš příběh o mazlíčkovi je nyní viditelný v komunitě.', 'gold')
    setText('')
  }

  return (
    <Card variant="elevated" padding="md">
      <form onSubmit={handleShare}>
        <div className="flex items-start gap-3.5">
          <Avatar
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=85"
            alt="Tereza"
            size="md"
            goldRing
          />
          <div className="flex-1">
            <textarea
              placeholder="Podělte se o dobrodružství, veterinární tip nebo příběh s ostatními majiteli mazlíčků..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full text-sm text-[#191E1B] placeholder:text-[#A3AEA7] outline-none resize-none bg-transparent"
            />
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#F0EDE6] flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => showToast('Výběr fotografie připraven', 'Nahrajte fotografii mazlíčka ve formátu JPG nebo PNG.', 'info')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A564F] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
            >
              <Image size={15} className="text-[#2C4A3E]" />
              <span className="hidden sm:inline">Fotografie</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Lokalita nastavena', 'Označen psí park v Kolíně.', 'info')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A564F] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
            >
              <MapPin size={15} className="text-[#B8934A]" />
              <span className="hidden sm:inline">Lokalita</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Označení mazlíčka', 'Označena Luna, zlatý retrívr.', 'info')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A564F] hover:bg-[#FAF8F5] hover:text-[#2C4A3E] transition-colors cursor-pointer"
            >
              <Sparkles size={15} className="text-amber-600" />
              <span className="hidden sm:inline">Označit mazlíčka</span>
            </button>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!text.trim()}
            variant="primary"
            className="gap-1.5 shadow-sm"
          >
            <span>Publikovat</span>
            <Send size={13} />
          </Button>
        </div>
      </form>
    </Card>
  )
}
