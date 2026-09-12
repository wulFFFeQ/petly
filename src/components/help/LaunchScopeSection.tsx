import { Ban, CheckCircle2, Clock3, Info } from 'lucide-react'
import { BRAND_NAME } from '../../lib/brand'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const CAN_DO = [
  'Mazlíčci, fotky, péče a kalendář',
  'Objevovat / veřejné prohlížení',
  'Spotřebitelské zdraví (DEMO — ne oficiální zdravotní dokumentace)',
  'Rezervace u profesionála',
  'Zprávy a sdílení zdravotního výřezu',
  'Lost & Found a nouzová karta',
  'Katalog profesionálů (včetně typu klinika / útulek jako označení profilu)',
  'Jediná inzerční cesta: měsíční Pro listing (živé stržení až se Stripe)',
  'DEMO checkout rezervace (neúčtuje, neoznačí „zaplaceno“)',
  'DEMO přepínač členství (není reálná platba; ≠ Pro listing)',
] as const

const CANNOT_DO = [
  {
    title: 'Kliniky',
    detail:
      'Ne týmový provoz, recepce, check-in ani klinický EMR. Rezervace ≠ klinická návštěva.',
  },
  {
    title: 'Útulky',
    detail: 'Ne provozní workflow (příjem, kapacita, custody, instituční aktér).',
  },
  {
    title: 'Platby mezi lidmi',
    detail:
      'Ne převody majitel↔majitel. Jen DEMO platba rezervace majitel→pro, bez živého stržení.',
  },
  {
    title: 'Lifetime a jiné inzerční SKU',
    detail:
      'Na startu jen měsíční Pro listing. Lifetime nákup a boost balíčky až později.',
  },
] as const

export function LaunchScopeSection() {
  return (
    <section className="space-y-4" aria-labelledby="launch-scope-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="launch-scope-heading" className="text-base font-bold text-[#191E1B]">
          Co umíme na startu / co ne
        </h2>
        <Badge variant="default">DEMO</Badge>
      </div>

      <Card variant="subtle" padding="md">
        <p className="text-sm text-[#4A564F] leading-relaxed flex gap-2">
          <Info size={16} className="text-[#234B54] shrink-0 mt-0.5" />
          <span>
            {BRAND_NAME} je pro <strong className="font-semibold text-[#191E1B]">majitele mazlíčků</strong> a{' '}
            <strong className="font-semibold text-[#191E1B]">solo profesionály</strong> (katalog, služby,
            rezervace). Ne instituční provoz klinik/útulků. Ne živé platby mezi lidmi.
          </span>
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card variant="elevated" padding="md">
          <h3 className="text-sm font-bold text-[#191E1B] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#234B54]" />
            Co umíme
          </h3>
          <ul className="mt-3 space-y-2">
            {CAN_DO.map((item) => (
              <li key={item} className="text-xs text-[#4A564F] leading-relaxed pl-4 relative">
                <span className="absolute left-0 top-1.5 h-1 w-1 rounded-full bg-[#234B54]" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card variant="elevated" padding="md">
          <h3 className="text-sm font-bold text-[#191E1B] flex items-center gap-2">
            <Ban size={16} className="text-[#8B3A3A]" />
            Co záměrně neumíme
          </h3>
          <ul className="mt-3 space-y-3">
            {CANNOT_DO.map((item) => (
              <li key={item.title}>
                <p className="text-sm font-semibold text-[#191E1B]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[#4A564F] leading-relaxed">{item.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card variant="subtle" padding="sm">
        <p className="text-xs text-[#5A6660] leading-relaxed flex gap-2">
          <Clock3 size={14} className="text-[#234B54] shrink-0 mt-0.5" />
          <span>
            Později: živé Stripe / membership, lifetime Pro listing, push a e-mail, EMR klinik a provoz
            útulků. Dnešní build je DEMO v prohlížeči — reálná multi-user data až po autentizaci, API a
            databázi.
          </span>
        </p>
      </Card>
    </section>
  )
}
