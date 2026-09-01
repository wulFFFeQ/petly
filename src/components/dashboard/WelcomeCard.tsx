import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function WelcomeCard() {
  return (
    <Card padding="none" variant="elevated" className="relative overflow-hidden group">
      {/* Subtle decorative background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/40 z-10 pointer-events-none md:w-3/5" />

      <div className="flex flex-col md:flex-row min-h-[220px]">
        {/* Left Column Content */}
        <div className="relative z-20 flex flex-1 flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="gold" size="sm">
                <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
                Kompletní péče PETLY
              </Badge>
              <span className="text-xs font-semibold text-[#7D8B82] tracking-wider uppercase">
                Rodinné centrum
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#191E1B] font-sans leading-tight">
              Vaši mazlíčci, <span className="font-serif italic font-normal text-[#2C4A3E]">vše na jednom místě.</span>
            </h2>

            <p className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-[#4A564F]">
              Sledujte jejich zdraví, rutiny, vzpomínky a každodenní život díky veterinárním záznamům a plánům péče.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-[#F0EDE6]">
            <div className="flex items-center gap-1.5 text-xs text-[#2C4A3E] font-medium bg-[#EBF2EE] px-3 py-1.5 rounded-full">
              <ShieldCheck size={14} className="text-[#2C4A3E]" />
              <span>Stav očkování ověřen</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#4A564F] font-medium bg-[#FAF8F5] px-3 py-1.5 rounded-full border border-[#E8E4DC]">
              <HeartHandshake size={14} className="text-[#B8934A]" />
              <span>3 aktivní mazlíčci</span>
            </div>
            <Link to="/pets" className="ml-auto">
              <Button variant="ghost" size="sm" className="gap-1.5 text-[#2C4A3E] font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Zobrazit všechny mazlíčky</span>
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column Image */}
        <div className="relative h-56 md:h-auto md:w-2/5 lg:w-[42%] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=1200&q=85"
            alt="Zlatý retrívr a kočka spolu odpočívají"
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:hidden" />
        </div>
      </div>
    </Card>
  )
}
