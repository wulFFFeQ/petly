import {
  PhoneCall,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'

export function HelpPage() {
  const { showToast } = useApp()

  const handleConcierge = () => {
    showToast('Concierge služba PETLY', 'Připojujeme vás k nonstop specialistovi na péči o mazlíčky...', 'gold')
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="gold" size="sm">
            <Sparkles size={11} className="mr-0.5 text-[#B8934A]" />
            Podpora péče
          </Badge>
          <span className="text-xs text-[#7D8B82] font-medium">Znalostní báze a concierge</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#191E1B]">
          Nápověda a concierge péče o mazlíčky
        </h1>
        <p className="mt-1 text-sm text-[#4A564F]">
          Návody k veterinárním záznamům, EU pasům pro mazlíčky, stravovacím deníkům a nonstop podpoře.
        </p>
      </div>

      {/* Concierge Highlight Card */}
      <Card variant="gold" padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Badge variant="gold" size="sm" className="mb-2">
              Osobní poradenství
            </Badge>
            <h3 className="text-lg font-bold text-[#191E1B]">
              Nonstop veterinární a concierge péče
            </h3>
            <p className="text-xs text-[#4A564F] max-w-xl mt-1 leading-relaxed">
              Potřebujete okamžitou veterinární pomoc, radu ohledně toxických potravin nebo pomoc s přenosem záznamů při cestování? Náš veterinární concierge je k dispozici kdykoli.
            </p>
          </div>
          <Button
            variant="gold"
            size="md"
            onClick={handleConcierge}
            className="shrink-0 gap-1.5 font-bold"
          >
            <PhoneCall size={16} />
            <span>Spojit s concierge</span>
          </Button>
        </div>
      </Card>

      {/* FAQ Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            q: 'Jak přidám mezinárodní očkovací certifikáty do profilu mazlíčka?',
            a: 'Přejděte do Moji mazlíčci > vyberte mazlíčka > záložka Dokumenty. Můžete nahrát naskenované veterinární PDF certifikáty nebo fotografie fyzického pasu.',
          },
          {
            q: 'Jak funguje automatický odpočet do dalšího očkování?',
            a: 'Když zaznamenáte posilovací dávku s budoucím termínem, PETLY vypočítá zbývající dny a automaticky naplánuje připomínku do kalendáře.',
          },
          {
            q: 'Mohu exportovat zdravotní záznamy pro nového veterináře?',
            a: 'Ano, v hlavičce profilu mazlíčka klikněte na tlačítko „Sdílet“ nebo „Dokumenty“ a exportujte kompletní ověřený zdravotní souhrn.',
          },
          {
            q: 'Jak se spojím s majiteli mazlíčků v okolí v sekci Objevovat?',
            a: 'Procházejte záložku Objevovat s filtrem podle vašeho regionu, klikněte na „Pozdravit a spojit se“ a začněte konverzaci v sekci Zprávy.',
          },
        ].map((faq, i) => (
          <Card key={i} variant="elevated">
            <h4 className="text-sm font-bold text-[#191E1B] flex items-start gap-2">
              <BookOpen size={16} className="text-[#2C4A3E] shrink-0 mt-0.5" />
              <span>{faq.q}</span>
            </h4>
            <p className="mt-2 text-xs text-[#4A564F] leading-relaxed pl-6">
              {faq.a}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
