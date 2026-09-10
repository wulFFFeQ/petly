import type { PublicTrustBadge } from '../../types/verification'
import { Modal } from '../ui/Modal'

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const d = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

interface TrustBadgeDetailProps {
  badge: PublicTrustBadge | null
  onClose: () => void
}

export function TrustBadgeDetail({ badge, onClose }: TrustBadgeDetailProps) {
  const verifiedAt = formatDate(badge?.verifiedAt)
  const expiresAt = formatDate(badge?.expiresAt)

  return (
    <Modal
      open={Boolean(badge)}
      onClose={onClose}
      title={badge?.label ?? 'Ověření'}
      subtitle="Detail ověření důvěryhodnosti"
      maxWidth="sm"
    >
      {badge ? (
        <dl className="space-y-3 text-sm text-[#4A564F]">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Co bylo ověřeno
            </dt>
            <dd className="mt-0.5 font-medium text-[#191E1B]">{badge.label}</dd>
          </div>
          {verifiedAt ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Datum ověření
              </dt>
              <dd className="mt-0.5 font-medium text-[#191E1B]">{verifiedAt}</dd>
            </div>
          ) : null}
          {badge.sourceSummary ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Zdroj ověření
              </dt>
              <dd className="mt-0.5 font-medium text-[#191E1B]">{badge.sourceSummary}</dd>
            </div>
          ) : null}
          {expiresAt ? (
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Platnost do
              </dt>
              <dd className="mt-0.5 font-medium text-[#191E1B]">{expiresAt}</dd>
            </div>
          ) : null}
          <p className="text-[11px] leading-relaxed text-[#7D8B82] pt-1 border-t border-[#E8E4DC]">
            Citlivé údaje ověření (dokumenty, čísla, interní metadata) se ve veřejném profilu
            nezobrazují.
          </p>
        </dl>
      ) : null}
    </Modal>
  )
}
