import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { BRAND_NAME } from '../../lib/brand'

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
          Správce: <strong className="text-[#191E1B]">[TODO: právní název]</strong>, IČO{' '}
          <strong className="text-[#191E1B]">[TODO]</strong>, adresa{' '}
          <strong className="text-[#191E1B]">[TODO]</strong>. Kontakt GDPR:{' '}
          <strong className="text-[#191E1B]">[TODO: e-mail]</strong>. Checklist:{' '}
          <span className="text-[#4A564F]">docs/LAUNCH-04-OPS-LEGAL.md</span>.
        </p>
      </Card>

      <Card variant="elevated" padding="md" className="space-y-4 text-sm text-[#4A564F] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">1. Účel zpracování</h2>
          <p>
            Účet majitele, profily mazlíčků, péče a kalendář, rezervace u profesionálů, zprávy, Lost &amp;
            Found / nouzová karta, a (po zapnutí) platby přes platebního poskytovatele.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">2. Jaké údaje</h2>
          <p>
            Identifikační a kontaktní údaje účtu, údaje o mazlíčcích, spotřebitelské zdravotní záznamy a
            dokumenty (pokud je nahrajete), technická data relace. V součém DEMO režimu zůstávají data
            převážně v prohlížeči (localStorage / IndexedDB).
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">3. Cookies a podobné technologie</h2>
          <p>
            Po nasazení produkčního backendu budou nezbytné cookies pro přihlášení (HTTP-only session).
            Samostatný cookie banner a marketing cookies nejsou součástí tohoto návrhu.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">4. Příjemci</h2>
          <p>
            Hosting (plán: Railway), úložiště dokumentů, a později Stripe pro platby. Profesionálové vidí
            jen to, co jim explicitně zpřístupníte. Kliniky a útulky jako instituční provoz nejsou na
            startu v rozsahu produktu.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">5. Vaše práva</h2>
          <p>
            Přístup, oprava, výmaz, omezení, námitka, přenositelnost — dle GDPR. Technické export/erase
            enginy budou doplněny před ostrým multi-user provozem. Stížnost: ÚOOÚ.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">6. Platby</h2>
          <p>
            Živé platby a platby mezi lidmi (P2P) nejsou na startu. DEMO checkout neúčtuje. Při zapnutí
            Stripe budou platební údaje zpracovávány Stripe dle jejich podmínek.
          </p>
        </section>
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
