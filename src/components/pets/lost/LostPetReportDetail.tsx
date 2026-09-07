import {
  formatCzechDateTime,
  foundSafetyLabel,
  reportFlagReasonLabel,
  reportTypeLabel,
  sightingActivityLabel,
} from '../../../lib/lostPet'
import type { LostPetReport } from '../../../types'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'

interface LostPetReportDetailProps {
  report: LostPetReport
  highlighted?: boolean
  onFlag?: () => void
  onContactFinder?: () => void
}

export function LostPetReportDetail({
  report,
  highlighted,
  onFlag,
  onContactFinder,
}: LostPetReportDetailProps) {
  return (
    <Card
      variant={highlighted ? 'gold' : 'elevated'}
      padding="md"
      className={highlighted ? 'ring-2 ring-[#B8934A]/40' : undefined}
      id={`lost-report-${report.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge
            variant={report.type === 'found' ? 'gold' : 'primary'}
            size="sm"
          >
            {reportTypeLabel(report.type)}
          </Badge>
          <p className="mt-2 text-sm font-semibold text-[#191E1B]">
            {report.location.privateLabel || report.location.publicLabel}
          </p>
          <p className="text-xs text-[#7D8B82]">
            Veřejně: {report.location.publicLabel} · {formatCzechDateTime(report.observedAt)}
          </p>
        </div>
        {report.ownerFlag && (
          <Badge variant="warning" size="sm">
            Označeno: {reportFlagReasonLabel(report.ownerFlag.reason)}
          </Badge>
        )}
      </div>

      {report.type === 'sighting' && report.activity && (
        <p className="mt-2 text-sm text-[#4A564F]">
          Chování: {sightingActivityLabel(report.activity)}
        </p>
      )}

      {report.type === 'found' && (
        <div className="mt-2 space-y-1 text-sm text-[#4A564F]">
          {report.safetyStatus && <p>Bezpečnost: {foundSafetyLabel(report.safetyStatus)}</p>}
          {report.hasPetWithThem != null && (
            <p>U nálezce: {report.hasPetWithThem ? 'Ano' : 'Ne'}</p>
          )}
          {report.canKeepSafely != null && (
            <p>Může držet: {report.canKeepSafely ? 'Ano' : 'Ne'}</p>
          )}
        </div>
      )}

      {report.note && (
        <p className="mt-2 rounded-xl bg-[#FAF8F5] px-3 py-2 text-sm text-[#4A564F]">
          {report.note}
        </p>
      )}

      {report.photoUrl && (
        <img
          src={report.photoUrl}
          alt=""
          className="mt-3 max-h-48 w-full rounded-xl object-cover"
        />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {report.type === 'found' && onContactFinder && (
          <Button type="button" variant="gold" size="sm" onClick={onContactFinder}>
            Otevřít bezpečný kontakt
          </Button>
        )}
        {onFlag && !report.ownerFlag && (
          <Button type="button" variant="outline" size="sm" onClick={onFlag}>
            Nahlásit nevhodné / falešné
          </Button>
        )}
      </div>
    </Card>
  )
}
