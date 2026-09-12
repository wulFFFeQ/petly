import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { BRAND_NAME } from '../../lib/brand'

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Správce',
    body: 'Správce: [TODO: právní název], IČO [TODO], sídlo [TODO]. Kontakt GDPR: [TODO: e-mail]. DPO: [TODO: nebo „nejmenován“].',
  },
  {
    title: '2. Účely zpracování',
    body: 'Účet, profily mazlíčků, péče a kalendář, spotřebitelské zdraví a dokumenty, rezervace, zprávy, Lost & Found / nouzová karta, měsíční Pro listing, později platby přes Stripe, provoz a bezpečnost. Právní základy (GDPR čl. 6) doplní counsel — viz docs/legal/PRIVACY-POLICY-CZ.md.',
  },
  {
    title: '3. Jaké údaje',
    body: 'Identifikace účtu, údaje o mazlíčcích, spotřebitelské zdravotní záznamy a soubory (ne oficiální dokumentace kliniky), komunikace, veřejné projekce dle soukromí, technická data relace, profesionální profil v katalogu.',
  },
  {
    title: '4. DEMO vs produkce',
    body: `V DEMO režimu ${BRAND_NAME} ukládá většinu dat lokálně v prohlížeči (localStorage / IndexedDB). Produkční plán: server, PostgreSQL, privátní úložiště dokumentů, session cookies (Railway).`,
  },
  {
    title: '5. Příjemci',
    body: 'Hosting (Railway), úložiště dokumentů, později Stripe. Profesionálové a domácnost jen po explicitním grantu. Ne EMR klinik/útulků. Ne P2P převody mezi lidmi.',
  },
  {
    title: '6. Předání mimo EHP',
    body: '[TODO: ano/ne a právní mechanismus — doplní counsel po výběru sub-processorů.]',
  },
  {
    title: '7. Doba uložení',
    body: '[TODO: retence per kategorie.] DEMO data závisí na prohlížeči do migrace na server.',
  },
  {
    title: '8. Cookies',
    body: 'Po produkčním backendu: nezbytné session cookies. Marketing cookies a cookie banner nejsou součástí tohoto návrhu.',
  },
  {
    title: '9. Vaše práva',
    body: 'Přístup, oprava, výmaz, omezení, námitka, přenositelnost, odvolání souhlasu (kde platí). Žádosti: [TODO: e-mail]. Stížnost: ÚOOÚ (uoou.cz). Export/erase enginy před ostrým multi-user provozem.',
  },
  {
    title: '10. Děti',
    body: 'Služba není určena dětem mladším [TODO: věková hranice] bez souhlasu zákonného zástupce dle platné úpravy.',
  },
  {
    title: '11. Změny',
    body: 'Aktualizace zveřejníme na této stránce. Podstatné změny oznámíme vhodným způsobem před účinností ostré verze.',
  },
]

export function PrivacyPolicyPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        badge="Právní"
        meta={
          <Badge variant="warning" size="sm">
            NÁVRH
          </Badge>
        }
        title="Zásady ochrany osobních údajů"
        description={`Návrh pro ${BRAND_NAME}. Není právní rada — ostrý text až po doplnění firmy a schválení právníkem.`}
      />

      <Card variant="subtle" padding="sm">
        <p className="text-xs text-[#5A6660] leading-relaxed">
          Plná šablona pro counsel:{' '}
          <span className="text-[#4A564F]">docs/legal/PRIVACY-POLICY-CZ.md</span>
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
        <Link to="/terms" className="text-[#B8934A] underline-offset-2 hover:underline">
          Obchodní podmínky
        </Link>
        {' · '}
        <Link to="/help" className="text-[#B8934A] underline-offset-2 hover:underline">
          Nápověda
        </Link>
      </p>
    </div>
  )
}
