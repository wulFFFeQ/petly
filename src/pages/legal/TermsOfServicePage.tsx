import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { BRAND_NAME } from '../../lib/brand'

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Provozovatel',
    body: 'Provozovatel: [TODO: právní název], IČO [TODO], sídlo [TODO]. Kontakt: [TODO: e-mail].',
  },
  {
    title: '2. Služba a výluky',
    body: `${BRAND_NAME} pomáhá majitelům mazlíčků a solo profesionálům s péčí, katalogem a rezervacemi. Není oficiální zdravotnická dokumentace, EMR klinik, provoz útulků, veterinární rada ani P2P platební služba. Typ „klinika“/„útulek“ v katalogu je jen označení profilu.`,
  },
  {
    title: '3. Účet a DEMO',
    body: 'Uživatel odpovídá za pravdivost údajů a ochranu přístupu. V DEMO režimu nejsou data multi-user produkční autoritou. Po backendu platí autentizace a serverová pravidla. Zakázáno falšování údajů a obcházení přístupů.',
  },
  {
    title: '4. Rezervace',
    body: 'Rezervace zakládá vztah mezi vámi a profesionálem; platforma zprostředkuje workflow. Odborné plnění (vyšetření, grooming atd.) zajišťuje profesionál, nikoli provozovatel jako náhrada veterináře.',
  },
  {
    title: '5. Platby a inzerce',
    body: 'Živé Stripe stržení není na startu; DEMO checkout neúčtuje. P2P ne. Jediná plánovaná placená inzerce: měsíční Pro listing. Lifetime Pro listing později. Consumer členství (Premium…) je oddělené a v DEMO neúčtuje.',
  },
  {
    title: '6. Obsah uživatele',
    body: 'K obsahu, který vložíte, si ponecháváte práva; provozovateli poskytujete licenci nutnou k hostování a zobrazení ve službě ([TODO: šíře licence — counsel]). Prohlašujete, že máte právo obsah nahrát.',
  },
  {
    title: '7. Zakázané jednání',
    body: 'Nelegální obsah, obtěžování, zneužití katalogu, neoprávněný přístup, vydávání se za jinou osobu, používání služby jako oficiálního EMR bez oprávnění.',
  },
  {
    title: '8. Odpovědnost',
    body: 'Služba „jak je“ (DEMO vs produkce). Za péči o zvíře odpovídá uživatel / odborník. Limity náhrady škody: [TODO — counsel dle B2C/B2B].',
  },
  {
    title: '9. Ukončení',
    body: 'Účet lze ukončit; podrobnosti výpovědi a retence po zrušení doplní counsel a Privacy Policy. [TODO: lhůty.]',
  },
  {
    title: '10. Rozhodné právo',
    body: 'Právo České republiky. Spory: soudy ČR; spotřebitelská práva dle platných předpisů. [TODO: ADR / ČOI.]',
  },
  {
    title: '11. Změny',
    body: 'Podmínky můžeme aktualizovat; podstatné změny oznámíme v aplikaci. Ostrá verze platí až po právní a doplnění firmy.',
  },
]

export function TermsOfServicePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        badge="Právní"
        meta={
          <Badge variant="warning" size="sm">
            NÁVRH
          </Badge>
        }
        title="Obchodní podmínky"
        description={`Návrh pro ${BRAND_NAME}. Není právní rada — ostrý text až po doplnění firmy a schválení právníkem.`}
      />

      <Card variant="subtle" padding="sm">
        <p className="text-xs text-[#5A6660] leading-relaxed">
          Plná šablona pro counsel:{' '}
          <span className="text-[#4A564F]">docs/legal/TERMS-OF-SERVICE-CZ.md</span>
          {' · '}
          brief: <span className="text-[#4A564F]">docs/legal/LAWYER-BRIEF-CZ.md</span>. Checklist firmy:{' '}
          <span className="text-[#4A564F]">docs/LAUNCH-04-OPS-LEGAL.md</span>.
        </p>
      </Card>

      <Card variant="elevated" padding="md" className="space-y-4 text-sm text-[#4A564F] leading-relaxed">
        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-sm font-bold text-[#191E1B]">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </Card>

      <p className="text-xs text-[#7D8B82]">
        Související:{' '}
        <Link to="/privacy" className="text-[#B8934A] underline-offset-2 hover:underline">
          Ochrana osobních údajů
        </Link>
        {' · '}
        <Link to="/help" className="text-[#B8934A] underline-offset-2 hover:underline">
          Nápověda
        </Link>
      </p>
    </div>
  )
}
