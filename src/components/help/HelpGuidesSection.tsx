import { BookOpen } from 'lucide-react'
import { Card } from '../ui/Card'
import { BRAND_NAME } from '../../lib/brand'

const FAQ_ITEMS = [
  {
    q: 'Jak přidám mezinárodní očkovací certifikáty do profilu mazlíčka?',
    a: 'Přejděte do Moji mazlíčci > vyberte mazlíčka > záložka Dokumenty. Můžete nahrát naskenované veterinární PDF certifikáty nebo fotografie fyzického pasu.',
  },
  {
    q: 'Jak funguje automatický odpočet do dalšího očkování?',
    a: `Když zaznamenáte posilovací dávku s budoucím termínem, ${BRAND_NAME} vypočítá zbývající dny a automaticky naplánuje připomínku do kalendáře.`,
  },
  {
    q: 'Mohu exportovat zdravotní záznamy pro nového veterináře?',
    a: 'Ano, v hlavičce profilu mazlíčka klikněte na tlačítko „Sdílet“ nebo „Dokumenty“ a exportujte kompletní ověřený zdravotní souhrn.',
  },
  {
    q: 'Jak se spojím s majiteli mazlíčků v okolí v sekci Objevovat?',
    a: 'Procházejte záložku Objevovat s filtrem podle vašeho regionu, klikněte na „Pozdravit a spojit se“ a začněte konverzaci v sekci Zprávy.',
  },
] as const

export function HelpGuidesSection() {
  return (
    <div>
      <h3 className="text-base font-bold text-[#191E1B] mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-[#234B54]" />
        <span>Často kladené otázky</span>
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {FAQ_ITEMS.map((faq, i) => (
          <Card key={i} variant="elevated">
            <h4 className="text-sm font-bold text-[#191E1B] flex items-start gap-2">
              <BookOpen size={16} className="text-[#234B54] shrink-0 mt-0.5" />
              <span>{faq.q}</span>
            </h4>
            <p className="mt-2 text-xs text-[#4A564F] leading-relaxed pl-6">{faq.a}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
