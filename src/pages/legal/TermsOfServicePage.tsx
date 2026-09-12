import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { BRAND_NAME } from '../../lib/brand'

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
          Provozovatel: <strong className="text-[#191E1B]">[TODO: právní název]</strong>, IČO{' '}
          <strong className="text-[#191E1B]">[TODO]</strong>. Kontakt:{' '}
          <strong className="text-[#191E1B]">[TODO: e-mail]</strong>. Checklist:{' '}
          <span className="text-[#4A564F]">docs/LAUNCH-04-OPS-LEGAL.md</span>.
        </p>
      </Card>

      <Card variant="elevated" padding="md" className="space-y-4 text-sm text-[#4A564F] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">1. Služba</h2>
          <p>
            {BRAND_NAME} pomáhá majitelům mazlíčků a solo profesionálům se správou péče, katalogem služeb a
            rezervacemi. Nejde o oficiální zdravotnickou dokumentaci ani o provozní systém klinik či
            útulků.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">2. Účet a DEMO</h2>
          <p>
            V DEMO režimu nejsou data multi-user produkční autoritou. Po nasazení backendu platí
            autentizace a serverová pravidla přístupu. Zneužití účtu nebo falšování klinických údajů je
            zakázáno.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">3. Rezervace a platby</h2>
          <p>
            Rezervace u profesionála je smluvní vztah mezi vámi a profesionálem; platforma zprostředkuje
            workflow. Živé stržení peněz a výplaty (Stripe) nejsou na startu. Platby mezi lidmi (P2P) produkt
            neposkytuje. Jediná plánovaná placená inzerce na startu je měsíční Pro listing v katalogu;
            lifetime Pro listing až později. Consumer členství (Premium apod.) je oddělené a v DEMO
            neúčtuje.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">4. Profesionálové</h2>
          <p>
            Typ profilu „klinika“ nebo „útulek“ je označení v katalogu, ne plný instituční provoz. Označení
            „ověřeno“ bez reálné verifikace nemá právní váhu.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">5. Odpovědnost</h2>
          <p>
            Služba se poskytuje „jak je“ v rozsahu dostupném v daném prostředí (DEMO vs produkce). Za
            veterinární rozhodnutí a péči odpovídá uživatel / odborník, ne aplikace jako náhrada veterináře.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-[#191E1B]">6. Změny</h2>
          <p>
            Podmínky můžeme aktualizovat; podstatné změny oznámíme v aplikaci. Pokračováním v užívání po
            zveřejnění ostré verze vyjadřujete souhlas (po právní finalizaci tohoto návrhu).
          </p>
        </section>
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
