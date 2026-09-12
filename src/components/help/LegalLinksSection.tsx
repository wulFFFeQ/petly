import { Link } from 'react-router-dom'
import { FileText, Scale } from 'lucide-react'
import { Card } from '../ui/Card'

export function LegalLinksSection() {
  return (
    <section className="space-y-3" aria-labelledby="legal-links-heading">
      <h2 id="legal-links-heading" className="text-base font-bold text-[#191E1B]">
        Právní texty
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/privacy" className="block">
          <Card variant="elevated" padding="md" hoverable className="h-full">
            <p className="text-sm font-bold text-[#191E1B] flex items-center gap-2">
              <FileText size={16} className="text-[#234B54]" />
              Ochrana osobních údajů
            </p>
            <p className="mt-1.5 text-xs text-[#5A6660] leading-relaxed">
              Návrh Privacy Policy — není právní rada. Placeholdery firmy doplní provozovatel.
            </p>
          </Card>
        </Link>
        <Link to="/terms" className="block">
          <Card variant="elevated" padding="md" hoverable className="h-full">
            <p className="text-sm font-bold text-[#191E1B] flex items-center gap-2">
              <Scale size={16} className="text-[#234B54]" />
              Obchodní podmínky
            </p>
            <p className="mt-1.5 text-xs text-[#5A6660] leading-relaxed">
              Návrh Terms — rozsah služby, DEMO, rezervace, bez P2P plateb a bez provozu klinik/útulků.
            </p>
          </Card>
        </Link>
      </div>
    </section>
  )
}
