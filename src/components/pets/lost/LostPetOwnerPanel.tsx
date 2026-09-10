import { Copy, ExternalLink, Map as MapIcon, MessageCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../../../context/AppContext'
import { copyTextToClipboard } from '../../../lib/clipboard'
import {
  buildLostAnnouncementUrl,
  findActiveAnnouncementForPet,
  findLatestAnnouncementForPet,
  formatCzechDateTime,
  reportTypeLabel,
} from '../../../lib/lostPet'
import type { LostPetAnnouncement, LostPetReport, Pet } from '../../../types'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { FlagReportModal } from './FlagReportModal'
import { LostPetReportDetail } from './LostPetReportDetail'
import { LostPetStatusBadge } from './LostPetStatusBadge'

interface LostPetOwnerPanelProps {
  pet: Pet
}

export function LostPetOwnerPanel({ pet }: LostPetOwnerPanelProps) {
  const {
    lostAnnouncements,
    lostReports,
    showToast,
    lostConversations,
    safeContactChannels,
  } = useApp()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightReportId = searchParams.get('lostReport')

  const announcement =
    findActiveAnnouncementForPet(lostAnnouncements, pet.id) ||
    findLatestAnnouncementForPet(lostAnnouncements, pet.id)

  const reports = useMemo(
    () =>
      announcement
        ? [...lostReports]
            .filter((item) => item.announcementId === announcement.id)
            .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
        : [],
    [announcement, lostReports],
  )

  const sightings = useMemo(
    () => [...reports].filter((r) => r.type === 'sighting').reverse(),
    [reports],
  )
  const foundReports = useMemo(
    () => [...reports].filter((r) => r.type === 'found').reverse(),
    [reports],
  )
  const latestSighting = sightings[0]
  const latestFound = foundReports[0]

  const activeChannels = useMemo(
    () =>
      announcement
        ? safeContactChannels.filter(
            (c) => c.announcementId === announcement.id && c.status === 'active',
          )
        : [],
    [announcement, safeContactChannels],
  )

  const [flagReportId, setFlagReportId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(true)

  useEffect(() => {
    if (!highlightReportId) return
    const el = document.getElementById(`lost-report-${highlightReportId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightReportId, reports.length])

  useEffect(() => {
    if (window.location.hash !== '#lost-panel') return
    document.getElementById('lost-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [announcement?.id])

  if (!announcement) return null

  const isActive = announcement.status === 'lost'
  const isResolved = announcement.status === 'found' || announcement.status === 'closed'

  return (
    <div id="lost-panel" className="scroll-mt-24 space-y-4">
      <Card
        variant="elevated"
        padding="md"
        className={
          isActive
            ? 'border-rose-200/80 bg-gradient-to-br from-rose-50/80 to-white'
            : announcement.status === 'found'
              ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white'
              : undefined
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <LostPetStatusBadge status={announcement.status} size="md" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
                Ztracený mazlíček
              </span>
            </div>

            {isActive && (
              <>
                <p className="mt-2 text-lg font-bold text-rose-900">
                  Aktivní pátrání · {pet.name}
                </p>
                <p className="mt-1 text-sm text-[#4A564F]">
                  Poslední známá lokalita: {announcement.lastSeen.publicLabel} ·{' '}
                  {formatCzechDateTime(announcement.lastSeen.seenAt)}
                </p>
              </>
            )}

            {announcement.status === 'found' && (
              <>
                <p className="mt-2 text-lg font-bold text-emerald-800">
                  {pet.name} je doma.
                </p>
                <p className="text-sm text-[#4A564F]">
                  Ztracený mazlíček – pátrání ukončeno. Historie hlášení zůstává zachovaná.
                </p>
              </>
            )}

            {announcement.status === 'closed' && (
              <p className="mt-2 text-sm text-[#4A564F]">
                Ztracený mazlíček – pátrání ukončeno. Oznámení je deaktivované.
              </p>
            )}
          </div>

          {isActive && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  const url = buildLostAnnouncementUrl(announcement.publicToken)
                  const ok = await copyTextToClipboard(url)
                  showToast(
                    ok ? 'Odkaz zkopírován' : 'Odkaz',
                    ok ? 'Sdílejte veřejné oznámení.' : url,
                    'gold',
                  )
                }}
              >
                <Copy size={14} />
                Kopírovat odkaz
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  window.open(buildLostAnnouncementUrl(announcement.publicToken), '_blank')
                }
              >
                <ExternalLink size={14} />
                Veřejné oznámení
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E8E4DC] bg-white/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Hlášení celkem
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#191E1B]">{reports.length}</p>
            <p className="text-[11px] text-[#7D8B82]">
              {sightings.length} spatření · {foundReports.length} nálezů
            </p>
          </div>
          <div className="rounded-xl border border-[#E8E4DC] bg-white/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Poslední spatření
            </p>
            {latestSighting ? (
              <>
                <p className="mt-0.5 text-sm font-semibold text-[#191E1B]">
                  {latestSighting.location.publicLabel}
                </p>
                <p className="text-[11px] text-[#7D8B82]">
                  {formatCzechDateTime(latestSighting.observedAt)}
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-[#7D8B82]">Zatím žádné</p>
            )}
          </div>
          <div className="rounded-xl border border-[#E8E4DC] bg-white/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D8B82]">
              Poslední nález
            </p>
            {latestFound ? (
              <>
                <p className="mt-0.5 text-sm font-semibold text-[#191E1B]">
                  {latestFound.location.publicLabel}
                </p>
                <p className="text-[11px] text-[#7D8B82]">
                  {formatCzechDateTime(latestFound.observedAt)}
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-sm text-[#7D8B82]">Zatím žádný</p>
            )}
          </div>
        </div>

        {activeChannels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChannels.map((channel) => (
              <Button
                key={channel.id}
                type="button"
                variant="gold"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate(`/messages?conversationId=${channel.conversationId}`)}
              >
                <MessageCircle size={14} />
                Aktivní bezpečný chat
              </Button>
            ))}
          </div>
        )}
      </Card>

      {!isResolved || reports.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#191E1B]">
              Hlášení ({reports.length})
            </h3>
            {reports.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setMapOpen((v) => !v)}
              >
                <MapIcon size={14} />
                {mapOpen ? 'Skrýt mapu' : 'Mapa hlášení'}
              </Button>
            )}
          </div>

          {mapOpen && reports.length > 0 && (
            <ReportsMap announcement={announcement} reports={reports} />
          )}

          {reports.length === 0 ? (
            <Card variant="subtle" padding="md">
              <p className="text-sm text-[#7D8B82]">
                Zatím žádná hlášení. Sdílejte veřejný odkaz, aby vám lidé mohli pomoci.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {[...reports].reverse().map((report) => (
                <LostPetReportDetail
                  key={report.id}
                  report={report}
                  highlighted={report.id === highlightReportId}
                  onFlag={isActive ? () => setFlagReportId(report.id) : undefined}
                  onContactFinder={
                    report.type === 'found' &&
                    lostConversations.some((c) => c.lostReportId === report.id)
                      ? () => {
                          const conv = lostConversations.find(
                            (c) => c.lostReportId === report.id,
                          )
                          if (conv) {
                            navigate(`/messages?conversationId=${conv.id}`)
                          }
                          if (highlightReportId) {
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev)
                              next.delete('lostReport')
                              return next
                            })
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {flagReportId && (
        <FlagReportModal
          open={!!flagReportId}
          onClose={() => setFlagReportId(null)}
          reportId={flagReportId}
        />
      )}
    </div>
  )
}

function ReportsMap({
  announcement,
  reports,
}: {
  announcement: LostPetAnnouncement
  reports: LostPetReport[]
}) {
  const points = useMemo(() => {
    const list: Array<{ lat: number; lng: number; label: string; type: string }> = [
      {
        lat: announcement.lastSeen.lat,
        lng: announcement.lastSeen.lng,
        label: 'Naposledy viděn (majitel)',
        type: 'origin',
      },
      ...reports.map((r) => ({
        lat: r.location.lat,
        lng: r.location.lng,
        label: `${reportTypeLabel(r.type)} · ${formatCzechDateTime(r.observedAt)}`,
        type: r.type,
      })),
    ]
    return list
  }, [announcement, reports])

  const path = useMemo(
    () =>
      [...reports]
        .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
        .map((r) => [r.location.lat, r.location.lng] as [number, number]),
    [reports],
  )

  const center: [number, number] = points[0]
    ? [points[0].lat, points[0].lng]
    : [50.028, 15.201]

  return (
    <Card variant="elevated" padding="none" className="overflow-hidden">
      <div className="h-56 w-full sm:h-72">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {path.length >= 2 && (
            <Polyline
              positions={path}
              pathOptions={{ color: '#B8934A', weight: 3, dashArray: '6 8', opacity: 0.85 }}
            />
          )}
          {points.map((point, index) => (
            <Marker key={`${point.lat}-${point.lng}-${index}`} position={[point.lat, point.lng]}>
              <Popup>{point.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="border-t border-[#E8E4DC] bg-[#FAF8F5] px-3 py-2 text-[11px] leading-relaxed text-[#7D8B82]">
        Chronologická linie spojuje hlášení uživatelů — není to garantovaná poloha mazlíčka, pouze
        možné stopy pohybu podle nahlášených spatření. Mapa je jen pro majitele.
      </p>
    </Card>
  )
}
