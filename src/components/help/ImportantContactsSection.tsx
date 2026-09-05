import { AlertCircle, PawPrint, Phone, Shield, Stethoscope } from 'lucide-react'
import { importantContacts } from '../../data/mockData'
import { Card } from '../ui/Card'
import { IconBox } from '../ui/IconBox'
import type { ImportantContactType } from '../../types'

const CONTACT_ICONS: Record<ImportantContactType, typeof Phone> = {
  emergency: AlertCircle,
  vet: Stethoscope,
  insurance: Shield,
  registry: PawPrint,
  emergency_person: Phone,
}

export function ImportantContactsSection({ hideHeader = false }: { hideHeader?: boolean }) {
  return (
    <Card variant="elevated">
      {!hideHeader && (
        <>
          <h3 className="text-base font-bold text-[#191E1B] mb-1 flex items-center gap-2">
            <Phone size={18} className="text-[#234B54]" />
            <span>Důležité kontakty</span>
          </h3>
          <p className="text-xs text-[#4A564F] mb-4">
            Rychlý přístup k pohotovosti, veterináři, pojišťovně a kontaktům pro nouzové situace.
          </p>
        </>
      )}
      <div className={hideHeader ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2'}>
        {importantContacts.map((contact) => {
          const Icon = CONTACT_ICONS[contact.type]
          return (
            <div
              key={contact.id}
              className="flex items-start gap-3 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] p-3.5"
            >
              <IconBox icon={Icon} size="md" tone="teal" className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#234B54]">
                  {contact.label}
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#191E1B]">{contact.name}</p>
                {contact.note && (
                  <p className="mt-0.5 text-[11px] text-[#7D8B82]">{contact.note}</p>
                )}
                <a
                  href={`tel:${contact.phone.replace(/\s/g, '')}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#234B54] hover:text-[#B8934A] transition-colors"
                >
                  <Phone size={12} />
                  {contact.phone}
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
