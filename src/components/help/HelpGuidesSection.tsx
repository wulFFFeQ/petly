import {
  BookOpen,
  Calendar,
  HelpCircle,
  LifeBuoy,
  Lock,
  Share2,
  Stethoscope,
} from 'lucide-react'
import { useState } from 'react'
import { BRAND_NAME } from '../../lib/brand'
import { cn } from '../../lib/utils'
import { Card } from '../ui/Card'

type HelpTopicId =
  | 'getting_started'
  | 'faq'
  | 'health_records'
  | 'calendar'
  | 'sharing'
  | 'privacy'
  | 'support'

const HELP_TOPICS: {
  id: HelpTopicId
  label: string
  icon: typeof HelpCircle
  items: { q: string; a: string }[]
}[] = [
  {
    id: 'getting_started',
    label: 'Jak aplikaci používat',
    icon: HelpCircle,
    items: [
      {
        q: 'Jak přidám nového mazlíčka?',
        a: 'V sekci Moji mazlíčci klikněte na „Přidat mazlíčka“, vyplňte základní údaje a uložte profil. Poté můžete doplnit fotografie, dokumenty a zdravotní záznamy.',
      },
      {
        q: 'Kde najdu přehled dne?',
        a: 'Na stránce Přehled uvidíte denní péči, blížící se termíny a rychlé akce pro své mazlíčky.',
      },
      {
        q: 'Jak přepínám mezi mazlíčky?',
        a: 'Otevřete Moji mazlíčci a vyberte konkrétní profil. Každý mazlíček má vlastní zdravotní historii, kalendář a dokumenty.',
      },
    ],
  },
  {
    id: 'faq',
    label: 'Časté otázky',
    icon: BookOpen,
    items: [
      {
        q: 'Jak přidám mezinárodní očkovací certifikáty do profilu mazlíčka?',
        a: 'Přejděte do Moji mazlíčci → vyberte mazlíčka → záložka Dokumenty. Můžete nahrát naskenované veterinární PDF nebo fotografie pasu.',
      },
      {
        q: 'Jak se spojím s majiteli mazlíčků v okolí?',
        a: 'V sekci Objevovat filtrujte podle regionu, otevřete profil a použijte „Oslovit a propojit se“. Konverzace se zobrazí ve Zprávách.',
      },
      {
        q: 'Mohu smazat příspěvek nebo komentář v Komunitě?',
        a: 'Ano. U vlastních příspěvků použijte menu se třemi tečkami a „Smazat příspěvek“. U vlastních komentářů je ikona koše.',
      },
    ],
  },
  {
    id: 'health_records',
    label: 'Zdravotní záznamy',
    icon: Stethoscope,
    items: [
      {
        q: 'Jak přidám očkování, lék nebo návštěvu veterináře?',
        a: 'V profilu mazlíčka otevřete Zdraví a medicína a klikněte na „Přidat záznam“. Můžete také otevřít konkrétní kategorii (např. Očkování) a přidat záznam přímo tam.',
      },
      {
        q: 'Kde najdu kompletní historii?',
        a: 'Na stránce Zdraví klepněte na jednu ze 4 karet (Očkování, Léky, Veterinář, Vyšetření). Otevře se historie dané kategorie.',
      },
      {
        q: 'Jak funguje zdravotní stav na Přehledu?',
        a: 'Karta Zdravotní stav otevře orientační dotazník. Výsledek se uloží k mazlíčkovi a můžete jej kdykoli aktualizovat.',
      },
    ],
  },
  {
    id: 'calendar',
    label: 'Kalendář a připomínky',
    icon: Calendar,
    items: [
      {
        q: 'Jak naplánuji událost?',
        a: 'V Kalendáři vytvořte novou událost, vyberte mazlíčka, typ (např. veterinář, lék, chov) a datum. Událost se zobrazí i v přehledu.',
      },
      {
        q: 'Jak zapnu připomínku u léků?',
        a: 'V detailu aktivního léku zapněte připomínku a nastavte čas. Připomínky se propsají do denní péče a oznámení.',
      },
      {
        q: 'Kde upravím typ upozornění?',
        a: 'V Nastavení → Připomínky a upozornění si zapněte nebo vypněte push, SMS, schůzky a další typy notifikací.',
      },
    ],
  },
  {
    id: 'sharing',
    label: 'Sdílení zdravotních údajů',
    icon: Share2,
    items: [
      {
        q: 'Jak exportuji zdravotní záznamy pro veterináře?',
        a: 'V hlavičce profilu mazlíčka použijte Sdílet / Dokumenty a exportujte ověřený zdravotní souhrn.',
      },
      {
        q: 'Mohu veterináři poslat záznamy ve Zprávách?',
        a: 'Ano. V konverzaci s ověřeným veterinářem otevřete sdílení zdravotních údajů a vyberte konkrétní záznamy k odeslání.',
      },
      {
        q: 'Jak omezím, co veterinář vidí?',
        a: 'V Nastavení → Soukromí a přístup k veterinárním datům zapněte nebo vypněte jednotlivé kategorie (očkování, léky, vyšetření…).',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Soukromí a bezpečnost',
    icon: Lock,
    items: [
      {
        q: 'Jsou zdravotní data šifrovaná?',
        a: `${BRAND_NAME} uchovává zdravotní a klinické záznamy v šifrované podobě. Přístup ověřených veterinářů řídíte vy.`,
      },
      {
        q: 'Jak odeberu přístup veterináři?',
        a: 'V Nastavení u konkrétního veterináře klikněte na „Odebrat veškerý přístup“. Změna se projeví okamžitě.',
      },
      {
        q: 'Kdo vidí mé příspěvky v Komunitě?',
        a: 'Příspěvky jsou viditelné v komunitním feedu. Vlastní příspěvky můžete kdykoli smazat.',
      },
    ],
  },
  {
    id: 'support',
    label: 'Kontaktovat podporu',
    icon: LifeBuoy,
    items: [
      {
        q: 'Jak kontaktuji podporu?',
        a: `Napište na support@lovedandknown.cz nebo použijte Concierge službu pro asistenci s péčí o mazlíčka. Odpovídáme obvykle do 1 pracovního dne.`,
      },
      {
        q: 'Co mám uvést v požadavku?',
        a: 'Popište problém, jméno mazlíčka (pokud je relevantní) a co jste už vyzkoušeli. U technických chyb pomůže i screenshot.',
      },
    ],
  },
]

export function HelpGuidesSection() {
  const [activeTopic, setActiveTopic] = useState<HelpTopicId>('getting_started')
  const topic = HELP_TOPICS.find((item) => item.id === activeTopic) ?? HELP_TOPICS[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {HELP_TOPICS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTopic === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTopic(id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                isActive
                  ? 'bg-[#234B54] text-white'
                  : 'bg-[#FAF8F5] text-[#5A6660] border border-[#E8E4DC] hover:border-[#234B54]/30',
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          )
        })}
      </div>

      <div>
        <h3 className="mb-3 text-base font-bold text-[#191E1B] flex items-center gap-2">
          <topic.icon size={18} className="text-[#234B54]" />
          <span>{topic.label}</span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {topic.items.map((faq) => (
            <Card key={faq.q} variant="elevated">
              <h4 className="text-sm font-bold text-[#191E1B] flex items-start gap-2">
                <BookOpen size={15} className="text-[#234B54] shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="mt-2 text-xs text-[#4A564F] leading-relaxed pl-6">{faq.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
